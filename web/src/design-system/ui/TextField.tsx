import { forwardRef } from 'react';
import MuiTextField, { type TextFieldProps as MuiTextFieldProps } from '@mui/material/TextField';

/** Campo de texto con el tamano pequeno por defecto, para tablas densas. */
export const TextField = forwardRef<HTMLDivElement, MuiTextFieldProps>(function TextField(
  { size = 'small', ...props },
  ref,
) {
  return <MuiTextField ref={ref} size={size} fullWidth {...props} />;
});
