import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Typography,
} from '@mui/material';
import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ApiError } from '@/app/services/api';
import { FormError, LoadingButton, TextField } from '@/design-system/ui';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { managuaLocalToIso } from '@/shared/lib/format';
import { useProjects } from '@/features/projects/services/projects.service';
import { useUsers } from '@/features/users/services/users.service';
import { bookingSchema, type BookingForm, type BookingFormOutput } from '../schemas/booking.schema';
import { useBookReservation, useBookingOptions } from '../services/reservations.service';

export interface BookDialogProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY: BookingForm = {
  requesterId: '',
  projectId: '',
  destination: '',
  purpose: '',
  passengers: 1,
  startsAt: '',
  endsAt: '',
  resourceId: '',
  driverId: '',
};

/**
 * Nueva reserva desde el panel (HU-27): la coordinación la registra ya aprobada, sin
 * pasar por la bandeja. Se monta de nuevo cada vez que se abre (`key`). El medio y
 * quien conduce se eligen entre los libres en el horario; la API vuelve a validar
 * todo (choques, bloqueos, capacidad, licencia) y responde 409 o 422 si cambió algo.
 */
export function BookDialog({ open, onClose }: BookDialogProps) {
  const book = useBookReservation();
  const users = useUsers({ page: 1, limit: 100, isActive: true });
  const projects = useProjects({ page: 1, limit: 100, isActive: true });
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitted },
  } = useForm<BookingForm, unknown, BookingFormOutput>({
    resolver: zodResolver(bookingSchema),
    defaultValues: EMPTY,
  });

  const [requesterId, projectId, startsAt, endsAt, passengers, resourceId, driverId] = useWatch({
    control,
    name: [
      'requesterId',
      'projectId',
      'startsAt',
      'endsAt',
      'passengers',
      'resourceId',
      'driverId',
    ],
  });

  // Solo se consulta la disponibilidad con un horario completo y en orden. Se espera
  // a que dejen de escribir; la clave es texto para que el debounce compare por valor.
  const people = Number(passengers);
  const key = useDebouncedValue(
    startsAt && endsAt && endsAt > startsAt && Number.isInteger(people) && people >= 1
      ? `${startsAt}|${endsAt}|${people}`
      : '',
  );
  const window = useMemo(() => {
    if (!key) return null;
    const [from, to, count] = key.split('|');
    return { from: managuaLocalToIso(from), to: managuaLocalToIso(to), people: Number(count) };
  }, [key]);
  const options = useBookingOptions(
    window ? { from: window.from, to: window.to } : null,
    window?.people ?? 1,
  );
  const resources = window ? (options.data?.resources.available ?? []) : [];
  const drivers = window ? (options.data?.drivers.available ?? []) : [];
  // Si lo elegido deja de estar libre al cambiar el horario, el campo queda vacío.
  const resourceValue = resources.some((r) => r.id === resourceId) ? resourceId : '';
  const driverValue = drivers.some((d) => d.id === driverId) ? driverId : '';
  const noResources = window !== null && options.isSuccess && resources.length === 0;

  const onSubmit = handleSubmit(async (values) => {
    // Lo elegido pudo dejar de estar libre al cambiar el horario o las personas.
    if (!resourceValue) return setError('resourceId', { message: 'Elige el medio' });
    if (!driverValue) return setError('driverId', { message: 'Elige quién conduce' });
    try {
      await book.mutateAsync({
        ...values,
        resourceId: resourceValue,
        driverId: driverValue,
        startsAt: managuaLocalToIso(values.startsAt),
        endsAt: managuaLocalToIso(values.endsAt),
      });
      onClose();
    } catch {
      // Se muestra con book.error; un 409 refresca las opciones por si cambiaron.
      void options.refetch();
    }
  });

  const pickHelper = (kind: 'medio' | 'conductor') =>
    !window
      ? 'Primero indica el horario y las personas.'
      : kind === 'medio'
        ? 'Solo aparecen los libres en ese horario y con lugar para todas las personas.'
        : 'Solo aparecen quienes tienen licencia vigente y están libres en ese horario.';

  return (
    <Dialog open={open} onClose={book.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nueva reserva</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Queda aprobada en cuanto la guardas y ocupa la agenda. Se avisa a quien viaja y a quien
          conduce.
        </Typography>
        <Box component="form" id="book-form" onSubmit={onSubmit} noValidate>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Para quién"
                value={requesterId}
                onChange={(event) =>
                  setValue('requesterId', event.target.value, { shouldValidate: isSubmitted })
                }
                error={Boolean(errors.requesterId)}
                helperText={errors.requesterId?.message}
              >
                {(users.data?.data ?? []).map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.fullName}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Proyecto"
                value={projectId}
                onChange={(event) =>
                  setValue('projectId', event.target.value, { shouldValidate: isSubmitted })
                }
                error={Boolean(errors.projectId)}
                helperText={errors.projectId?.message}
              >
                {(projects.data?.data ?? []).map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.code} · {project.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                {...register('destination')}
                label="Destino"
                placeholder="Comunidad El Rosario, Totogalpa"
                error={Boolean(errors.destination)}
                helperText={errors.destination?.message}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                {...register('passengers')}
                label="Personas"
                type="number"
                slotProps={{ htmlInput: { min: 1, max: 60 } }}
                error={Boolean(errors.passengers)}
                helperText={errors.passengers?.message ?? 'Sin contar a quien conduce.'}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                {...register('purpose')}
                label="Propósito"
                placeholder="Taller de liderazgo juvenil"
                error={Boolean(errors.purpose)}
                helperText={errors.purpose?.message}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...register('startsAt')}
                label="Sale"
                type="datetime-local"
                slotProps={{ inputLabel: { shrink: true } }}
                error={Boolean(errors.startsAt)}
                helperText={errors.startsAt?.message ?? 'Hora de Managua.'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...register('endsAt')}
                label="Vuelve"
                type="datetime-local"
                slotProps={{ inputLabel: { shrink: true } }}
                error={Boolean(errors.endsAt)}
                helperText={errors.endsAt?.message}
              />
            </Grid>
            <Grid size={12}>
              {noResources ? (
                <Typography variant="body2">
                  No hay medios libres para ese horario y esa cantidad de personas. Prueba otro
                  horario o reasigna otro viaje.
                </Typography>
              ) : (
                <TextField
                  select
                  label="Medio"
                  value={resourceValue}
                  onChange={(event) =>
                    setValue('resourceId', event.target.value, { shouldValidate: isSubmitted })
                  }
                  disabled={!window || !options.data}
                  error={Boolean(errors.resourceId) && !resourceValue}
                  helperText={
                    errors.resourceId && !resourceValue
                      ? errors.resourceId.message
                      : pickHelper('medio')
                  }
                >
                  {resources.map((resource) => (
                    <MenuItem key={resource.id} value={resource.id}>
                      {resource.name} · {resource.identifier}
                      {resource.passengerCapacity !== null
                        ? ` · ${resource.passengerCapacity} pasajeros`
                        : ''}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Grid>
            <Grid size={12}>
              <TextField
                select
                label="Conduce"
                value={driverValue}
                onChange={(event) =>
                  setValue('driverId', event.target.value, { shouldValidate: isSubmitted })
                }
                disabled={!window || !options.data}
                error={Boolean(errors.driverId) && !driverValue}
                helperText={
                  errors.driverId && !driverValue
                    ? errors.driverId.message
                    : pickHelper('conductor')
                }
              >
                {drivers.map((driver) => (
                  <MenuItem key={driver.id} value={driver.id}>
                    {driver.fullName}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={12}>
              <FormError message={book.error instanceof ApiError ? book.error.message : null} />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={book.isPending}>
          Volver
        </Button>
        <LoadingButton type="submit" form="book-form" variant="contained" loading={book.isPending}>
          Reservar
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
