import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { useState } from 'react';
import { ApiError } from '@/app/services/api';
import { FormError, LoadingButton, TextField } from '@/design-system/ui';
import { useRejectReservation, type Reservation } from '../services/reservations.service';

/** Mismos límites que `RejectReservationDto` en la API. */
const MIN = 5;
const MAX = 300;

export interface RejectDialogProps {
  reservation: Reservation | null;
  onClose: () => void;
}

/**
 * Rechazar una solicitud con motivo (HU-12). El motivo es obligatorio porque lo
 * recibe quien pidió en su aviso. Se monta de nuevo por cada solicitud (`key`).
 */
export function RejectDialog({ reservation, onClose }: RejectDialogProps) {
  const reject = useRejectReservation();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  const length = reason.trim().length;
  const invalid = length < MIN || length > MAX;

  const onReject = async () => {
    setTouched(true);
    if (!reservation || invalid) return;
    try {
      await reject.mutateAsync({ id: reservation.id, reason: reason.trim() });
      onClose();
    } catch {
      // Se muestra en el diálogo.
    }
  };

  return (
    <Dialog
      open={reservation !== null}
      onClose={reject.isPending ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Rechazar {reservation?.code}</DialogTitle>
      <DialogContent>
        {reservation ? (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Motivo"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              onBlur={() => setTouched(true)}
              multiline
              minRows={3}
              slotProps={{ htmlInput: { maxLength: MAX } }}
              error={touched && invalid}
              helperText={
                touched && length < MIN
                  ? `Explica el motivo con al menos ${MIN} caracteres.`
                  : `${reservation.requester.fullName} lo recibirá en su aviso (${length}/${MAX}).`
              }
            />
            <FormError message={reject.error instanceof ApiError ? reject.error.message : null} />
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={reject.isPending}>
          Volver
        </Button>
        <LoadingButton
          variant="contained"
          color="error"
          loading={reject.isPending}
          onClick={onReject}
        >
          Rechazar
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
