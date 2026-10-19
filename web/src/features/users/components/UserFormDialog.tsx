import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
} from '@mui/material';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/app/services/api';
import { FormError, LoadingButton, TextField } from '@/design-system/ui';
import { useCreateUser, useUpdateUser, type User } from '../services/users.service';
import {
  createUserSchema,
  ROLE_LABELS,
  updateUserSchema,
  type CreateUserForm,
} from '../schemas/user.schema';

export interface UserFormDialogProps {
  open: boolean;
  /** Sin usuario se crea uno nuevo; con usuario se edita. */
  user: User | null;
  onClose: () => void;
}

const EMPTY: CreateUserForm = {
  fullName: '',
  email: '',
  phone: '',
  role: 'REQUESTER',
  password: '',
};

/** Alta y edición de usuarios (HU-02). La contraseña solo se pide al crear. */
export function UserFormDialog({ open, user, onClose }: UserFormDialogProps) {
  const isEdit = user !== null;
  const create = useCreateUser();
  const update = useUpdateUser();
  const mutation = isEdit ? update : create;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserForm>({
    // En edición no hay campo de contraseña: se valida con el esquema sin ella.
    resolver: zodResolver(
      isEdit ? (updateUserSchema as typeof createUserSchema) : createUserSchema,
    ),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    mutation.reset();
    reset(
      user
        ? {
            fullName: user.fullName,
            email: user.email,
            phone: user.phone ?? '',
            role: user.role,
            password: '',
          }
        : EMPTY,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir
  }, [open, user]);

  const onSubmit = handleSubmit(async (values) => {
    const { password, ...data } = values;
    try {
      if (user) await update.mutateAsync({ id: user.id, input: data });
      else await create.mutateAsync({ ...data, password });
      onClose();
    } catch {
      // El error se muestra con mutation.error.
    }
  });

  const error = mutation.error instanceof ApiError ? mutation.error.message : null;

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={onSubmit} noValidate>
        <DialogTitle>{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              {...register('fullName')}
              label="Nombre completo"
              autoFocus
              error={Boolean(errors.fullName)}
              helperText={errors.fullName?.message}
            />
            <TextField
              {...register('email')}
              label="Correo"
              type="email"
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
            />
            <TextField
              {...register('phone')}
              label="Teléfono (opcional)"
              error={Boolean(errors.phone)}
              helperText={errors.phone?.message}
            />
            <TextField
              {...register('role')}
              select
              label="Rol"
              defaultValue={user?.role ?? 'REQUESTER'}
              error={Boolean(errors.role)}
              helperText={
                errors.role?.message ??
                'Manejar no es un rol: la licencia se registra en Conductores.'
              }
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            {!isEdit ? (
              <TextField
                {...register('password')}
                label="Contraseña inicial"
                type="password"
                autoComplete="new-password"
                error={Boolean(errors.password)}
                helperText={
                  errors.password?.message ?? 'Compártela con la persona; podrá cambiarla.'
                }
              />
            ) : null}
            <FormError message={error} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <LoadingButton type="submit" variant="contained" loading={mutation.isPending}>
            {isEdit ? 'Guardar cambios' : 'Crear usuario'}
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
