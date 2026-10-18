import { z } from 'zod';

/** Mismas reglas que la API (api/src/modules/resources/dto/create-vehicle.dto.ts). */
export const vehicleSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(120),
  plate: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9][A-Z0-9 -]{2,18}[A-Z0-9]$/,
      'La placa solo admite letras, números, espacios y guiones',
    ),
  brand: z.string().trim().min(2, 'La marca debe tener al menos 2 caracteres').max(60),
  model: z.string().trim().min(1, 'El modelo es obligatorio').max(60),
  year: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d{4}$/.test(v) && +v >= 1980 && +v <= 2100), 'Año no válido'),
  passengerCapacity: z.coerce
    .number({ message: 'Escribe un número' })
    .int('Debe ser un número entero')
    .min(1, 'Al menos 1 pasajero')
    .max(60, 'No más de 60 pasajeros'),
  fuelType: z.enum(['GASOLINE', 'DIESEL']),
  currentOdometer: z.coerce
    .number({ message: 'Escribe un número' })
    .int('Debe ser un número entero')
    .min(0, 'No puede ser negativo'),
  notes: z.string().trim().max(500, 'No más de 500 caracteres'),
});

export type VehicleForm = z.input<typeof vehicleSchema>;
export type VehicleFormOutput = z.output<typeof vehicleSchema>;

export const blackoutSchema = z
  .object({
    startsAt: z.string().min(1, 'Indica cuándo empieza'),
    endsAt: z.string().min(1, 'Indica cuándo termina'),
    reason: z.enum(['MAINTENANCE', 'ADMINISTRATIVE', 'OTHER']),
    description: z.string().trim().max(300, 'No más de 300 caracteres'),
  })
  .refine((data) => !data.startsAt || !data.endsAt || data.endsAt > data.startsAt, {
    message: 'El fin debe ser posterior al inicio',
    path: ['endsAt'],
  });

export type BlackoutForm = z.infer<typeof blackoutSchema>;

export const FUEL_LABELS = { GASOLINE: 'Gasolina', DIESEL: 'Diésel' } as const;
export const STATUS_LABELS = {
  AVAILABLE: 'Disponible',
  MAINTENANCE: 'En mantenimiento',
  INACTIVE: 'Dado de baja',
} as const;
export const BLACKOUT_LABELS = {
  MAINTENANCE: 'Mantenimiento',
  ADMINISTRATIVE: 'Uso administrativo',
  OTHER: 'Otro motivo',
} as const;
