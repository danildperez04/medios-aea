import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import { Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ApiError } from '@/app/services/api';
import { FormError, LoadingButton, ResourceTag, TextField } from '@/design-system/ui';
import { formatRange, managuaLocalToIso } from '@/shared/lib/format';
import { BLACKOUT_LABELS, blackoutSchema, type BlackoutForm } from '../schemas/vehicle.schema';
import {
  useBlackouts,
  useCreateBlackout,
  useDeleteBlackout,
  type Vehicle,
} from '../services/vehicles.service';

export interface BlackoutsDialogProps {
  vehicle: Vehicle | null;
  onClose: () => void;
}

const EMPTY: BlackoutForm = { startsAt: '', endsAt: '', reason: 'MAINTENANCE', description: '' };

/**
 * Bloqueos de un vehículo (HU-07): los próximos y el formulario para agregar uno.
 * Si el bloqueo choca con un viaje aprobado, la API responde 409 y se muestra
 * con qué choca.
 */
export function BlackoutsDialog({ vehicle, onClose }: BlackoutsDialogProps) {
  const blackouts = useBlackouts(vehicle?.id ?? null);
  const create = useCreateBlackout();
  const remove = useDeleteBlackout();
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<BlackoutForm>({ resolver: zodResolver(blackoutSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (vehicle) {
      create.reset();
      remove.reset();
      reset(EMPTY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir
  }, [vehicle]);

  const onSubmit = handleSubmit(async (values) => {
    if (!vehicle) return;
    try {
      await create.mutateAsync({
        resourceId: vehicle.id,
        input: {
          startsAt: managuaLocalToIso(values.startsAt),
          endsAt: managuaLocalToIso(values.endsAt),
          reason: values.reason,
          description: values.description || null,
        },
      });
      reset(EMPTY);
    } catch {
      // Se muestra con create.error.
    }
  });

  const reason = useWatch({ control, name: 'reason' });
  const error = [create.error, remove.error].find((e) => e instanceof ApiError)?.message ?? null;
  const items = blackouts.data ?? [];

  return (
    <Dialog open={vehicle !== null} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Bloqueos</DialogTitle>
      <DialogContent>
        {vehicle ? (
          <Box sx={{ mb: 2 }}>
            <ResourceTag kind="VEHICLE" identifier={vehicle.plate} name={vehicle.name} />
          </Box>
        ) : null}

        <Typography sx={{ fontWeight: 600 }}>Próximos</Typography>
        {items.length === 0 ? (
          <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
            {blackouts.isLoading ? 'Cargando…' : 'No tiene bloqueos programados.'}
          </Typography>
        ) : (
          <Box component="ul" sx={{ listStyle: 'none', p: 0, m: '4px 0 16px' }}>
            {items.map((blackout) => (
              <Box
                component="li"
                key={blackout.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 0.75,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" className="tabular">
                    {formatRange(blackout.startsAt, blackout.endsAt)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {blackout.description || BLACKOUT_LABELS[blackout.reason]}
                  </Typography>
                </Box>
                <Tooltip title="Quitar bloqueo">
                  <IconButton
                    size="small"
                    aria-label={`Quitar bloqueo ${formatRange(blackout.startsAt, blackout.endsAt)}`}
                    onClick={() => remove.mutate(blackout.id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Box>
        )}

        <Typography sx={{ fontWeight: 600, mb: 1.5 }}>Agregar bloqueo</Typography>
        <Box component="form" id="blackout-form" onSubmit={onSubmit} noValidate>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...register('startsAt')}
                label="Desde"
                type="datetime-local"
                slotProps={{ inputLabel: { shrink: true } }}
                error={Boolean(errors.startsAt)}
                helperText={errors.startsAt?.message ?? 'Hora de Managua.'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...register('endsAt')}
                label="Hasta"
                type="datetime-local"
                slotProps={{ inputLabel: { shrink: true } }}
                error={Boolean(errors.endsAt)}
                helperText={errors.endsAt?.message}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                select
                label="Motivo"
                value={reason}
                onChange={(event) =>
                  setValue('reason', event.target.value as BlackoutForm['reason'])
                }
              >
                {Object.entries(BLACKOUT_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 7 }}>
              <TextField
                {...register('description')}
                label="Detalle (opcional)"
                placeholder="Cambio de frenos"
                error={Boolean(errors.description)}
                helperText={errors.description?.message}
              />
            </Grid>
            <Grid size={12}>
              <FormError message={error} />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
        <LoadingButton
          type="submit"
          form="blackout-form"
          variant="contained"
          loading={create.isPending}
        >
          Bloquear
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
