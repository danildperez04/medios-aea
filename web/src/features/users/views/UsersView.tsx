import { Button, Chip, IconButton, MenuItem, Stack, Tooltip } from '@mui/material';
import { KeyRound, Pencil, Plus, UserCheck, UserX, Users } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '@/app/services/api';
import { useAuthStore, type UserRole } from '@/app/stores/auth.store';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  FormError,
  PageHeader,
  TextField,
  type DataTableColumn,
} from '@/design-system/ui';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { formatDateTime } from '@/shared/lib/format';
import { ResetPasswordDialog } from '../components/ResetPasswordDialog';
import { UserFormDialog } from '../components/UserFormDialog';
import { ROLE_LABELS } from '../schemas/user.schema';
import { useUpdateUser, useUsers, type User } from '../services/users.service';

type StatusFilter = 'active' | 'inactive' | 'all';

/** Gestión de usuarios (HU-02). */
export function UsersView() {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [status, setStatus] = useState<StatusFilter>('active');
  const debouncedSearch = useDebouncedValue(search);

  const [formUser, setFormUser] = useState<User | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toggleUser, setToggleUser] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);

  const users = useUsers({
    page,
    limit,
    search: debouncedSearch,
    role: role || undefined,
    isActive: status === 'all' ? undefined : status === 'active',
  });
  const update = useUpdateUser();

  const openForm = (user: User | null) => {
    setFormUser(user);
    setFormOpen(true);
  };

  const confirmToggle = async () => {
    if (!toggleUser) return;
    try {
      await update.mutateAsync({ id: toggleUser.id, input: { isActive: !toggleUser.isActive } });
      setToggleUser(null);
    } catch {
      // Se muestra en el diálogo.
    }
  };

  const columns: DataTableColumn<User>[] = [
    { key: 'name', header: 'Nombre', render: (u) => u.fullName },
    { key: 'email', header: 'Correo', render: (u) => u.email },
    { key: 'role', header: 'Rol', render: (u) => ROLE_LABELS[u.role] },
    {
      key: 'status',
      header: 'Estado',
      render: (u) =>
        u.isActive ? (
          <Chip size="small" color="success" label="Activo" />
        ) : (
          <Chip size="small" variant="outlined" label="Inactivo" />
        ),
    },
    { key: 'lastLogin', header: 'Último acceso', render: (u) => formatDateTime(u.lastLoginAt) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (u) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              onClick={() => openForm(u)}
              aria-label={`Editar ${u.fullName}`}
            >
              <Pencil size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Restablecer contraseña">
            <IconButton
              size="small"
              onClick={() => setPasswordUser(u)}
              aria-label={`Restablecer contraseña de ${u.fullName}`}
            >
              <KeyRound size={16} />
            </IconButton>
          </Tooltip>
          {u.id !== currentUserId ? (
            <Tooltip title={u.isActive ? 'Desactivar' : 'Reactivar'}>
              <IconButton
                size="small"
                onClick={() => {
                  update.reset();
                  setToggleUser(u);
                }}
                aria-label={`${u.isActive ? 'Desactivar' : 'Reactivar'} ${u.fullName}`}
              >
                {u.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Personal con acceso: coordinación, técnicos y conductores"
        actions={
          <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => openForm(null)}>
            Nuevo usuario
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Buscar por nombre o correo"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <TextField
          select
          label="Rol"
          value={role}
          onChange={(event) => {
            setRole(event.target.value as UserRole | '');
            setPage(1);
          }}
          sx={{ minWidth: 200 }}
          slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
        >
          <MenuItem value="">Todos</MenuItem>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Estado"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as StatusFilter);
            setPage(1);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="active">Activos</MenuItem>
          <MenuItem value="inactive">Inactivos</MenuItem>
          <MenuItem value="all">Todos</MenuItem>
        </TextField>
      </Stack>

      <FormError message={users.error instanceof ApiError ? users.error.message : null} />

      <DataTable
        columns={columns}
        rows={users.data?.data ?? []}
        getRowId={(u) => u.id}
        loading={users.isFetching}
        empty={
          <EmptyState
            icon={Users}
            title={search || role ? 'Ningún usuario coincide con el filtro' : 'Aún no hay usuarios'}
            description={
              search || role
                ? 'Prueba con otro nombre o rol.'
                : 'Crea el primero con “Nuevo usuario”.'
            }
          />
        }
        pagination={{
          page,
          limit,
          total: users.data?.total ?? 0,
          onPageChange: setPage,
          onLimitChange: (value) => {
            setLimit(value);
            setPage(1);
          },
        }}
      />

      <UserFormDialog open={formOpen} user={formUser} onClose={() => setFormOpen(false)} />
      <ResetPasswordDialog user={passwordUser} onClose={() => setPasswordUser(null)} />
      <ConfirmDialog
        open={toggleUser !== null}
        title={toggleUser?.isActive ? 'Desactivar usuario' : 'Reactivar usuario'}
        message={
          toggleUser?.isActive
            ? `${toggleUser.fullName} ya no podrá iniciar sesión. Su historial se conserva.`
            : `${toggleUser?.fullName ?? ''} podrá volver a iniciar sesión.`
        }
        confirmLabel={toggleUser?.isActive ? 'Desactivar' : 'Reactivar'}
        destructive={toggleUser?.isActive ?? true}
        loading={update.isPending}
        error={update.error instanceof ApiError ? update.error.message : null}
        onConfirm={confirmToggle}
        onClose={() => setToggleUser(null)}
      />
    </>
  );
}
