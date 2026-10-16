import { z } from 'zod';

/** Mismas reglas que la API (api/src/modules/projects/dto/project.dto.ts). */
export const projectSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(30, 'El código no puede exceder 30 caracteres')
    .regex(/^[A-Z0-9][A-Z0-9-]*$/, 'El código solo admite letras, números y guiones'),
  name: z
    .string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(160, 'El nombre no puede exceder 160 caracteres'),
});
