import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { ApiError } from '@/app/services/api';
import { FormError, LoadingButton, TextField } from '@/design-system/ui';
import { formatRange } from '@/shared/lib/format';
import {
  useApprovalOptions,
  useApproveReservation,
  useReassignReservation,
  type DriverUnavailableReason,
  type Reservation,
  type ResourceUnavailableReason,
} from '../services/reservations.service';

const RESOURCE_REASONS: Record<ResourceUnavailableReason, string> = {
  MAINTENANCE: 'está en mantenimiento',
  CAPACITY: 'no le caben los pasajeros',
  BLOCKED: 'tiene un bloqueo en ese horario',
  BUSY: 'ya tiene un viaje en ese horario',
};

const DRIVER_REASONS: Record<DriverUnavailableReason, string> = {
  INACTIVE: 'no está habilitado para conducir',
  LICENSE_EXPIRED: 'su licencia no cubre el viaje',
  BUSY: 'ya conduce otro viaje en ese horario',
};

export interface ApproveDialogProps {
  reservation: Reservation | null;
  /** `reassign`: cambia el medio o quien conduce de una aprobada (HU-13). */
  mode?: 'approve' | 'reassign';
  onClose: () => void;
}

/**
 * Aprobar una solicitud (HU-11). Se monta de nuevo por cada solicitud (`key`), así
 * que la elección y el error empiezan vacíos. Solo ofrece medios y conductores libres en el
 * horario; viene marcado el medio preferido y el conductor propuesto si están
 * libres. La coordinación puede elegir a otra persona y se avisa (ADR 0004).
 *
 * Al reasignar (HU-13) vienen marcados el medio y la persona actuales, que también se
 * ofrecen aunque la disponibilidad los dé por ocupados: los ocupa este mismo viaje.
 */
