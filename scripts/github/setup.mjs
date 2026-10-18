#!/usr/bin/env node
/**
 * Configura el repositorio de GitHub de Medios AeA. Idempotente: lo que ya existe se
 * actualiza o se salta, así que se puede ejecutar varias veces.
 *
 *   node scripts/github/setup.mjs --dry-run           # muestra lo que haría, sin cambiar nada
 *   node scripts/github/setup.mjs                     # todo
 *   node scripts/github/setup.mjs --only labels,issues
 *
 * Pasos: labels, milestones, issues, repo, protection, project.
 * Requisitos: `gh auth login` con los scopes repo y project
 *   (gh auth refresh -s project). Ver docs/04-plan-scrum.md §2.1.
 *
 * `protection` exige checks que crean los PR de CI y seguridad (ci.yml, security.yml,
 * codeql.yml): ejecutarlo después de mergearlos, o el merge quedaría bloqueado
 * esperando checks que no existen.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyArg = args.find((a) => a.startsWith('--only'));
const only = onlyArg
  ? (onlyArg.split('=')[1] ?? args[args.indexOf(onlyArg) + 1] ?? '').split(',')
  : null;
const step = (name) => !only || only.includes(name);

const config = JSON.parse(readFileSync(new URL('./backlog.json', import.meta.url), 'utf8'));
const repo = config.repository;
const [owner] = repo.split('/');

/** Ejecuta gh. Las operaciones que cambian algo no se ejecutan en --dry-run. */
function gh(ghArgs, { mutating = false, input } = {}) {
  if (dryRun && mutating) {
    console.log(
      `  [dry-run] gh ${ghArgs.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}`,
    );
    return '';
  }
  try {
    return execFileSync('gh', ghArgs, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (error) {
    if (dryRun) return ''; // sin sesión en gh: en simulación se asume que no existe nada
    throw new Error(`gh ${ghArgs.join(' ')} falló:\n${error.stderr || error.message}`);
  }
}
const ghJson = (ghArgs) => {
  const out = gh(ghArgs);
  return out ? JSON.parse(out) : null;
};
const api = (method, path, body) => {
  // En simulación también se muestra qué se enviaría, para poder revisarlo.
  if (dryRun && body) console.log(`            cuerpo: ${JSON.stringify(body)}`);
  return gh(['api', '-X', method, path, '--input', '-'], {
    mutating: true,
    input: JSON.stringify(body ?? {}),
  });
};

function header(text) {
  console.log(`\n▸ ${text}`);
}

if (!dryRun) {
  try {
    execFileSync('gh', ['auth', 'status'], { stdio: 'ignore' });
  } catch {
    console.error('No hay sesión en gh. Ejecuta: gh auth login  (y gh auth refresh -s project)');
    process.exit(1);
  }
}
console.log(`Repositorio: ${repo}${dryRun ? '  (simulación: no se cambia nada)' : ''}`);

// ---------- Etiquetas ----------
if (step('labels')) {
  header('Etiquetas');
  for (const label of config.labels) {
    gh(
      [
        'label',
        'create',
        label.name,
        '--repo',
        repo,
        '--color',
        label.color,
        '--description',
        label.description,
        '--force',
      ],
      {
        mutating: true,
      },
    );
    if (!dryRun) console.log(`  ✓ ${label.name}`);
  }
}

// ---------- Milestones (un sprint cada uno) ----------
const milestoneNumbers = new Map();
if (step('milestones') || step('issues')) {
  const existing = ghJson(['api', `repos/${repo}/milestones?state=all&per_page=100`]) ?? [];
  for (const m of existing) milestoneNumbers.set(m.title, m.number);
}
if (step('milestones')) {
  header('Milestones');
  for (const m of config.milestones) {
    // Vence al final del día en Managua (UTC-6).
    const dueOn = new Date(`${m.due_on}T23:59:59-06:00`).toISOString().replace('.000', '');
    if (milestoneNumbers.has(m.title)) {
      api('PATCH', `repos/${repo}/milestones/${milestoneNumbers.get(m.title)}`, {
        due_on: dueOn,
        description: m.description,
      });
      if (!dryRun) console.log(`  = ${m.title} (actualizado)`);
    } else {
      const created = api('POST', `repos/${repo}/milestones`, {
        title: m.title,
        due_on: dueOn,
        description: m.description,
      });
      if (created) milestoneNumbers.set(m.title, JSON.parse(created).number);
      if (!dryRun) console.log(`  ✓ ${m.title}`);
    }
  }
}

// ---------- Issues del backlog ----------
const issueUrls = [];
if (step('issues')) {
  header('Issues');
  const existing =
    ghJson([
      'issue',
      'list',
      '--repo',
      repo,
      '--state',
      'all',
      '--limit',
      '500',
      '--json',
      'number,title,url',
    ]) ?? [];
  for (const issue of config.issues) {
    // Una historia se reconoce por su prefijo (HU-11:), una tarea por su título completo.
    const match = existing.find((e) =>
      issue.key.startsWith('HU-') ? e.title.startsWith(`${issue.key}:`) : e.title === issue.title,
    );
    if (match) {
      console.log(`  = #${match.number} ${issue.title.slice(0, 70)} (ya existe)`);
      issueUrls.push(match.url);
      continue;
    }
    const url = gh(
      [
        'issue',
        'create',
        '--repo',
        repo,
        '--title',
        issue.title,
        '--body-file',
        '-',
        '--label',
        issue.labels.join(','),
        '--milestone',
        issue.milestone,
      ],
      { mutating: true, input: issue.body },
    ).trim();
    if (url) issueUrls.push(url);
    if (!dryRun) console.log(`  ✓ ${url}  ${issue.key}`);
  }
}

// ---------- Ajustes del repositorio ----------
if (step('repo')) {
  header('Ajustes del repositorio');
  // Squash para los PR de historias (develop exige historial lineal); merge commit se
  // mantiene para develop → main, porque release-please necesita los commits del sprint.
  api('PATCH', `repos/${repo}`, {
    allow_squash_merge: true,
    allow_merge_commit: true,
    allow_rebase_merge: false,
    allow_auto_merge: true,
    delete_branch_on_merge: true,
    squash_merge_commit_title: 'PR_TITLE',
    squash_merge_commit_message: 'PR_BODY',
    security_and_analysis: {
      secret_scanning: { status: 'enabled' },
      secret_scanning_push_protection: { status: 'enabled' },
    },
  });
  api('PUT', `repos/${repo}/vulnerability-alerts`); // alertas de Dependabot
  api('PUT', `repos/${repo}/private-vulnerability-reporting`); // reporte privado (SECURITY.md)
  if (!dryRun) console.log('  ✓ merge, escaneo de secretos, alertas y reporte privado');
}

// ---------- Protección de ramas ----------
if (step('protection')) {
  header('Protección de develop y main');
  // Nombres de los jobs tal como los muestra GitHub (campo name: de cada workflow).
  const checks = [
    'Calidad (formato · commits · título del PR)',
    'API (lint · typecheck · pruebas + cobertura · build)',
    'Web (lint · typecheck · pruebas + cobertura · build)',
    'Móvil (lint · typecheck · pruebas)',
    'Imágenes Docker (build)',
    'Secretos (gitleaks)',
    'Dependencias (pnpm audit)',
    'Configuración (Trivy)',
    'Analizar (javascript-typescript)',
  ];
  for (const [branch, linear] of [
    ['develop', true],
    ['main', false],
  ]) {
    api('PUT', `repos/${repo}/branches/${branch}/protection`, {
      required_status_checks: { strict: true, contexts: checks },
      enforce_admins: false,
      // 0 aprobaciones mientras haya una sola persona desarrollando: el PR sigue siendo
      // obligatorio y CODEOWNERS pide la revisión. Subir a 1 al sumar a la tutoría.
      required_pull_request_reviews: {
        dismiss_stale_reviews: true,
        required_approving_review_count: 0,
      },
      restrictions: null,
      required_linear_history: linear,
      required_conversation_resolution: true,
      allow_force_pushes: false,
      allow_deletions: false,
    });
    if (!dryRun) console.log(`  ✓ ${branch}${linear ? ' (historial lineal: squash)' : ''}`);
  }
}

// ---------- Tablero (GitHub Projects) ----------
if (step('project')) {
  header('Tablero "Medios AeA"');
  const projects =
    ghJson(['project', 'list', '--owner', owner, '--format', 'json'])?.projects ?? [];
  let project = projects.find((p) => p.title === 'Medios AeA');
  if (!project) {
    const created = gh(
      ['project', 'create', '--owner', owner, '--title', 'Medios AeA', '--format', 'json'],
      { mutating: true },
    );
    project = created ? JSON.parse(created) : { number: '<N>' };
    gh(['project', 'link', String(project.number), '--owner', owner, '--repo', repo], {
      mutating: true,
    });
    if (!dryRun) console.log(`  ✓ creado (#${project.number}) y vinculado al repositorio`);
  } else {
    console.log(`  = ya existe (#${project.number})`);
  }
  const fields =
    ghJson(['project', 'field-list', String(project.number), '--owner', owner, '--format', 'json'])
      ?.fields ?? [];
  if (!fields.some((f) => f.name === 'Estado')) {
    gh(
      [
        'project',
        'field-create',
        String(project.number),
        '--owner',
        owner,
        '--name',
        'Estado',
        '--data-type',
        'SINGLE_SELECT',
        '--single-select-options',
        'Backlog,Sprint,En curso,En revisión,Hecho',
      ],
      { mutating: true },
    );
    if (!dryRun) console.log('  ✓ campo Estado: Backlog · Sprint · En curso · En revisión · Hecho');
  }
  for (const url of issueUrls) {
    gh(['project', 'item-add', String(project.number), '--owner', owner, '--url', url], {
      mutating: true,
    });
  }
  if (!dryRun && issueUrls.length) console.log(`  ✓ ${issueUrls.length} issues en el tablero`);
}

console.log(dryRun ? '\nSimulación terminada: no se cambió nada.' : '\nListo.');
