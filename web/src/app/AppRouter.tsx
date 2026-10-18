import { Navigate, Route, Routes } from 'react-router-dom';
import { PrivateLayout, RequireAdmin, RequireAuth } from './guards/RequireAuth';
import { LoginView } from '@/features/auth/views/LoginView';
import { DashboardView } from '@/features/dashboard/views/DashboardView';
import { NotFoundView } from './views/NotFoundView';
import { ComingSoonView } from './views/ComingSoonView';
import { RequestsView } from '@/features/reservations/views/RequestsView';
import { DriversView } from '@/features/drivers/views/DriversView';
import { VehiclesView } from '@/features/vehicles/views/VehiclesView';
import { ProjectsView } from '@/features/projects/views/ProjectsView';
import { UsersView } from '@/features/users/views/UsersView';

/**
 * Rutas del panel web. Todo el panel es exclusivo del ADMIN (RF-02).
 *
 * Las vistas de cada módulo se registran a medida que se implementan; mientras
 * tanto la ruta explica qué se podrá hacer ahí, sin presentar una pantalla vacía
 * como si fuera funcional.
 */
export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />

      <Route element={<RequireAuth />}>
        <Route element={<RequireAdmin />}>
          <Route element={<PrivateLayout />}>
            <Route index element={<DashboardView />} />
            <Route path="solicitudes" element={<RequestsView />} />
            <Route
              path="agenda"
              element={
                <ComingSoonView
                  title="Agenda"
                  description="Aquí verás la semana completa de cada medio y podrás moverte entre días."
                />
              }
            />
            <Route path="calendario" element={<Navigate to="/agenda" replace />} />
            <Route
              path="viajes"
              element={
                <ComingSoonView
                  title="Viajes"
                  description="Aquí verás cada salida y llegada registrada por los conductores, con kilometraje y combustible."
                />
              }
            />
            <Route path="vehiculos" element={<VehiclesView />} />
            <Route path="conductores" element={<DriversView />} />
            <Route path="proyectos" element={<ProjectsView />} />
            <Route path="usuarios" element={<UsersView />} />
            <Route
              path="reportes"
              element={
                <ComingSoonView
                  title="Reportes"
                  description="Aquí verás el uso de los medios por proyecto y por mes, y podrás exportarlo."
                />
              }
            />
          </Route>
        </Route>
      </Route>

      <Route path="/404" element={<NotFoundView />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
