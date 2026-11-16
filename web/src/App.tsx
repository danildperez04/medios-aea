import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { restoreSession } from './app/services/session';
import { AppProviders } from './app/providers';
import { AppRouter } from './app/AppRouter';

export function App() {
  // Al abrir o recargar: el token no se guarda, se recupera con la cookie (ADR 0003).
  useEffect(() => {
    void restoreSession();
  }, []);

  return (
    <BrowserRouter>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </BrowserRouter>
  );
}
