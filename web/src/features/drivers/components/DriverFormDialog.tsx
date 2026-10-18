import { zodResolver } from '@hookform/resolvers/zod';
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
import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/app/services/api';
import { FormError, LoadingButton, TextField } from '@/design-system/ui';
import { useUsers } from '@/features/users/services/users.service';
import { useDrivers, useSaveDriver, type Driver } from '../services/drivers.service';

const schema = z.object({
  userId: z.string(),
  licenseNumber: z
    .string()
    .trim()
    .toUpperCase()
    .min(4, 'Al menos 4 caracteres')
    .max(40, 'No más de 40 caracteres'),
  licenseExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica la fecha de vencimiento'),
});
type DriverForm = z.infer<typeof schema>;

export interface DriverFormDialogProps {
  open: boolean;
  driver: Driver | null;
  onClose: () => void;
}

/** Registro de la licencia de un conductor (HU-06). El usuario se crea antes en Usuarios. */
export function DriverFormDialog({ open, driver, onClose }: DriverFormDialogProps) {
  const save = useSaveDriver();
  // Usuarios con rol de conductor que todavía no tienen licencia registrada.
  const users = useUsers({ page: 1, limit: 100, role: 'DRIVER', isActive: true });
  const drivers = useDrivers({ page: 1, limit: 100 });
  const candidates = useMemo(() => {
    const taken = new Set((drivers.data?.data ?? []).map((d) => d.userId));
    return (users.data?.data ?? []).filter((u) => !taken.has(u.id));
  }, [users.data, drivers.data]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<DriverForm>({
    resolver: zodResolver(schema),
    defaultValues: { userId: '', licenseNumber: '', licenseExpiry: '' },
  });

  useEffect(() => {
    if (!open) return;
    save.reset();
    reset(
      driver
        ? {
            userId: driver.userId,
            licenseNumber: driver.licenseNumber,
            licenseExpiry: driver.licenseExpiry,
          }
        : { userId: '', licenseNumber: '', licenseExpiry: '' },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir
  }, [open, driver]);

  const onSubmit = handleSubmit(async (values) => {
    if (!driver && !values.userId) {
      setError('userId', { message: 'Elige a la persona' });
      return;
    }
    try {
      await save.mutateAsync(
        driver
          ? {
              id: driver.id,
              input: { licenseNumber: values.licenseNumber, licenseExpiry: values.licenseExpiry },
            }
          : { input: values },
      );
      onClose();
    } catch {
      // Se muestra con save.error.
    }
  });

  const userId = useWatch({ control, name: 'userId' });
  const noCandidates = !driver && !users.isLoading && candidates.length === 0;

  return (
    <Dialog open={open} onClose={save.isPending ? undefined : onClose} maxWidth="xs" fullWidth>
      <form onSubmit={onSubmit} noValidate>
        <DialogTitle>
          {driver ? `Licencia de ${driver.fullName}` : 'Registrar conductor'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {driver ? null : noCandidates ? (
              <Typography variant="body2">
                No hay usuarios con rol de conductor sin licencia registrada. Crea primero a la
                persona en Usuarios con el rol Conductor/a.
              </Typography>
            ) : (
              <TextField
                select
                label="Persona"
                value={userId}
                onChange={(event) =>
                  setValue('userId', event.target.value, { shouldValidate: true })
                }
                error={Boolean(errors.userId)}
                helperText={errors.userId?.message ?? 'Usuarios con rol Conductor/a.'}
              >
                {candidates.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.fullName}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              {...register('licenseNumber')}
              label="Número de licencia"
              error={Boolean(errors.licenseNumber)}
              helperText={errors.licenseNumber?.message}
              slotProps={{ htmlInput: { className: 'tabular' } }}
            />
            <TextField
              {...register('licenseExpiry')}
              label="Vence el"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              error={Boolean(errors.licenseExpiry)}
              helperText={
                errors.licenseExpiry?.message ?? 'No se le asignarán viajes después de esta fecha.'
              }
            />
            <FormError message={save.error instanceof ApiError ? save.error.message : null} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={save.isPending}>
            Cancelar
          </Button>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={save.isPending}
            disabled={noCandidates}
          >
            {driver ? 'Guardar' : 'Registrar'}
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
