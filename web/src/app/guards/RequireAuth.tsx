import { Box, CircularProgress } from '@mui/material';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/app/stores/auth.store';
import { AppLayout } from '@/design-system/layout/AppLayout';

/**
 * Protege las rutas privadas.
 *
 * Mientras se pregunta a la API si hay sesión (al abrir o recargar), muestra una
 * espera en lugar de mandar a /login. Sin sesión, manda a /login y recuerda de donde
 * venia el usuario, para devolverlo ahi tras autenticarse.
 */
export function RequireAuth() {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  if (status === 'checking') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress aria-label="Recuperando la sesión" />
      </Box>
    );
  }
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/**
 * Protege las rutas exclusivas del ADMIN (RF-02).
 *
 * No sustituye la validacion del servidor: solo evita mostrar una pantalla
 * que el backend va a rechazar con 403.
 */
export function RequireAdmin() {
  const role = useAuthStore((state) => state.user?.role);
  if (role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

/** Envoltura de las rutas privadas con el layout de la aplicacion. */
export function PrivateLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
