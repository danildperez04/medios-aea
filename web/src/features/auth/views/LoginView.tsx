import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { TextField } from '@/design-system/ui/TextField';
import { Button } from '@/design-system/ui/Button';
import { FormError } from '@/design-system/ui/FormError';
import { useLogin } from '../services/auth.service';
import { loginSchema, type LoginInput } from '../schemas/auth.schema';
import { ApiError } from '@/app/services/api';

/**
 * Pantalla de inicio de sesion (RF-01).
 *
 * El panel web es de la coordinacion logistica (ADMIN). Los tecnicos y
 * conductores usan la app movil; si entran aqui se les indica.
 */
export function LoginView() {
  const navigate = useNavigate();
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const session = await login.mutateAsync(values);
      if (session.user.role !== 'ADMIN') {
        setFormError(
          'El panel web es para la coordinación logística. Usa la app móvil para solicitar vehículos o registrar viajes.',
        );
        return;
      }
      navigate('/', { replace: true });
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'No se pudo iniciar sesión. Intenta de nuevo.',
      );
    }
  });

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'primary.dark',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent>
          <Stack spacing={3}>
            <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
              <Typography variant="h4" component="h1">
                Medios AeA
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gestión de vehículos y medios
              </Typography>
            </Stack>

            <Box component="form" onSubmit={onSubmit} noValidate>
              <Stack spacing={2}>
                <TextField
                  {...register('email')}
                  label="Correo"
                  type="email"
                  autoFocus
                  autoComplete="username"
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message}
                />
                <TextField
                  {...register('password')}
                  label="Contraseña"
                  type="password"
                  autoComplete="current-password"
                  error={Boolean(errors.password)}
                  helperText={errors.password?.message}
                />

                <FormError message={formError} />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Entrando…' : 'Entrar'}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
