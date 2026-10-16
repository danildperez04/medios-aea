import { forwardRef, type ReactNode } from 'react';
import MuiButton, { type ButtonProps } from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingPosition?: 'start' | 'end' | 'center';
  loadingIndicator?: ReactNode;
}

/** Boton con indicador de carga. La base de `Button` en modo `loading`. */
export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  function LoadingButton(
    {
      loading = false,
      loadingPosition = 'center',
      loadingIndicator = <CircularProgress size={20} color="inherit" />,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <MuiButton ref={ref} disabled={disabled || loading} {...props}>
        {loading && loadingPosition === 'start' ? <>{loadingIndicator}</> : null}
        {loading && loadingPosition === 'center' ? loadingIndicator : children}
        {loading && loadingPosition === 'end' ? <>{loadingIndicator}</> : null}
      </MuiButton>
    );
  },
);
