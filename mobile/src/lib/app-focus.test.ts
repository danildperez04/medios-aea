import { focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';
import { syncFocusWithAppState } from './app-focus';

describe('syncFocusWithAppState', () => {
  let listener: ((status: AppStateStatus) => void) | undefined;
  const remove = jest.fn();

  beforeEach(() => {
    remove.mockClear();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
      listener = handler as (status: AppStateStatus) => void;
      return { remove } as ReturnType<typeof AppState.addEventListener>;
    });
  });
  afterEach(() => focusManager.setFocused(undefined));

  it('marca la app como enfocada al volver al primer plano y no al irse', () => {
    syncFocusWithAppState();
    listener?.('background');
    expect(focusManager.isFocused()).toBe(false);
    listener?.('active');
    expect(focusManager.isFocused()).toBe(true);
  });

  it('deja de escuchar al desmontar', () => {
    const stop = syncFocusWithAppState();
    stop();
    expect(remove).toHaveBeenCalled();
  });
});
