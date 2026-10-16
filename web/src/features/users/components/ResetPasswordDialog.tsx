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
import { z } from 'zod';
import { ApiError } from '@/app/services/api';
import { FormError, LoadingButton, TextField } from '@/design-system/ui';
import { passwordRule } from '../schemas/user.schema';
import { useResetPassword, type User } from '../services/users.service';

const schema = z.object({ password: passwordRule });

export interface ResetPasswordDialogProps {
  user: User | null;
  onClose: () => void;
}

/** El ADMIN asigna una contraseña nueva a quien la olvidó. */
export function ResetPasswordDialog({ user, onClose }: ResetPasswordDialogProps) {
  const reset = useResetPassword();
  const form = useForm<{ password: string }>({
    resolver: zodResolver(schema),
    defaultValues: { password: '' },
  });

  useEffect(() => {
    if (user) {
      reset.reset();
      form.reset({ password: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir
  }, [user]);

  const onSubmit = form.handleSubmit(async ({ password }) => {
    if (!user) return;
    try {
      await reset.mutateAsync({ id: user.id, password });
    } catch {
      // Se muestra con reset.error.
    }
  });

  return (
    <Dialog
      open={user !== null}
      onClose={reset.isPending ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <form onSubmit={onSubmit} noValidate>
        <DialogTitle>Restablecer contraseña</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {reset.isSuccess ? (
              <Alert severity="success">
                Contraseña de {user?.fullName} restablecida. Compártela de forma privada.
              </Alert>
            ) : (
              <TextField
                {...form.register('password')}
                label={`Nueva contraseña para ${user?.fullName ?? ''}`}
                type="password"
                autoComplete="new-password"
                autoFocus
                error={Boolean(form.formState.errors.password)}
                helperText={form.formState.errors.password?.message}
              />
            )}
            <FormError message={reset.error instanceof ApiError ? reset.error.message : null} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={reset.isPending}>
            {reset.isSuccess ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!reset.isSuccess ? (
            <LoadingButton type="submit" variant="contained" loading={reset.isPending}>
              Restablecer
            </LoadingButton>
          ) : null}
        </DialogActions>
      </form>
    </Dialog>
  );
}
