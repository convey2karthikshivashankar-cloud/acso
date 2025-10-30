import React from 'react';
import {
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme as useMuiTheme,
} from '@mui/material';
import {
  Brightness4,
  Brightness7,
  SettingsBrightness,
  Check,
} from '@mui/icons-material';
import { useTheme } from './ThemeProvider';
import { ThemeMode } from '../../theme';

interface ThemeToggleProps {
  variant?: 'icon' | 'menu';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'icon',
  size = 'medium',
  showLabel = false,
}) => {
  const { themeMode, setThemeMode } = useTheme();
  const muiTheme = useMuiTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (variant === 'menu') {
      setAnchorEl(event.currentTarget);
    } else {
      // Simple toggle between light and dark
      const newMode = themeMode === 'light' ? 'dark' : 'light';
      setThemeMode(newMode);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleModeSelect = (mode: ThemeMode) => {
    setThemeMode(mode);
    handleClose();
  };

  const getThemeIcon = (mode: ThemeMode) => {
    switch (mode) {
      case 'light':
        return <Brightness7 />;
      case 'dark':
        return <Brightness4 />;
      case 'auto':
        return <SettingsBrightness />;
      default:
        return <Brightness7 />;
    }
  };

  const getThemeLabel = (mode: ThemeMode) => {
    switch (mode) {
      case 'light':
        return 'Light Mode';
      case 'dark':
        return 'Dark Mode';
      case 'auto':
        return 'Auto Mode';
      default:
        return 'Light Mode';
    }
  };

  const getCurrentIcon = () => {
    if (variant === 'menu') {
      return <SettingsBrightness />;
    }
    return getThemeIcon(themeMode);
  };

  const getTooltipText = () => {
    if (variant === 'menu') {
      return 'Theme Settings';
    }
    return `Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`;
  };

  return (
    <>
      <Tooltip title={getTooltipText()}>
        <IconButton
          onClick={handleClick}
          size={size}
          color="inherit"
          sx={{
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'rotate(180deg)',
            },
          }}
        >
          {getCurrentIcon()}
        </IconButton>
      </Tooltip>

      {variant === 'menu' && (
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          PaperProps={{
            sx: {
              minWidth: 160,
              mt: 1,
            },
          }}
        >
          {(['light', 'dark', 'auto'] as ThemeMode[]).map((mode) => (
            <MenuItem
              key={mode}
              onClick={() => handleModeSelect(mode)}
              selected={themeMode === mode}
            >
              <ListItemIcon>
                {getThemeIcon(mode)}
                {themeMode === mode && (
                  <Check
                    sx={{
                      position: 'absolute',
                      right: 8,
                      color: muiTheme.palette.primary.main,
                    }}
                  />
                )}
              </ListItemIcon>
              <ListItemText primary={getThemeLabel(mode)} />
            </MenuItem>
          ))}
        </Menu>
      )}
    </>
  );
};

// Compact version for mobile/small spaces
export const CompactThemeToggle: React.FC = () => {
  const { toggleTheme, themeMode } = useTheme();

  return (
    <Tooltip title={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}>
      <IconButton
        onClick={toggleTheme}
        size="small"
        sx={{
          width: 32,
          height: 32,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'scale(1.1)',
          },
        }}
      >
        {themeMode === 'light' ? (
          <Brightness4 fontSize="small" />
        ) : (
          <Brightness7 fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
};