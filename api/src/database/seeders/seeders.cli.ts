import { main } from './index.js';

main().catch((error: unknown) => {
  console.error(
    'Error al cargar los datos de ejemplo:',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
