/**
 * Expo Router convierte en pantalla cada archivo de `src/app/`. Una prueba ahí
 * entra al bundle con Testing Library, que necesita módulos de Node (`console`),
 * y la app no compila en el teléfono. Las pruebas de pantallas van en `src/__tests__/`.
 *
 * Sin `@types/node` (chocaría con los tipos globales de React Native): `fs` llega
 * con `jest.requireActual` y la ruta, de la prueba en curso.
 */
const fs = jest.requireActual<{
  readdirSync(dir: string, options: { recursive: true }): string[];
}>('node:fs');

describe('src/app', () => {
  it('no contiene pruebas', () => {
    const appDir = (expect.getState().testPath ?? '').replace(/__tests__[/\\][^/\\]+$/, 'app');
    const tests = fs
      .readdirSync(appDir, { recursive: true })
      .filter((file) => /\.(test|spec)\.[jt]sx?$/.test(file));
    expect(tests).toEqual([]);
  });
});
