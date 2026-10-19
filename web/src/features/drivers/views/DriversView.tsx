import { Button, IconButton, MenuItem, Stack, Tooltip } from '@mui/material';
import { IdCard, Pencil, Plus, UserCheck, UserX } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '@/app/services/api';
import {
  ActiveBadge,
  DataTable,
  EmptyState,
  FormError,
  PageHeader,
  TextField,
  type DataTableColumn,
} from '@/design-system/ui';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { DriverFormDialog } from '../components/DriverFormDialog';
import { LicenseBadge } from '../components/LicenseBadge';
import { useDrivers, useSaveDriver, type Driver } from '../services/drivers.service';

type Filter = 'active' | 'expiring' | 'inactive' | 'all';

/** Quienes pueden conducir y el vencimiento de sus licencias (HU-06, HU-26). */
export function DriversView() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('active');
  const debouncedSearch = useDebouncedValue(search);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);

  const drivers = useDrivers({
    page,
    limit,
    search: debouncedSearch,
    isActive: filter === 'all' ? undefined : filter !== 'inactive',
    expiringWithinDays: filter === 'expiring' ? 30 : undefined,
  });
  const save = useSaveDriver();

  const columns: DataTableColumn<Driver>[] = [
    { key: 'name', header: 'Nombre', primary: true, render: (d) => d.fullName },
    {
      key: 'license',
      header: 'Licencia',
      render: (d) => <span className="tabular">{d.licenseNumber}</span>,
    },
    {
      key: 'expiry',
      header: 'Vencimiento',
      render: (d) => <LicenseBadge status={d.licenseStatus} expiry={d.licenseExpiry} />,
    },
    { key: 'phone', header: 'Teléfono', render: (d) => d.phone ?? '—' },
    { key: 'status', header: 'Estado', render: (d) => <ActiveBadge active={d.isActive} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (d) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          <Tooltip title="Editar licencia">
            <IconButton
              size="small"
              aria-label={`Editar licencia de ${d.fullName}`}
              onClick={() => {
                setEditing(d);
                setFormOpen(true);
              }}
            >
              <Pencil size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title={d.isActive ? 'Desactivar' : 'Reactivar'}>
            <IconButton
              size="small"
              aria-label={`${d.isActive ? 'Desactivar' : 'Reactivar'} a ${d.fullName}`}
              onClick={() => save.mutate({ id: d.id, input: { isActive: !d.isActive } })}
            >
              {d.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Conductores"
        description="Solo se asignan conductores activos con la licencia vigente durante todo el viaje"
        actions={
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Registrar conductor
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Buscar por nombre o licencia"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <TextField
          select
          label="Mostrar"
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value as Filter);
            setPage(1);
          }}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="active">Activos</MenuItem>
          <MenuItem value="expiring">Licencia vencida o por vencer</MenuItem>
          <MenuItem value="inactive">Inactivos</MenuItem>
          <MenuItem value="all">Todos</MenuItem>
        </TextField>
      </Stack>

      <FormError
        message={[drivers.error, save.error].find((e) => e instanceof ApiError)?.message ?? null}
      />

      <DataTable
        columns={columns}
        rows={drivers.data?.data ?? []}
        getRowId={(d) => d.id}
        loading={drivers.isFetching}
        empty={
          <EmptyState
            icon={IdCard}
            title={
              filter === 'expiring'
                ? 'Ninguna licencia vence en los próximos 30 días'
                : 'No hay conductores en esta lista'
            }
            description={
              filter === 'expiring'
                ? 'Todas las licencias activas están vigentes.'
                : 'Registra la licencia de cada persona del equipo que maneje, sea técnica o de coordinación.'
            }
          />
        }
        pagination={{
          page,
          limit,
          total: drivers.data?.total ?? 0,
          onPageChange: setPage,
          onLimitChange: (value) => {
            setLimit(value);
            setPage(1);
          },
        }}
      />

      <DriverFormDialog open={formOpen} driver={editing} onClose={() => setFormOpen(false)} />
    </>
  );
}
