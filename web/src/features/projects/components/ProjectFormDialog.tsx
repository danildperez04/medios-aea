import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/app/services/api';
import { FormError, LoadingButton, TextField } from '@/design-system/ui';
import { projectSchema } from '../schemas/project.schema';
import { useSaveProject, type Project, type ProjectInput } from '../services/projects.service';

export interface ProjectFormDialogProps {
  open: boolean;
  project: Project | null;
  onClose: () => void;
}

/** Alta y edición de proyectos (HU-03). */
export function ProjectFormDialog({ open, project, onClose }: ProjectFormDialogProps) {
  const save = useSaveProject();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: { code: '', name: '' },
  });

  useEffect(() => {
    if (!open) return;
    save.reset();
    reset(project ? { code: project.code, name: project.name } : { code: '', name: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir
  }, [open, project]);

  const onSubmit = handleSubmit(async (input) => {
    try {
      await save.mutateAsync({ id: project?.id, input });
      onClose();
    } catch {
      // Se muestra con save.error.
    }
  });

  return (
    <Dialog open={open} onClose={save.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={onSubmit} noValidate>
        <DialogTitle>{project ? 'Editar proyecto' : 'Nuevo proyecto'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              {...register('code')}
              label="Código"
              placeholder="PRY-AGUA-2026"
              autoFocus
              error={Boolean(errors.code)}
              helperText={errors.code?.message ?? 'Se guarda en mayúsculas.'}
            />
            <TextField
              {...register('name')}
              label="Nombre"
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
            />
            <FormError message={save.error instanceof ApiError ? save.error.message : null} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={save.isPending}>
            Cancelar
          </Button>
          <LoadingButton type="submit" variant="contained" loading={save.isPending}>
            {project ? 'Guardar cambios' : 'Crear proyecto'}
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
