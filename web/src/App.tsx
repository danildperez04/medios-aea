import { BrowserRouter } from 'react-router-dom';
import { AppProviders } from './app/providers';
import { AppRouter } from './app/AppRouter';

export function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </BrowserRouter>
  );
}
