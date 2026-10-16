import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  BarChart3,
  CalendarDays,
  Car,
  ClipboardList,
  FolderKanban,
  IdCard,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Route,
  Users,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useAuthStore } from '@/app/stores/auth.store';
import { ChangePasswordDialog } from '@/features/auth/components/ChangePasswordDialog';

/** Ancho del menu lateral, fijo para que las tablas no se recalculen. */
const DRAWER_WIDTH = 248;

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
}

/**
 * Menu del panel. Todo el panel es de la coordinacion (ADMIN); el server
 * valida el rol en cada endpoint, ocultar opciones no es seguridad.
 */
const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', to: '/', icon: LayoutDashboard },
  { label: 'Solicitudes', to: '/solicitudes', icon: ClipboardList },
  { label: 'Calendario', to: '/calendario', icon: CalendarDays },
  { label: 'Viajes', to: '/viajes', icon: Route },
  { label: 'Vehículos', to: '/vehiculos', icon: Car },
  { label: 'Conductores', to: '/conductores', icon: IdCard },
  { label: 'Proyectos', to: '/proyectos', icon: FolderKanban },
  { label: 'Usuarios', to: '/usuarios', icon: Users },
  { label: 'Reportes', to: '/reportes', icon: BarChart3 },
];

export interface AppLayoutProps {
  children?: ReactNode;
}

/**
 * Layout principal con menu lateral, plegable en pantallas angostas.
 */
export function AppLayout({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const { user, clearSession } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  const navigation = (
    <Box sx={{ overflowY: 'auto' }}>
      <Stack direction="row" spacing={1.5} sx={{ px: 2, py: 2, alignItems: 'center' }}>
        <Car size={26} style={{ color: '#1f5f7a' }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Medios AeA
        </Typography>
      </Stack>
      <Divider />
      <List sx={{ py: 1 }}>
        {NAV_ITEMS.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setMobileOpen(false)}
            sx={{
              mx: 1,
              borderRadius: 1.5,
              '&.active': { bgcolor: 'primary.main', color: 'primary.contrastText' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>
              <item.icon size={19} />
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              slotProps={{ primary: { sx: { fontWeight: 600 } } }}
            />
          </ListItemButton>
        ))}
      </List>
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
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </IconButton>
          <Typography variant="body1" sx={{ fontWeight: 600, flexGrow: 1 }} noWrap>
            {user ? `Hola, ${user.fullName}` : 'Medios AeA'}
          </Typography>
          <Tooltip title="Cambiar contraseña">
            <IconButton onClick={() => setPasswordOpen(true)} aria-label="Cambiar contraseña">
              <KeyRound size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cerrar sesion">
            <Button color="inherit" startIcon={<LogOut size={18} />} onClick={handleLogout}>
              Salir
            </Button>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
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
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {navigation}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          p: { xs: 2, md: 3 },
          pt: { xs: 10, md: 11 },
        }}
      >
        {children ?? <Outlet />}
      </Box>

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </Box>
  );
}
