import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Typography,
  Divider,
  ListItemIcon,
  ListItemText,
  Box,
  Chip,
} from '@mui/material';
import {
  AccountCircle as ProfileIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { User } from '../../types';

interface UserMenuProps {
  user: User | null;
}

export const UserMenu: React.FC<UserMenuProps> = ({ user }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    navigate('/profile');
    handleMenuClose();
  };

  const handleSettings = () => {
    navigate('/settings');
    handleMenuClose();
  };

  const handleHelp = () => {
    navigate('/help');
    handleMenuClose();
  };

  const handleLogout = () => {
    dispatch(logout());
    handleMenuClose();
  };

  if (!user) {
    return null;
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getPrimaryRole = () => {
    if (!user.roles || user.roles.length === 0) return 'User';
    
    const roleLabels: Record<string, string> = {
      admin: 'Administrator',
      security_manager: 'Security Manager',
      operations_manager: 'Operations Manager',
      financial_analyst: 'Financial Analyst',
      operator: 'Operator',
    };

    return roleLabels[user.roles[0]] || user.roles[0];
  };

  const getRoleColor = (role: string) => {
    const roleColors: Record<string, 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'> = {
      admin: 'error',
      security_manager: 'warning',
      operations_manager: 'info',
      financial_analyst: 'success',
      operator: 'primary',
    };

    return roleColors[role] || 'primary';
  };

  return (
    <>
      <IconButton
        size="large"
        edge="end"
        aria-label="account of current user"
        aria-controls="user-menu"
        aria-haspopup="true"
        onClick={handleMenuOpen}
        color="inherit"
        sx={{ ml: 1 }}
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: 'primary.main',
            fontSize: '0.875rem',
          }}
        >
          {getInitials(user.firstName, user.lastName)}
        </Avatar>
      </IconButton>

      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            minWidth: 280,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* User Info Header */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.main',
                mr: 1.5,
              }}
            >
              {getInitials(user.firstName, user.lastName)}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {user.firstName} {user.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                {user.email}
              </Typography>
            </Box>
          </Box>
          
          {/* Roles */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {user.roles?.map((role) => (
              <Chip
                key={role}
                label={role.replace('_', ' ')}
                size="small"
                color={getRoleColor(role)}
                variant="outlined"
                sx={{ fontSize: '0.75rem', height: 20 }}
              />
            ))}
          </Box>
        </Box>

        {/* Menu Items */}
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <ProfileIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">Profile & Preferences</Typography>
          </ListItemText>
        </MenuItem>

        <MenuItem onClick={handleSettings}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">Settings</Typography>
          </ListItemText>
        </MenuItem>

        {user.roles?.includes('admin') && (
          <MenuItem onClick={() => navigate('/admin')}>
            <ListItemIcon>
              <AdminIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              <Typography variant="body2">Administration</Typography>
            </ListItemText>
          </MenuItem>
        )}

        <Divider />

        <MenuItem onClick={handleHelp}>
          <ListItemIcon>
            <HelpIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">Help & Support</Typography>
          </ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">Sign Out</Typography>
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};