import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { KeyRound, LogOut, Menu } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useAuthStore } from '@/app/stores/auth.store';
import { useLogout } from '@/features/auth/services/auth.service';
import { BrandLockup } from '@/design-system/ui';
import { brand } from '@/design-system/theme/theme';
import { ChangePasswordDialog } from '@/features/auth/components/ChangePasswordDialog';
import { usePendingCount } from '@/features/reservations/services/reservations.service';

/** Ancho del menú lateral, fijo para que las tablas no se recalculen. */
const DRAWER_WIDTH = 240;

interface NavGroup {
  label: string;
  items: { label: string; to: string }[];
}

/**
 * Menú agrupado por tarea, no por entidad. "Medios" agrupa todo lo que se presta
 * (hoy vehículos; mañana equipos), así que el menú crece sin reorganizarse.
 * Sin íconos: el manual de marca los reserva para cuando aportan contexto.
 */
const NAV: NavGroup[] = [
  {
    label: 'Operación',
    items: [
      { label: 'Hoy', to: '/' },
      { label: 'Solicitudes', to: '/solicitudes' },
      { label: 'Agenda', to: '/agenda' },
      { label: 'Viajes', to: '/viajes' },
    ],
  },
  {
    label: 'Medios',
    items: [
      { label: 'Vehículos', to: '/vehiculos' },
      { label: 'Conductores', to: '/conductores' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Proyectos', to: '/proyectos' },
      { label: 'Usuarios', to: '/usuarios' },
      { label: 'Reportes', to: '/reportes' },
    ],
  },
];

export interface AppLayoutProps {
  children?: ReactNode;
}

/** Layout del panel: menú lateral (plegable en pantallas angostas) y barra superior. */
export function AppLayout({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const navigate = useNavigate();
  const pending = usePendingCount(user?.role === 'ADMIN');
  /** Contadores junto al nombre de una sección: lo que espera acción. */
  const counts: Record<string, number | undefined> = { '/solicitudes': pending.data };

  // Revoca la sesión en la API; aunque falle la red, la sesión local se cierra igual.
  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => navigate('/login', { replace: true }),
    });
  };

  const navigation = (
    <Box component="nav" aria-label="Secciones" sx={{ overflowY: 'auto', pb: 3 }}>
      <Box sx={{ px: 2.5, pt: 2.5, pb: 3 }}>
        <BrandLockup />
      </Box>
      {NAV.map((group) => (
        <Box key={group.label} sx={{ mb: 2.5 }}>
          <Typography
            component="h2"
            sx={{ px: 2.5, mb: 0.5, fontSize: '0.8rem', color: 'text.secondary', fontWeight: 400 }}
          >
            {group.label}
          </Typography>
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {group.items.map((item) => (
              <li key={item.to}>
                <Box
                  component={NavLink}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  sx={{
                    display: 'block',
                    px: 2.5,
                    py: 0.875,
                    color: 'text.primary',
                    textDecoration: 'none',
                    fontSize: '0.975rem',
                    borderLeft: '4px solid transparent',
                    '&:hover': { bgcolor: brand.crema },
                    '&:focus-visible': {
                      outline: `3px solid ${brand.turquesaFuerte}`,
                      outlineOffset: -3,
                    },
                    '&.active': {
                      borderLeftColor: brand.naranja,
                      bgcolor: brand.crema,
                      fontWeight: 600,
                    },
                  }}
                >
                  {item.label}
                  {counts[item.to] ? (
                    <Box
                      component="span"
                      className="tabular"
                      aria-label={`, ${counts[item.to]} por decidir`}
                      sx={{
                        ml: 1,
                        px: 0.75,
                        borderRadius: '3px',
                        bgcolor: brand.amarillo,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}
                    >
                      {counts[item.to]}
                    </Box>
                  ) : null}
                </Box>
              </li>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: 'none' } }}
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </IconButton>
          <Typography sx={{ flexGrow: 1, minWidth: 0 }} noWrap>
            {user?.fullName}
          </Typography>
          <Tooltip title="Cambiar contraseña">
            <IconButton onClick={() => setPasswordOpen(true)} aria-label="Cambiar contraseña">
              <KeyRound size={18} />
            </IconButton>
          </Tooltip>
          <Button startIcon={<LogOut size={18} />} onClick={handleLogout}>
            Salir
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {navigation}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRightColor: 'divider',
            },
          }}
        >
          {navigation}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          px: { xs: 2, md: 4 },
          pb: 6,
          pt: { xs: 10, md: 12 },
        }}
      >
        <Box sx={{ maxWidth: 1180 }}>{children ?? <Outlet />}</Box>
      </Box>

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </Box>
  );
}
