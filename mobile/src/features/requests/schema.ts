import { z } from 'zod';
import { managuaInstant } from '@/lib/managua';

const dateKey = /^\d{4}-\d{2}-\d{2}$/;
const clockTime = /^\d{2}:\d{2}$/;

/**
 * Formulario de una solicitud desde la app (HU-17). Mismas reglas que la API
 * (`CreateReservationDto` y `requestWindowError`), para avisar antes de enviar.
 */
export function newRequestSchema(now: () => Date = () => new Date()) {
  return z
    .object({
      projectId: z.string().min(1, 'Elige el proyecto'),
      purpose: z
        .string()
        .trim()
        .min(5, 'Describe para qué es, con al menos 5 caracteres')
        .max(300, 'El propósito no puede pasar de 300 caracteres'),
      destination: z
        .string()
        .trim()
        .min(3, 'Indica el destino')
        .max(200, 'El destino no puede pasar de 200 caracteres'),
      passengers: z
        .number({ message: 'Indica cuántas personas viajan' })
        .int()
        .min(1, 'Debe viajar al menos 1 persona')
        .max(60, 'No se admiten más de 60 personas'),
      date: z.string().regex(dateKey),
      startTime: z.string().regex(clockTime),
      endTime: z.string().regex(clockTime),
      driverId: z.string().min(1, 'Elige quién conduce'),
    })
    .superRefine((value, context) => {
      const start = managuaInstant(value.date, value.startTime);
      const end = managuaInstant(value.date, value.endTime);
      if (!(end > start)) {
        context.addIssue({
          code: 'custom',
          path: ['endTime'],
          message: 'La hora de regreso debe ser después de la de salida',
        });
      } else if (start < now()) {
        context.addIssue({
          code: 'custom',
          path: ['startTime'],
          message: 'La salida no puede ser en el pasado',
        });
      }
    });
}

export type NewRequestInput = z.infer<ReturnType<typeof newRequestSchema>>;
