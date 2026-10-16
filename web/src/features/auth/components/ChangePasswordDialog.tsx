import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/app/services/api';
import { FormError, LoadingButton, TextField } from '@/design-system/ui';
import { changePasswordSchema, type ChangePasswordInput } from '../schemas/auth.schema';
import { useChangePassword } from '../services/auth.service';

export interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Cambio de la propia contraseña (RF-05, HU-04). */
export function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const change = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (open) {
      change.reset();
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir
  }, [open]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await change.mutateAsync(values);
    } catch {
      // Se muestra con change.error.
    }
  });

  return (
    <Dialog open={open} onClose={change.isPending ? undefined : onClose} maxWidth="xs" fullWidth>
      <form onSubmit={onSubmit} noValidate>
        <DialogTitle>Cambiar contraseña</DialogTitle>
        <DialogContent>
          {change.isSuccess ? (
            <Alert severity="success">Tu contraseña se actualizó correctamente.</Alert>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                {...register('currentPassword')}
                label="Contraseña actual"
                type="password"
                autoComplete="current-password"
                autoFocus
                error={Boolean(errors.currentPassword)}
                helperText={errors.currentPassword?.message}
              />
              <TextField
                {...register('newPassword')}
                label="Contraseña nueva"
                type="password"
                autoComplete="new-password"
                error={Boolean(errors.newPassword)}
                helperText={errors.newPassword?.message}
              />
              <TextField
                {...register('confirmPassword')}
                label="Confirmar contraseña nueva"
                type="password"
                autoComplete="new-password"
                error={Boolean(errors.confirmPassword)}
                helperText={errors.confirmPassword?.message}
              />
              <FormError message={change.error instanceof ApiError ? change.error.message : null} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={change.isPending}>
            {change.isSuccess ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!change.isSuccess ? (
            <LoadingButton type="submit" variant="contained" loading={change.isPending}>
              Cambiar
            </LoadingButton>
          ) : null}
        </DialogActions>
      </form>
    </Dialog>
  );
}
