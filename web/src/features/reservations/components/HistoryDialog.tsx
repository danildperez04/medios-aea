import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { ApiError } from '@/app/services/api';
import { FormError } from '@/design-system/ui';
import { brand } from '@/design-system/theme/theme';
import { formatDateTime } from '@/shared/lib/format';
import {
  useReservationHistory,
  type Reservation,
  type ReservationHistoryEntry,
} from '../services/reservations.service';

const ACTION_LABEL: Record<ReservationHistoryEntry['action'], string> = {
  APPROVE: 'Aprobó',
  REJECT: 'Rechazó',
  CANCEL: 'Canceló',
  REASSIGN: 'Reasignó',
  COMPLETE: 'Completó',
};

export interface HistoryDialogProps {
  reservation: Reservation | null;
  onClose: () => void;
}

/**
 * Historial de decisiones de una solicitud (HU-15, RF-17): quién la aprobó, rechazó,
 * canceló o reasignó, y cuándo. Solo lectura; lo arma la API desde la auditoría.
 */
export function HistoryDialog({ reservation, onClose }: HistoryDialogProps) {
  const history = useReservationHistory(reservation);
  const entries = history.data ?? [];

  return (
    <Dialog open={reservation !== null} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Historial de {reservation?.code}</DialogTitle>
      <DialogContent>
        {reservation ? (
          <>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {reservation.destination} · pedida por {reservation.requester.fullName} el{' '}
              {formatDateTime(reservation.createdAt)}
            </Typography>
            <FormError message={history.error instanceof ApiError ? history.error.message : null} />
            {history.isLoading ? (
              <Typography color="text.secondary">Cargando el historial…</Typography>
            ) : history.isSuccess && entries.length === 0 ? (
              <Typography>Todavía nadie ha decidido esta solicitud.</Typography>
            ) : (
              <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                {entries.map((entry) => (
                  <Box
                    component="li"
                    key={entry.id}
                    sx={{ py: 1.5, borderTop: `1px solid ${brand.linea}` }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        columnGap: 2,
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                      }}
                    >
                      <Typography sx={{ fontWeight: 600 }}>
                        {ACTION_LABEL[entry.action]}{' '}
                        {entry.actor?.fullName ?? 'una cuenta eliminada'}
                      </Typography>
                      <Typography
                        component="time"
                        dateTime={entry.at}
                        variant="body2"
                        color="text.secondary"
                        className="tabular"
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        {formatDateTime(entry.at)}
                      </Typography>
                    </Box>
                    {entry.detail ? (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {entry.detail}
                      </Typography>
                    ) : null}
                  </Box>
                ))}
              </Box>
            )}
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
