#!/usr/bin/env node
// Escribe la cobertura (coverage/coverage-summary.json de Vitest) como tabla
// Markdown en el resumen del job de GitHub Actions.
//   node scripts/ci/coverage-summary.mjs "API" api/coverage/coverage-summary.json
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const [title, file] = process.argv.slice(2);
const out = process.env.GITHUB_STEP_SUMMARY;
if (!file || !existsSync(file)) {
  console.error(`No existe el resumen de cobertura: ${file}`);
  process.exit(0);
}
const { total } = JSON.parse(readFileSync(file, 'utf8'));
const row = (key, label) =>
  `| ${label} | ${total[key].pct.toFixed(1)} % | ${total[key].covered}/${total[key].total} |`;
const md = [
  `### Cobertura · ${title}`,
  '',
  '| Métrica | % | Cubiertas |',
  '| --- | ---: | ---: |',
  row('statements', 'Sentencias'),
  row('branches', 'Ramas'),
  row('functions', 'Funciones'),
  row('lines', 'Líneas'),
  '',
].join('\n');
if (out) appendFileSync(out, md);
else console.log(md);