export function ApproveDialog({ reservation, mode = 'approve', onClose }: ApproveDialogProps) {
  const options = useApprovalOptions(reservation);
  const approveMutation = useApproveReservation();
  const reassignMutation = useReassignReservation();
  const reassigning = mode === 'reassign';
  const approve = reassigning ? reassignMutation : approveMutation;
  const current = reassigning ? (reservation?.assignment ?? null) : null;
  // null = la coordinación aún no eligió: vale el preferido o el propuesto si están libres.
  const [chosenResourceId, setResourceId] = useState<string | null>(null);
  const [chosenDriverId, setDriverId] = useState<string | null>(null);

  const resources = options.data?.resources;
  const drivers = options.data?.drivers;
  const proposed = reservation?.proposedDriver ?? null;
  const preferred = reservation?.preferredResource ?? null;

  // Por qué el preferido o el propuesto no aparecen en la lista, si es el caso.
  const preferredBusy = useMemo(
    () => resources?.unavailable.find((u) => u.resource.id === preferred?.id),
    [resources, preferred],
  );
  const proposedBusy = useMemo(
    () => drivers?.unavailable.find((u) => u.driver.id === proposed?.id),
    [drivers, proposed],
  );

  // Al reasignar, lo actual va primero en la lista aunque figure como ocupado.
  const resourceOptions = useMemo(() => {
    const available = resources?.available ?? [];
    if (!current || available.some((r) => r.id === current.resource.id)) return available;
    const own = resources?.unavailable.find((u) => u.resource.id === current.resource.id);
    return [own?.resource ?? { ...current.resource, passengerCapacity: null }, ...available];
  }, [resources, current]);
  const driverOptions = useMemo(() => {
    const available = drivers?.available ?? [];
    const own = current?.driver;
    if (!own || available.some((d) => d.id === own.id)) return available;
    return [own, ...available];
  }, [drivers, current]);

  const resourceId =
    chosenResourceId ??
    current?.resource.id ??
    (resources?.available.some((r) => r.id === preferred?.id) ? (preferred?.id ?? '') : '');
  const driverId =
    chosenDriverId ??
    current?.driver?.id ??
    (drivers?.available.some((d) => d.id === proposed?.id) ? (proposed?.id ?? '') : '');

  // Contra quién se compara el cambio de conductor: el actual al reasignar, el propuesto al aprobar.
  const reference = current ? (current.driver ?? null) : proposed;
  const changed = Boolean(reference && driverId && driverId !== reference.id);
  const chosenDriver = driverOptions.find((d) => d.id === driverId);
  const noResources = resources !== undefined && resourceOptions.length === 0;
  const unchanged =
    current !== null && resourceId === current.resource.id && driverId === current.driver?.id;

  const onApprove = async () => {
    if (!reservation || !resourceId || !driverId) return;
    try {
      if (current) {
        await reassignMutation.mutateAsync({
          id: reservation.id,
          ...(resourceId !== current.resource.id ? { resourceId } : {}),
          ...(driverId !== current.driver?.id ? { driverId } : {}),
        });
      } else {
        await approveMutation.mutateAsync({ id: reservation.id, resourceId, driverId });
      }
      onClose();
    } catch {
      // Se muestra en el diálogo; un 409 refresca las opciones por si cambiaron.
      void options.refetch();
    }
  };

  return (
    <Dialog
      open={reservation !== null}
      onClose={approve.isPending ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {reassigning ? 'Reasignar' : 'Aprobar'} {reservation?.code}
      </DialogTitle>
      <DialogContent>
        {reservation ? (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2">
              {reservation.destination} · {formatRange(reservation.startsAt, reservation.endsAt)} ·{' '}
              {reservation.passengers} {reservation.passengers === 1 ? 'persona' : 'personas'}. Pide{' '}
              {reservation.requester.fullName}.
            </Typography>

            {noResources ? (
              <Typography variant="body2">
                No hay medios libres para ese horario y esa cantidad de personas. Rechaza la
                solicitud o reasigna otro viaje.
              </Typography>
            ) : (
              <TextField
                select
                label="Medio"
                value={resourceId}
                onChange={(event) => setResourceId(event.target.value)}
                disabled={!resources}
                helperText={
                  current
                    ? 'Aparecen el asignado y los libres en ese horario.'
                    : preferredBusy
                      ? `${preferred?.name}, el preferido, ${RESOURCE_REASONS[preferredBusy.reasons[0]]}.`
                      : 'Solo aparecen los libres en ese horario.'
                }
              >
                {resourceOptions.map((resource) => (
                  <MenuItem key={resource.id} value={resource.id}>
                    {resource.name} · {resource.identifier}
                    {resource.passengerCapacity !== null
                      ? ` · ${resource.passengerCapacity} pasajeros`
                      : ''}
                    {resource.id === current?.resource.id
                      ? ' (asignado)'
                      : !current && resource.id === preferred?.id
                        ? ' (preferido)'
                        : ''}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              select
              label="Conduce"
              value={driverId}
              onChange={(event) => setDriverId(event.target.value)}
              disabled={!drivers}
              helperText={
                !current && proposedBusy
                  ? `${proposed?.fullName}, propuesto, ${DRIVER_REASONS[proposedBusy.reasons[0]]}. Elige a otra persona.`
                  : changed
                    ? `Se avisará a ${joinNames([reservation.requester.fullName, reference?.fullName, chosenDriver?.fullName])}.`
                    : current
                      ? `Se avisará a ${joinNames([reservation.requester.fullName, current.driver?.fullName])}.`
                      : proposed
                        ? `Propuesto por ${reservation.requester.fullName}.`
                        : 'La solicitud no indica quién conduce.'
              }
            >
              {driverOptions.map((driver) => (
                <MenuItem key={driver.id} value={driver.id}>
                  {driver.fullName}
                  {driver.id === current?.driver?.id
                    ? ' (asignado)'
                    : !current && driver.id === proposed?.id
                      ? ' (propuesto)'
                      : ''}
                </MenuItem>
              ))}
            </TextField>

            <FormError message={approve.error instanceof ApiError ? approve.error.message : null} />
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={approve.isPending}>
          Volver
        </Button>
        <LoadingButton
          variant="contained"
          loading={approve.isPending}
          disabled={!resourceId || !driverId || unchanged}
          onClick={onApprove}
        >
          {reassigning ? 'Reasignar' : 'Aprobar'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

/** "Ana", "Ana y José", "Ana, José y Luis", sin repetir a nadie. */
function joinNames(names: (string | undefined)[]): string {
  const unique = [...new Set(names.filter((name): name is string => Boolean(name)))];
  return unique.length > 1
    ? `${unique.slice(0, -1).join(', ')} y ${unique[unique.length - 1]}`
    : (unique[0] ?? '');
}
