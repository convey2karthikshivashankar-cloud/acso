import React from 'react';
import {
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
} from '@mui/material';
import {
  LightMode,
  DarkMode,
  SettingsBrightness,
  Check,
} from '@mui/icons-material';
import { useTheme } from './ThemeProvider';
import { ThemeMode } from '../../theme';

interface ThemeToggleProps {
  variant?: 'icon' | 'menu';
  size?: 'small' | 'medium' | 'large';
}

const themeOptions: Array<{
  mode: ThemeMode;
  label: string;
  icon: React.ReactElement;
  description: string;
}> = [
  {
    mode: 'light',
    label: 'Light',
    icon: <LightMode />,
    description: 'Light theme',
  },
  {
    mode: 'dark',
    label: 'Dark',
    icon: <DarkMode />,
    description: 'Dark theme',
  },
  {
    mode: 'auto',
    label: 'Auto',
    icon: <SettingsBrightness />,
    description: 'Follow system preference',
  },
];

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = 'icon',
  size = 'medium' 
}) => {
  const { themeMode, setThemeMode, toggleTheme } = useTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (variant === 'icon') {
      toggleTheme();
    } else {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleThemeSelect = (mode: ThemeMode) => {
    setThemeMode(mode);
    handleClose();
  };

  const getCurrentIcon = () => {
    const option = themeOptions.find(opt => opt.mode === themeMode);
    return option?.icon || <SettingsBrightness />;
  };

  const getCurrentLabel = () => {
    const option = themeOptions.find(opt => opt.mode === themeMode);
    return option?.label || 'Theme';
  };

  if (variant === 'icon') {
    return (
      <Tooltip title={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} theme`}>
        <IconButton
          onClick={handleClick}
          size={size}
          color="inherit"
          aria-label="Toggle theme"
        >
          {getCurrentIcon()}
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <>
      <Tooltip title="Change theme">
        <IconButton
          onClick={handleClick}
          size={size}
          color="inherit"
          aria-label="Theme options"
          aria-controls={open ? 'theme-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          {getCurrentIcon()}
        </IconButton>
      </Tooltip>
      <Menu
        id="theme-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'theme-button',
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {themeOptions.map((option) => (
          <MenuItem
            key={option.mode}
            onClick={() => handleThemeSelect(option.mode)}
            selected={themeMode === option.mode}
          >
            <ListItemIcon>
              {option.icon}
            </ListItemIcon>
            <ListItemText 
              primary={option.label}
              secondary={option.description}
            />
            {themeMode === option.mode && (
              <Box sx={{ ml: 2 }}>
                <Check fontSize="small" color="primary" />
              </Box>
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};