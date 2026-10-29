import { Box, IconButton, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import { ArrowLeftRight, Ban, Check, ClipboardList, X } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '@/app/services/api';
import { useAuthStore } from '@/app/stores/auth.store';
import {
  ConfirmDialog,
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
import { ApproveDialog } from '../components/ApproveDialog';
import { RejectDialog } from '../components/RejectDialog';
import {
  useCancelReservation,
  useReservations,
  type Reservation,
} from '../services/reservations.service';

type StatusFilter = RequestStatus | 'ALL';

/** RN-13: solo pendientes y aprobadas; la API rechaza además un viaje ya iniciado. */
const CANCELLABLE: RequestStatus[] = ['PENDING', 'APPROVED'];

const STATUS_OPTIONS: [StatusFilter, string][] = [
  ['PENDING', 'Por decidir'],
  ['APPROVED', 'Aprobadas'],
  ['COMPLETED', 'Completadas'],
  ['REJECTED', 'Rechazadas'],
  ['CANCELLED', 'Canceladas'],
  ['ALL', 'Todas'],
];

/** Qué pasa al cancelar; la API avisa a la persona solicitante si no es quien cancela. */
function cancelMessage(reservation: Reservation, currentUserId: string | undefined): string {
  const effect =
    reservation.status === 'APPROVED'
      ? `${reservation.code} quedará cancelada y el medio y el conductor asignados quedarán libres en ese horario.`
      : `${reservation.code} quedará cancelada y saldrá de la lista por decidir.`;
  return reservation.requester.id === currentUserId
    ? effect
    : `${effect} Se avisará a ${reservation.requester.fullName}.`;
}

/**
 * Bandeja de solicitudes (HU-09). La coordinación aprueba una pendiente asignando
 * medio y conductor (HU-11), la rechaza con motivo (HU-12), reasigna una aprobada
 * (HU-13) y cancela una pendiente o aprobada (HU-10).
 */
export function RequestsView() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const debouncedSearch = useDebouncedValue(search);
  const [cancelling, setCancelling] = useState<Reservation | null>(null);
  const [approving, setApproving] = useState<Reservation | null>(null);
  const [rejecting, setRejecting] = useState<Reservation | null>(null);
  const [reassigning, setReassigning] = useState<Reservation | null>(null);
  const cancel = useCancelReservation();
  const currentUserId = useAuthStore((state) => state.user?.id);

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
      key: 'driver',
      header: 'Conduce',
      // Aprobada: quien conduce de verdad; si no, quien se propuso (RN-15).
      render: (r) =>
        r.assignment?.driver || r.proposedDriver ? (
          (r.assignment?.driver ?? r.proposedDriver)?.fullName
        ) : (
          <Typography variant="body2" color="text.secondary">
            Sin indicar
          </Typography>
        ),
    },
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
      key: 'resource',
      header: 'Medio',
      // Aprobada: el medio asignado; si no, el preferido por quien pide.
      render: (r) =>
        r.assignment ? (
          <ResourceTag
            kind={r.resourceType}
            identifier={r.assignment.resource.identifier}
            name={r.assignment.resource.name}
          />
        ) : r.preferredResource ? (
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
    {
      key: 'status',
      header: 'Estado',
      // Una rechazada muestra el motivo: es lo que recibió quien pidió (HU-12).
      render: (r) => (
        <Box>
          <StatusBadge status={r.status} />
          {r.status === 'REJECTED' && r.rejectionReason ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {r.rejectionReason}
            </Typography>
          ) : null}
        </Box>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          {r.status === 'PENDING' ? (
            <Tooltip title="Aprobar">
              <IconButton
                size="small"
                aria-label={`Aprobar la solicitud ${r.code}`}
                onClick={() => setApproving(r)}
              >
                <Check size={18} />
              </IconButton>
            </Tooltip>
          ) : null}
          {r.status === 'APPROVED' && r.assignment ? (
            <Tooltip title="Reasignar medio o conductor">
              <IconButton
                size="small"
                aria-label={`Reasignar la solicitud ${r.code}`}
                onClick={() => setReassigning(r)}
              >
                <ArrowLeftRight size={18} />
              </IconButton>
            </Tooltip>
          ) : null}
          {r.status === 'PENDING' ? (
            <Tooltip title="Rechazar">
              <IconButton
                size="small"
                aria-label={`Rechazar la solicitud ${r.code}`}
                onClick={() => setRejecting(r)}
              >
                <X size={18} />
              </IconButton>
            </Tooltip>
          ) : null}
          {CANCELLABLE.includes(r.status) ? (
            <Tooltip title="Cancelar solicitud">
              <IconButton
                size="small"
                aria-label={`Cancelar la solicitud ${r.code}`}
                onClick={() => {
                  cancel.reset();
                  setCancelling(r);
                }}
              >
                <Ban size={18} />
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>
      ),
    },
  ];

  const confirmCancel = async () => {
    if (!cancelling) return;
    try {
      await cancel.mutateAsync(cancelling.id);
      setCancelling(null);
    } catch {
      // Se muestra en el diálogo.
    }
  };

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

      <ApproveDialog
        key={approving?.id ?? 'closed'}
        reservation={approving}
        onClose={() => setApproving(null)}
      />

      <ApproveDialog
        key={`reassign-${reassigning?.id ?? 'closed'}`}
        mode="reassign"
        reservation={reassigning}
        onClose={() => setReassigning(null)}
      />

      <RejectDialog
        key={rejecting?.id ?? 'closed'}
        reservation={rejecting}
        onClose={() => setRejecting(null)}
      />

      <ConfirmDialog
        open={cancelling !== null}
        title="Cancelar solicitud"
        message={cancelling ? cancelMessage(cancelling, currentUserId) : ''}
        confirmLabel="Cancelar solicitud"
        dismissLabel="Volver"
        loading={cancel.isPending}
        error={cancel.error instanceof ApiError ? cancel.error.message : null}
        onConfirm={confirmCancel}
        onClose={() => setCancelling(null)}
      />
    </>
  );
}
