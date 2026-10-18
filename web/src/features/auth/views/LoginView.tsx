import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Box, Stack, Typography } from '@mui/material';
import { BrandLockup, FormError, LoadingButton, TextField } from '@/design-system/ui';
import { brand } from '@/design-system/theme/theme';
import { useLogin } from '../services/auth.service';
import { loginSchema, type LoginInput } from '../schemas/auth.schema';
import { ApiError } from '@/app/services/api';

/**
 * Inicio de sesión del panel (RF-01).
 *
 * El panel naranja con la marca en negro lavado es la aplicación de color por
 * defecto del manual de Ayuda en Acción. El panel web es de la coordinación;
 * técnicos y conductores reciben la indicación de usar la app.
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
          'Este panel es para la coordinación logística. Para pedir un medio o registrar un viaje, usa la app en tu teléfono.',
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
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 5fr) minmax(0, 6fr)' },
        gridTemplateRows: { xs: 'auto 1fr', md: '1fr' },
      }}
    >
      <Box
        sx={{
          bgcolor: brand.naranja,
          color: brand.negroLavado,
          px: { xs: 3, md: 6 },
          py: { xs: 4, md: 6 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: { xs: 'flex-start', md: 'space-between' },
          gap: 3,
        }}
      >
        <BrandLockup size="lg" />
        <Typography
          sx={{ fontSize: { xs: '1rem', md: '1.2rem' }, maxWidth: '30ch', lineHeight: 1.45 }}
        >
          Solicitudes, agenda y viajes de los medios que el equipo usa en las comunidades.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          placeItems: { xs: 'start center', md: 'center' },
          px: 3,
          py: { xs: 4, md: 6 },
        }}
      >
        <Box component="form" onSubmit={onSubmit} noValidate sx={{ width: '100%', maxWidth: 380 }}>
          <Stack spacing={2.5}>
            <Typography variant="h4" component="h1">
              Iniciar sesión
            </Typography>
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

            <LoadingButton
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              loading={isSubmitting}
            >
              Entrar
            </LoadingButton>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
