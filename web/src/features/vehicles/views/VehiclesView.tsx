import { Button, IconButton, MenuItem, Stack, Tooltip } from '@mui/material';
import { Archive, CalendarX2, Car, Pencil, Plus, Wrench } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '@/app/services/api';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  FormError,
  PageHeader,
  ResourceTag,
  TextField,
  type DataTableColumn,
} from '@/design-system/ui';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { formatKm } from '@/shared/lib/format';
import { BlackoutsDialog } from '../components/BlackoutsDialog';
import { ResourceStatusBadge } from '../components/ResourceStatusBadge';
import { VehicleFormDialog } from '../components/VehicleFormDialog';
import { FUEL_LABELS } from '../schemas/vehicle.schema';
import {
  useSaveVehicle,
  useVehicles,
  type ResourceStatus,
  type Vehicle,
} from '../services/vehicles.service';

type StatusFilter = 'ACTIVE' | ResourceStatus;

/** Vehículos de la flota (HU-05) y sus bloqueos (HU-07). */
export function VehiclesView() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ACTIVE');
  const debouncedSearch = useDebouncedValue(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [blocking, setBlocking] = useState<Vehicle | null>(null);
  const [retiring, setRetiring] = useState<Vehicle | null>(null);

  const vehicles = useVehicles({
    page,
    limit,
    search: debouncedSearch,
    status: status === 'ACTIVE' ? undefined : status,
  });
  const save = useSaveVehicle();

  const toggleMaintenance = (vehicle: Vehicle) =>
    save.mutate({
      id: vehicle.id,
      input: { status: vehicle.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE' },
    });

  const confirmRetire = async () => {
    if (!retiring) return;
    try {
      await save.mutateAsync({ id: retiring.id, input: { status: 'INACTIVE' } });
      setRetiring(null);
    } catch {
      // Se muestra en el diálogo.
    }
  };

  const columns: DataTableColumn<Vehicle>[] = [
    {
      key: 'vehicle',
      header: 'Vehículo',
      primary: true,
      render: (v) => <ResourceTag kind="VEHICLE" identifier={v.plate} name={v.name} />,
    },
    {
      key: 'model',
      header: 'Marca y modelo',
      render: (v) => `${v.brand} ${v.model}${v.year ? ` ${v.year}` : ''}`,
    },
    {
      key: 'capacity',
      header: 'Pasajeros',
      align: 'right',
      render: (v) => <span className="tabular">{v.passengerCapacity}</span>,
    },
    { key: 'fuel', header: 'Combustible', render: (v) => FUEL_LABELS[v.fuelType] },
    {
      key: 'km',
      header: 'Kilometraje',
      align: 'right',
      render: (v) => (
        <span className="tabular" style={{ whiteSpace: 'nowrap' }}>
          {formatKm(v.currentOdometer)}
        </span>
      ),
    },
    { key: 'status', header: 'Estado', render: (v) => <ResourceStatusBadge status={v.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (v) =>
        v.status === 'INACTIVE' ? (
          <Button
            size="small"
            onClick={() => save.mutate({ id: v.id, input: { status: 'AVAILABLE' } })}
          >
            Reactivar
          </Button>
        ) : (
          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
            <Tooltip title="Editar">
              <IconButton
                size="small"
                aria-label={`Editar ${v.name}`}
                onClick={() => {
                  setEditing(v);
                  setFormOpen(true);
                }}
              >
                <Pencil size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Bloqueos">
              <IconButton
                size="small"
                aria-label={`Bloqueos de ${v.name}`}
                onClick={() => setBlocking(v)}
              >
                <CalendarX2 size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip
              title={v.status === 'MAINTENANCE' ? 'Marcar disponible' : 'Marcar en mantenimiento'}
            >
              <IconButton
                size="small"
                aria-label={`${v.status === 'MAINTENANCE' ? 'Marcar disponible' : 'Marcar en mantenimiento'} ${v.name}`}
                aria-pressed={v.status === 'MAINTENANCE'}
                onClick={() => toggleMaintenance(v)}
              >
                <Wrench size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Dar de baja">
              <IconButton
                size="small"
                aria-label={`Dar de baja ${v.name}`}
                onClick={() => {
                  save.reset();
                  setRetiring(v);
                }}
              >
                <Archive size={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
    },
  ];

  const filtered = Boolean(search) || status !== 'ACTIVE';

  return (
    <>
      <PageHeader
        title="Vehículos"
        description="Los vehículos que el equipo puede pedir para ir a las comunidades"
        actions={
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Registrar vehículo
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Buscar por nombre, placa o modelo"
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
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="ACTIVE">En servicio</MenuItem>
          <MenuItem value="AVAILABLE">Disponibles</MenuItem>
          <MenuItem value="MAINTENANCE">En mantenimiento</MenuItem>
          <MenuItem value="INACTIVE">Dados de baja</MenuItem>
        </TextField>
      </Stack>

      <FormError
        message={[vehicles.error, save.error].find((e) => e instanceof ApiError)?.message ?? null}
      />

      <DataTable
        columns={columns}
        rows={vehicles.data?.data ?? []}
        getRowId={(v) => v.id}
        loading={vehicles.isFetching}
        empty={
          <EmptyState
            icon={Car}
            title={
              filtered
                ? 'Ningún vehículo coincide con el filtro'
                : 'Aún no hay vehículos registrados'
            }
            description={
              filtered
                ? 'Prueba con otra búsqueda o estado.'
                : 'Registra el primero para que el equipo pueda pedirlo y aparezca en la agenda.'
            }
          />
        }
        pagination={{
          page,
          limit,
          total: vehicles.data?.total ?? 0,
          onPageChange: setPage,
          onLimitChange: (value) => {
            setLimit(value);
            setPage(1);
          },
        }}
      />

      <VehicleFormDialog open={formOpen} vehicle={editing} onClose={() => setFormOpen(false)} />
      <BlackoutsDialog vehicle={blocking} onClose={() => setBlocking(null)} />
      <ConfirmDialog
        open={retiring !== null}
        title="Dar de baja"
        message={`${retiring?.name ?? ''} dejará de aparecer en la agenda y nadie podrá pedirlo. Sus viajes anteriores se conservan.`}
        confirmLabel="Dar de baja"
        loading={save.isPending}
        error={save.error instanceof ApiError ? save.error.message : null}
        onConfirm={confirmRetire}
        onClose={() => setRetiring(null)}
      />
    </>
  );
}
