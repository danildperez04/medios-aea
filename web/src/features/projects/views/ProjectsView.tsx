import { Button, Chip, IconButton, MenuItem, Stack, Tooltip } from '@mui/material';
import { Archive, ArchiveRestore, FolderKanban, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '@/app/services/api';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  FormError,
  PageHeader,
  TextField,
  type DataTableColumn,
} from '@/design-system/ui';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { formatDate } from '@/shared/lib/format';
import { ProjectFormDialog } from '../components/ProjectFormDialog';
import { useProjects, useSaveProject, type Project } from '../services/projects.service';

type StatusFilter = 'active' | 'inactive' | 'all';

/** Proyectos a los que se cargan los viajes (HU-03). */
export function ProjectsView() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('active');
  const debouncedSearch = useDebouncedValue(search);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [toggling, setToggling] = useState<Project | null>(null);

  const projects = useProjects({
    page,
    limit,
    search: debouncedSearch,
    isActive: status === 'all' ? undefined : status === 'active',
  });
  const save = useSaveProject();

  const confirmToggle = async () => {
    if (!toggling) return;
    try {
      await save.mutateAsync({ id: toggling.id, input: { isActive: !toggling.isActive } });
      setToggling(null);
    } catch {
      // Se muestra en el diálogo.
    }
  };

  const columns: DataTableColumn<Project>[] = [
    { key: 'code', header: 'Código', render: (p) => <strong>{p.code}</strong>, width: 180 },
    { key: 'name', header: 'Nombre', render: (p) => p.name },
    {
      key: 'status',
      header: 'Estado',
      render: (p) =>
        p.isActive ? (
          <Chip size="small" color="success" label="Activo" />
        ) : (
          <Chip size="small" variant="outlined" label="Inactivo" />
        ),
    },
    { key: 'created', header: 'Creado', render: (p) => formatDate(p.createdAt) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              aria-label={`Editar ${p.code}`}
              onClick={() => {
                setEditing(p);
                setFormOpen(true);
              }}
            >
              <Pencil size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title={p.isActive ? 'Desactivar' : 'Reactivar'}>
            <IconButton
              size="small"
              aria-label={`${p.isActive ? 'Desactivar' : 'Reactivar'} ${p.code}`}
              onClick={() => {
                save.reset();
                setToggling(p);
              }}
            >
              {p.isActive ? <Archive size={16} /> : <ArchiveRestore size={16} />}
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Proyectos"
        description="Solo los proyectos activos aparecen al solicitar un vehículo"
        actions={
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Nuevo proyecto
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Buscar por código o nombre"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <TextField
          select
          label="Estado"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as StatusFilter);
            setPage(1);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="active">Activos</MenuItem>
          <MenuItem value="inactive">Inactivos</MenuItem>
          <MenuItem value="all">Todos</MenuItem>
        </TextField>
      </Stack>

      <FormError message={projects.error instanceof ApiError ? projects.error.message : null} />

      <DataTable
        columns={columns}
        rows={projects.data?.data ?? []}
        getRowId={(p) => p.id}
        loading={projects.isFetching}
        empty={
          <EmptyState
            icon={FolderKanban}
            title={search ? 'Ningún proyecto coincide con la búsqueda' : 'Aún no hay proyectos'}
            description={
              search ? 'Prueba con otro código o nombre.' : 'Crea el primero con “Nuevo proyecto”.'
            }
          />
        }
        pagination={{
          page,
          limit,
          total: projects.data?.total ?? 0,
          onPageChange: setPage,
          onLimitChange: (value) => {
            setLimit(value);
            setPage(1);
          },
        }}
      />

      <ProjectFormDialog open={formOpen} project={editing} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={toggling !== null}
        title={toggling?.isActive ? 'Desactivar proyecto' : 'Reactivar proyecto'}
        message={
          toggling?.isActive
            ? `${toggling.code} dejará de aparecer al solicitar vehículos. Los viajes ya registrados se conservan en los reportes.`
            : `${toggling?.code ?? ''} volverá a aparecer al solicitar vehículos.`
        }
        confirmLabel={toggling?.isActive ? 'Desactivar' : 'Reactivar'}
        destructive={toggling?.isActive ?? true}
        loading={save.isPending}
        error={save.error instanceof ApiError ? save.error.message : null}
        onConfirm={confirmToggle}
        onClose={() => setToggling(null)}
      />
    </>
  );
}
