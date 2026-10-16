import { forwardRef } from 'react';
import MuiButton, { type ButtonProps as MuiButtonProps } from '@mui/material/Button';
import { LoadingButton } from './LoadingButton';

export type ButtonProps = MuiButtonProps;

/**
 * Boton del design system.
 *
 * Envuelve a MUI y añade el estado de carga, para que ninguna vista tenga que
 * inventarse el patron de "deshabilitado mientras guarda".
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { loading = false, disabled, children, type = 'button', ...props },
  ref,
) {
  if (loading) {
    return (
      <LoadingButton ref={ref} type={type} loadingPosition="start" loading disabled {...props}>
        {children}
      </LoadingButton>
    );
  }
  return (
    <MuiButton ref={ref} type={type} disabled={disabled} {...props}>
      {children}
    </MuiButton>
  );
});
