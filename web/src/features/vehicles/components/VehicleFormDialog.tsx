import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
} from '@mui/material';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ApiError } from '@/app/services/api';
import { FormError, LoadingButton, TextField } from '@/design-system/ui';
import {
  FUEL_LABELS,
  vehicleSchema,
  type VehicleForm,
  type VehicleFormOutput,
} from '../schemas/vehicle.schema';
import { useSaveVehicle, type Vehicle } from '../services/vehicles.service';

export interface VehicleFormDialogProps {
  open: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
}

const EMPTY: VehicleForm = {
  name: '',
  plate: '',
  brand: '',
  model: '',
  year: '',
  passengerCapacity: 4,
  fuelType: 'DIESEL',
  currentOdometer: 0,
  notes: '',
};

/** Alta y edición de vehículos (HU-05). */
export function VehicleFormDialog({ open, vehicle, onClose }: VehicleFormDialogProps) {
  const save = useSaveVehicle();
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<VehicleForm, unknown, VehicleFormOutput>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    save.reset();
    reset(
      vehicle
        ? {
            name: vehicle.name,
            plate: vehicle.plate,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year ? String(vehicle.year) : '',
            passengerCapacity: vehicle.passengerCapacity,
            fuelType: vehicle.fuelType,
            currentOdometer: vehicle.currentOdometer,
            notes: vehicle.notes ?? '',
          }
        : EMPTY,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir
  }, [open, vehicle]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync({
        id: vehicle?.id,
        input: {
          ...values,
          year: values.year ? Number(values.year) : null,
          notes: values.notes || null,
        },
      });
      onClose();
    } catch {
      // Se muestra con save.error.
    }
  });

  const fuelType = useWatch({ control, name: 'fuelType' });

  return (
    <Dialog open={open} onClose={save.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={onSubmit} noValidate>
        <DialogTitle>{vehicle ? `Editar ${vehicle.name}` : 'Nuevo vehículo'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 7 }}>
              <TextField
                {...register('name')}
                label="Nombre"
                placeholder="Hilux blanca"
                autoFocus
                error={Boolean(errors.name)}
                helperText={errors.name?.message ?? 'Como lo llama el equipo.'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                {...register('plate')}
                label="Placa"
                placeholder="M 123-456"
                error={Boolean(errors.plate)}
                helperText={errors.plate?.message}
                slotProps={{ htmlInput: { className: 'tabular' } }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                {...register('brand')}
                label="Marca"
                error={Boolean(errors.brand)}
                helperText={errors.brand?.message}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 5 }}>
              <TextField
                {...register('model')}
                label="Modelo"
                error={Boolean(errors.model)}
                helperText={errors.model?.message}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                {...register('year')}
                label="Año"
                inputMode="numeric"
                error={Boolean(errors.year)}
                helperText={errors.year?.message}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                {...register('passengerCapacity')}
                label="Pasajeros"
                type="number"
                error={Boolean(errors.passengerCapacity)}
                helperText={errors.passengerCapacity?.message ?? 'Sin contar al conductor.'}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                select
                label="Combustible"
                value={fuelType}
                onChange={(event) =>
                  setValue('fuelType', event.target.value as VehicleForm['fuelType'])
                }
              >
                {Object.entries(FUEL_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                {...register('currentOdometer')}
                label="Kilometraje"
                type="number"
                error={Boolean(errors.currentOdometer)}
                helperText={
                  errors.currentOdometer?.message ?? (vehicle ? 'Solo puede aumentar.' : undefined)
                }
              />
            </Grid>
            <Grid size={12}>
              <TextField
                {...register('notes')}
                label="Notas (opcional)"
                multiline
                minRows={2}
                error={Boolean(errors.notes)}
                helperText={errors.notes?.message}
              />
            </Grid>
            <Grid size={12}>
              <FormError message={save.error instanceof ApiError ? save.error.message : null} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={save.isPending}>
            Cancelar
          </Button>
          <LoadingButton type="submit" variant="contained" loading={save.isPending}>
            {vehicle ? 'Guardar cambios' : 'Registrar vehículo'}
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
