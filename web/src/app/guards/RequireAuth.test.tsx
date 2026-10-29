import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useAuthStore } from '@/app/stores/auth.store';
import { RequireAuth } from './RequireAuth';

function renderAt(status: 'checking' | 'authenticated' | 'anonymous') {
  useAuthStore.setState({ status, accessToken: status === 'authenticated' ? 't' : null });
  render(
    <MemoryRouter initialEntries={['/solicitudes']}>
      <Routes>
        <Route path="/login" element={<p>Pantalla de ingreso</p>} />
        <Route element={<RequireAuth />}>
          <Route path="/solicitudes" element={<p>Bandeja</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

/** Al recargar, el panel espera a recuperar la sesión antes de decidir (ADR 0003). */
describe('RequireAuth', () => {
  it('mientras recupera la sesion muestra una espera, no la pantalla de ingreso', () => {
    renderAt('checking');
    expect(screen.getByLabelText('Recuperando la sesión')).toBeInTheDocument();
    expect(screen.queryByText('Pantalla de ingreso')).toBeNull();
  });

  it('con sesion muestra la ruta', () => {
    renderAt('authenticated');
    expect(screen.getByText('Bandeja')).toBeInTheDocument();
  });

  it('sin sesion manda a ingresar', () => {
    renderAt('anonymous');
    expect(screen.getByText('Pantalla de ingreso')).toBeInTheDocument();
  });
});
