/// <reference types="vite/client" />

/** Variables de entorno disponibles en el cliente. */
interface ImportMetaEnv {
  /** URL base de la API, por ejemplo /api/v1 */
  readonly VITE_API_URL: string;
  /** Nombre visible de la aplicacion */
  readonly VITE_APP_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
