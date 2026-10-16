import { Navigate, Route, Routes } from 'react-router-dom';
import { PrivateLayout, RequireAdmin, RequireAuth } from './guards/RequireAuth';
import { LoginView } from '@/features/auth/views/LoginView';
import { DashboardView } from '@/features/dashboard/views/DashboardView';
import { NotFoundView } from './views/NotFoundView';
import { ComingSoonView } from './views/ComingSoonView';

/**
 * Rutas del panel web. Todo el panel es exclusivo del ADMIN (RF-02).
 *
 * Las vistas de cada módulo se registran a medida que se implementan; mientras
 * tanto la ruta muestra en qué sprint llega, para no presentar una pantalla
 * vacía como si fuera funcional.
 */
export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />

      <Route element={<RequireAuth />}>
        <Route element={<RequireAdmin />}>
          <Route element={<PrivateLayout />}>
            <Route index element={<DashboardView />} />
            <Route path="solicitudes" element={<ComingSoonView title="Solicitudes" sprint={3} />} />
            <Route path="calendario" element={<ComingSoonView title="Calendario" sprint={3} />} />
            <Route path="viajes" element={<ComingSoonView title="Viajes" sprint={5} />} />
            <Route path="vehiculos" element={<ComingSoonView title="Vehículos" sprint={2} />} />
            <Route path="conductores" element={<ComingSoonView title="Conductores" sprint={2} />} />
            <Route path="proyectos" element={<ComingSoonView title="Proyectos" sprint={1} />} />
            <Route path="usuarios" element={<ComingSoonView title="Usuarios" sprint={1} />} />
            <Route path="reportes" element={<ComingSoonView title="Reportes" sprint={5} />} />
          </Route>
        </Route>
      </Route>

      <Route path="/404" element={<NotFoundView />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
