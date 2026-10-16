import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { FormError } from './FormError';
import { LoadingButton } from './LoadingButton';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  error?: string | null;
  /** Acción destructiva (rojo) o neutra (color primario). */
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Confirmación de una acción con consecuencias (desactivar, rechazar, cancelar). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  loading = false,
  error,
  destructive = true,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: error ? 2 : 0 }}>
          {message}
        </Typography>
        <FormError message={error} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <LoadingButton
          variant="contained"
          color={destructive ? 'error' : 'primary'}
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
