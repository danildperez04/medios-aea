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
  onClose: () => void;
}

/**
 * Aprobar una solicitud (HU-11). Se monta de nuevo por cada solicitud (`key`), así
 * que la elección y el error empiezan vacíos. Solo ofrece medios y conductores libres en el
 * horario; viene marcado el medio preferido y el conductor propuesto si están
 * libres. La coordinación puede elegir a otra persona y se avisa (ADR 0004).
 */
export function ApproveDialog({ reservation, onClose }: ApproveDialogProps) {
  const options = useApprovalOptions(reservation);
  const approve = useApproveReservation();
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

  const resourceId =
    chosenResourceId ??
    (resources?.available.some((r) => r.id === preferred?.id) ? (preferred?.id ?? '') : '');
  const driverId =
    chosenDriverId ??
    (drivers?.available.some((d) => d.id === proposed?.id) ? (proposed?.id ?? '') : '');

  const changed = Boolean(proposed && driverId && driverId !== proposed.id);
  const chosenDriver = drivers?.available.find((d) => d.id === driverId);
  const noResources = resources !== undefined && resources.available.length === 0;

  const onApprove = async () => {
    if (!reservation || !resourceId || !driverId) return;
    try {
      await approve.mutateAsync({ id: reservation.id, resourceId, driverId });
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
      <DialogTitle>Aprobar {reservation?.code}</DialogTitle>
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
                  preferredBusy
                    ? `${preferred?.name}, el preferido, ${RESOURCE_REASONS[preferredBusy.reasons[0]]}.`
                    : 'Solo aparecen los libres en ese horario.'
                }
              >
                {(resources?.available ?? []).map((resource) => (
                  <MenuItem key={resource.id} value={resource.id}>
                    {resource.name} · {resource.identifier}
                    {resource.passengerCapacity !== null
                      ? ` · ${resource.passengerCapacity} pasajeros`
                      : ''}
                    {resource.id === preferred?.id ? ' (preferido)' : ''}
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
                proposedBusy
                  ? `${proposed?.fullName}, propuesto, ${DRIVER_REASONS[proposedBusy.reasons[0]]}. Elige a otra persona.`
                  : changed
                    ? `Se avisará a ${joinNames([reservation.requester.fullName, proposed?.fullName, chosenDriver?.fullName])}.`
                    : proposed
                      ? `Propuesto por ${reservation.requester.fullName}.`
                      : 'La solicitud no indica quién conduce.'
              }
            >
              {(drivers?.available ?? []).map((driver) => (
                <MenuItem key={driver.id} value={driver.id}>
                  {driver.fullName}
                  {driver.id === proposed?.id ? ' (propuesto)' : ''}
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
          disabled={!resourceId || !driverId}
          onClick={onApprove}
        >
          Aprobar
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
