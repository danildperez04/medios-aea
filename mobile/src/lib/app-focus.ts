import { focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * En React Native, React Query no sabe cuándo la app vuelve al primer plano: en el
 * navegador lo deduce del foco de la ventana, aquí hay que decírselo con `AppState`.
 *
 * Así, al volver a la app se repiten las consultas vencidas, entre ellas el perfil:
 * si la coordinación cerró las sesiones de la persona o venció su sesión, la app se
 * entera en ese momento y vuelve al inicio de sesión (HU-28, HU-29).
 *
 * Devuelve la función que deja de escuchar.
 */
export function syncFocusWithAppState(): () => void {
  const onChange = (status: AppStateStatus) => focusManager.setFocused(status === 'active');
  const subscription = AppState.addEventListener('change', onChange);
  return () => subscription.remove();
}
