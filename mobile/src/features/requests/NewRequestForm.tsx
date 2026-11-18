import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  clockTimeFromPicker,
  dateKeyFromPicker,
  formatClockTime,
  formatDateKey,
  managuaDateKey,
  managuaInstant,
  pickerValue,
} from '@/lib/managua';
import { colors, fonts, spacing, touchTarget, type } from '@/lib/theme';
import { useSession } from '@/store/session';
import {
  useAvailability,
  useCreateRequest,
  useDriverOptions,
  useProjects,
  type CreatedRequest,
} from './api';
import { AvailabilityNotice } from './AvailabilityNotice';
import { ChoiceList } from './ChoiceList';
import { PickerField } from './PickerField';
import { newRequestSchema, type NewRequestInput } from './schema';

interface Props {
  onCreated: (request: CreatedRequest) => void;
  /** Hora actual; solo las pruebas la fijan. */
  now?: () => Date;
}

/**
 * Nueva solicitud desde el teléfono (HU-17): para qué, a dónde, cuántas personas,
 * cuándo y quién conduce. Antes de enviar muestra cuántos vehículos están libres.
 */
export function NewRequestForm({ onCreated, now = () => new Date() }: Props) {
  const user = useSession((state) => state.user);
  const projects = useProjects();
  const drivers = useDriverOptions();
  const create = useCreateRequest();
  const schema = useMemo(() => newRequestSchema(now), [now]);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<NewRequestInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId: '',
      purpose: '',
      destination: '',
      passengers: 1,
      // Mañana de 8 a 12: lo más común, y nunca en el pasado.
      date: managuaDateKey(now(), 1),
      startTime: '08:00',
      endTime: '12:00',
      driverId: '',
    },
  });

  // Por defecto conduce quien solicita, si tiene licencia vigente (RN-15).
  const ownDriver = drivers.data?.find((driver) => driver.userId === user?.id);
  useEffect(() => {
    if (ownDriver && !getValues('driverId')) setValue('driverId', ownDriver.id);
  }, [ownDriver, getValues, setValue]);

  const [projectId, driverId, date, startTime, endTime, passengers] = useWatch({
    control,
    name: ['projectId', 'driverId', 'date', 'startTime', 'endTime', 'passengers'],
  });
  const validWindow = managuaInstant(date, endTime) > managuaInstant(date, startTime);
  const validPassengers = Number.isInteger(passengers) && passengers >= 1 && passengers <= 60;
  const availability = useAvailability(
    validWindow && validPassengers ? { date, startTime, endTime, passengers } : null,
  );

  const onSubmit = handleSubmit(async (values) => {
    try {
      onCreated(await create.mutateAsync(values));
    } catch {
      // El mensaje se muestra desde create.error.
    }
  });

  const today = pickerValue(managuaDateKey(now()));

  return (
    <View style={styles.form}>
      <ChoiceList
        label="Proyecto"
        empty={projects.isLoading ? 'Cargando proyectos…' : 'No hay proyectos activos.'}
        choices={(projects.data ?? []).map((project) => ({
          value: project.id,
          label: project.name,
          hint: project.code,
        }))}
        value={projectId}
        onChange={(value) => setValue('projectId', value, { shouldValidate: true })}
        error={errors.projectId?.message}
      />

      <Text style={styles.label}>¿Para qué?</Text>
      <Controller
        control={control}
        name="purpose"
        render={({ field }) => (
          <TextInput
            style={[styles.input, styles.multiline, errors.purpose && styles.inputError]}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            multiline
            placeholder="Taller de liderazgo juvenil"
            placeholderTextColor={colors.tintaSuave}
            accessibilityLabel="¿Para qué?"
          />
        )}
      />
      {errors.purpose ? <Text style={styles.error}>{errors.purpose.message}</Text> : null}

      <Text style={styles.label}>Destino</Text>
      <Controller
        control={control}
        name="destination"
        render={({ field }) => (
          <TextInput
            style={[styles.input, errors.destination && styles.inputError]}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder="Comunidad El Rosario, Totogalpa"
            placeholderTextColor={colors.tintaSuave}
            accessibilityLabel="Destino"
          />
        )}
      />
      {errors.destination ? <Text style={styles.error}>{errors.destination.message}</Text> : null}

      <Text style={styles.label}>Personas que viajan, sin contar a quien conduce</Text>
      <View style={styles.stepper}>
        <Pressable
          style={styles.stepButton}
          onPress={() => setValue('passengers', Math.max(1, passengers - 1))}
          disabled={passengers <= 1}
          accessibilityRole="button"
          accessibilityLabel="Una persona menos"
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue} accessibilityLabel={`${passengers} personas`}>
          {passengers}
        </Text>
        <Pressable
          style={styles.stepButton}
          onPress={() => setValue('passengers', Math.min(60, passengers + 1))}
          disabled={passengers >= 60}
          accessibilityRole="button"
          accessibilityLabel="Una persona más"
        >
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>

      <PickerField
        label="Día"
        mode="date"
        display={formatDateKey(date)}
        value={pickerValue(date)}
        minimumDate={today}
        onChange={(value) => setValue('date', dateKeyFromPicker(value), { shouldValidate: true })}
        error={errors.date?.message}
      />
      <View style={styles.row}>
        <View style={styles.half}>
          <PickerField
            label="Salida"
            mode="time"
            display={formatClockTime(startTime)}
            value={pickerValue(date, startTime)}
            onChange={(value) =>
              setValue('startTime', clockTimeFromPicker(value), { shouldValidate: true })
            }
            error={errors.startTime?.message}
          />
        </View>
        <View style={styles.half}>
          <PickerField
            label="Regreso"
            mode="time"
            display={formatClockTime(endTime)}
            value={pickerValue(date, endTime)}
            onChange={(value) =>
              setValue('endTime', clockTimeFromPicker(value), { shouldValidate: true })
            }
            error={errors.endTime?.message}
          />
        </View>
      </View>

      <AvailabilityNotice
        availability={availability.data}
        loading={availability.isFetching && !availability.data}
        error={availability.error ? availability.error.message : null}
        passengers={passengers}
      />

      <ChoiceList
        label="¿Quién conduce?"
        empty={
          drivers.isLoading
            ? 'Cargando…'
            : 'Nadie tiene licencia vigente registrada. Pide a la coordinación que la registre.'
        }
        choices={(drivers.data ?? []).map((driver) => ({
          value: driver.id,
          label: driver.userId === user?.id ? `Yo (${driver.fullName})` : driver.fullName,
        }))}
        value={driverId}
        onChange={(value) => setValue('driverId', value, { shouldValidate: true })}
        error={errors.driverId?.message}
      />

      {create.error ? (
        <View style={styles.alert} accessibilityRole="alert">
          <Text style={styles.alertText}>{create.error.message}</Text>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={onSubmit}
        disabled={create.isPending}
        accessibilityRole="button"
        accessibilityLabel="Enviar solicitud"
      >
        {create.isPending ? (
          <ActivityIndicator color={colors.negroLavado} />
        ) : (
          <Text style={styles.buttonText}>Enviar solicitud</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { paddingBottom: spacing.xl },
  label: {
    fontFamily: fonts.semibold,
    fontSize: type.small,
    color: colors.negroLavado,
    marginTop: spacing.md,
  },
  input: {
    minHeight: touchTarget,
    borderWidth: 1.5,
    borderColor: '#CFC5BB',
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: type.body,
    color: colors.negroLavado,
    marginTop: spacing.xs,
  },
  multiline: { minHeight: 88, paddingTop: spacing.sm, textAlignVertical: 'top' },
  inputError: { borderColor: colors.naranjaFuerte },
  error: {
    fontFamily: fonts.regular,
    color: colors.negroLavado,
    fontSize: type.small,
    marginTop: spacing.xs,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  stepButton: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CFC5BB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontFamily: fonts.semibold, fontSize: 24, color: colors.negroLavado },
  stepValue: {
    minWidth: 40,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: type.title,
    color: colors.negroLavado,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  alert: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.naranjaFuerte,
    backgroundColor: '#FDECEB',
    borderRadius: 6,
  },
  alertText: { fontFamily: fonts.regular, fontSize: type.small, color: colors.negroLavado },
  button: {
    minHeight: touchTarget + 4,
    backgroundColor: colors.naranja,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  buttonPressed: { backgroundColor: '#EF6E46' },
  buttonText: { fontFamily: fonts.semibold, fontSize: type.body, color: colors.negroLavado },
});
