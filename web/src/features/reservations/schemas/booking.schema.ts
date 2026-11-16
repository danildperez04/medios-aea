import { z } from 'zod';

/**
 * Reserva directa desde el panel (HU-27). Mismas reglas que la API
 * (api/src/modules/reservations/dto/book-reservation.dto.ts); el horario en el
 * pasado, los choques y la licencia los valida la API.
 */
export const bookingSchema = z
  .object({
    requesterId: z.string().min(1, 'Elige para quién es la reserva'),
    projectId: z.string().min(1, 'Elige un proyecto'),
    destination: z
      .string()
      .trim()
      .min(3, 'El destino debe tener al menos 3 caracteres')
      .max(200, 'No más de 200 caracteres'),
    purpose: z
      .string()
      .trim()
      .min(5, 'Describe el propósito con al menos 5 caracteres')
      .max(300, 'No más de 300 caracteres'),
    passengers: z.coerce
      .number({ message: 'Escribe un número' })
      .int('Debe ser un número entero')
      .min(1, 'Debe viajar al menos 1 persona')
      .max(60, 'No más de 60 personas'),
    startsAt: z.string().min(1, 'Indica cuándo sale'),
    endsAt: z.string().min(1, 'Indica cuándo vuelve'),
    resourceId: z.string().min(1, 'Elige el medio'),
    driverId: z.string().min(1, 'Elige quién conduce'),
  })
  .refine((data) => !data.startsAt || !data.endsAt || data.endsAt > data.startsAt, {
    message: 'La vuelta debe ser posterior a la salida',
    path: ['endsAt'],
  });

export type BookingForm = z.input<typeof bookingSchema>;
export type BookingFormOutput = z.output<typeof bookingSchema>;
