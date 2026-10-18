import { Box, MenuItem, Stack, Typography } from '@mui/material';
import { ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '@/app/services/api';
import {
  DataTable,
  EmptyState,
  FormError,
  PageHeader,
  ResourceTag,
  StatusBadge,
  TextField,
  type DataTableColumn,
  type RequestStatus,
} from '@/design-system/ui';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { mono } from '@/design-system/theme/theme';
import { formatRange } from '@/shared/lib/format';
import { useReservations, type Reservation } from '../services/reservations.service';

type StatusFilter = RequestStatus | 'ALL';

const STATUS_OPTIONS: [StatusFilter, string][] = [
  ['PENDING', 'Por decidir'],
  ['APPROVED', 'Aprobadas'],
  ['COMPLETED', 'Completadas'],
  ['REJECTED', 'Rechazadas'],
  ['CANCELLED', 'Canceladas'],
  ['ALL', 'Todas'],
];

/**
 * Bandeja de solicitudes (HU-09). Por ahora de consulta: aprobar y rechazar
 * llegan con HU-11 y HU-12.
 */
export function RequestsView() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const debouncedSearch = useDebouncedValue(search);

  const reservations = useReservations({
    page,
    limit,
    search: debouncedSearch,
    status: status === 'ALL' ? undefined : status,
  });

  const columns: DataTableColumn<Reservation>[] = [
    {
      key: 'when',
      header: 'Cuándo',
      primary: true,
      render: (r) => (
        <Box>
          <Box className="tabular" sx={{ whiteSpace: 'nowrap' }}>
            {formatRange(r.startsAt, r.endsAt)}
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ whiteSpace: 'nowrap', fontFamily: mono }}
          >
            {r.code}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'destination',
      header: 'Destino',
      render: (r) => (
        <Box>
          <Box>{r.destination}</Box>
          <Typography variant="body2" color="text.secondary">
            {r.purpose}
          </Typography>
        </Box>
      ),
    },
    { key: 'requester', header: 'Solicita', render: (r) => r.requester.fullName },
    {
      key: 'project',
      header: 'Proyecto',
      render: (r) => (
        <span className="tabular" title={r.project.name} style={{ whiteSpace: 'nowrap' }}>
          {r.project.code}
        </span>
      ),
    },
    {
      key: 'passengers',
      header: 'Personas',
      align: 'right',
      render: (r) => <span className="tabular">{r.passengers}</span>,
    },
    {
      key: 'preferred',
      header: 'Medio preferido',
      render: (r) =>
        r.preferredResource ? (
          <ResourceTag
            kind={r.resourceType}
            identifier={r.preferredResource.identifier}
            name={r.preferredResource.name}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Cualquiera
          </Typography>
        ),
    },
    { key: 'status', header: 'Estado', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const pendingView = status === 'PENDING';

  return (
    <>
      <PageHeader
        title="Solicitudes"
        description={
          pendingView
            ? 'Las más próximas primero: son las que hay que decidir antes'
            : 'Historial de solicitudes de medios'
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Buscar por código, destino o persona"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <TextField
          select
          label="Mostrar"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as StatusFilter);
            setPage(1);
          }}
          sx={{ minWidth: 200 }}
        >
          {STATUS_OPTIONS.map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <FormError
        message={reservations.error instanceof ApiError ? reservations.error.message : null}
      />

      <DataTable
        columns={columns}
        rows={reservations.data?.data ?? []}
        getRowId={(r) => r.id}
        loading={reservations.isFetching}
        empty={
          <EmptyState
            icon={ClipboardList}
            title={
              search
                ? 'Ninguna solicitud coincide con la búsqueda'
                : pendingView
                  ? 'No hay solicitudes por decidir'
                  : 'No hay solicitudes en esta lista'
            }
            description={
              pendingView && !search
                ? 'Cuando alguien pida un medio desde la app, aparecerá aquí.'
                : 'Prueba con otra búsqueda o estado.'
            }
          />
        }
        pagination={{
          page,
          limit,
          total: reservations.data?.total ?? 0,
          onPageChange: setPage,
          onLimitChange: (value) => {
            setLimit(value);
            setPage(1);
          },
        }}
      />
    </>
  );
}
