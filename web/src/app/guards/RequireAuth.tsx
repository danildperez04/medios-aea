import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/app/stores/auth.store';
import { AppLayout } from '@/design-system/layout/AppLayout';

/**
 * Protege las rutas privadas.
 *
 * Sin token, manda a /login y recuerda de donde venia el usuario, para
 * devolverlo ahi tras autenticarse.
 */
export function RequireAuth() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const location = useLocation();

  if (!accessToken) {
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
