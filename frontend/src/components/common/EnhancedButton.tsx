import React from 'react';
import {
  Button,
  IconButton,
  Fab,
  ButtonGroup,
  ToggleButton,
  ToggleButtonGroup,
  Box,
  Tooltip,
  Badge,
  Chip,
  Menu,
  MenuItem,
  Divider,
  Typography,
  CircularProgress,
  alpha,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  ArrowDropDown,
  Check,
  Close,
  Add,
  Remove,
  MoreVert,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

export interface ButtonAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  divider?: boolean;
}

export interface EnhancedButtonProps {
  children?: React.ReactNode;
  variant?: 'text' | 'outlined' | 'contained' | 'gradient' | 'glass';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' | 'inherit';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  loading?: boolean;
  loadingPosition?: 'start' | 'end' | 'center';
  loadingIndicator?: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  href?: string;
  target?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  
  // Enhanced features
  badge?: {
    content?: React.ReactNode;
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
    variant?: 'standard' | 'dot';
    invisible?: boolean;
  };
  tooltip?: string;
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
  confirmAction?: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  };
  dropdownActions?: ButtonAction[];
  toggle?: {
    value: boolean;
    onChange: (value: boolean) => void;
  };
  counter?: {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onChange: (value: number) => void;
  };
  gradient?: {
    from: string;
    to: string;
    direction?: string;
  };
  pulse?: boolean;
  glow?: boolean;
  ripple?: boolean;
  elevation?: number;
  sx?: object;
}

export const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  children,
  variant = 'contained',
  size = 'medium',
  color = 'primary',
  startIcon,
  endIcon,
  loading = false,
  loadingPosition = 'center',
  loadingIndicator,
  disabled = false,
  fullWidth = false,
  href,
  target,
  type = 'button',
  onClick,
  badge,
  tooltip,
  tooltipPlacement = 'top',
  confirmAction,
  dropdownActions = [],
  toggle,
  counter,
  gradient,
  pulse = false,
  glow = false,
  ripple = true,
  elevation = 0,
  sx = {},
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (confirmAction) {
      setConfirmOpen(true);
      return;
    }

    if (toggle) {
      toggle.onChange(!toggle.value);
      return;
    }

    onClick?.(event);
  };

  const handleDropdownClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleDropdownClose = () => {
    setAnchorEl(null);
  };

  const handleCounterChange = (delta: number) => {
    if (!counter) return;
    
    const newValue = counter.value + delta;
    const min = counter.min ?? -Infinity;
    const max = counter.max ?? Infinity;
    
    if (newValue >= min && newValue <= max) {
      counter.onChange(newValue);
    }
  };

  const getVariantStyles = () => {
    const baseColor = theme.palette[color as keyof typeof theme.palette] as any;
    
    switch (variant) {
      case 'gradient':
        return {
          background: gradient 
            ? `linear-gradient(${gradient.direction || '45deg'}, ${gradient.from}, ${gradient.to})`
            : `linear-gradient(45deg, ${baseColor?.main}, ${baseColor?.dark})`,
          border: 'none',
          color: theme.palette.getContrastText(baseColor?.main || theme.palette.primary.main),
          '&:hover': {
            background: gradient 
              ? `linear-gradient(${gradient.direction || '45deg'}, ${gradient.from}, ${gradient.to})`
              : `linear-gradient(45deg, ${baseColor?.dark}, ${baseColor?.main})`,
            filter: 'brightness(1.1)',
          },
        };
      
      case 'glass':
        return {
          background: alpha(baseColor?.main || theme.palette.primary.main, 0.1),
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(baseColor?.main || theme.palette.primary.main, 0.2)}`,
          color: baseColor?.main || theme.palette.primary.main,
          '&:hover': {
            background: alpha(baseColor?.main || theme.palette.primary.main, 0.2),
          },
        };
      
      default:
        return {};
    }
  };

  const getAnimationStyles = () => {
    const styles: any = {};
    
    if (pulse) {
      styles.animation = 'pulse 2s infinite';
      styles['@keyframes pulse'] = {
        '0%': { transform: 'scale(1)' },
        '50%': { transform: 'scale(1.05)' },
        '100%': { transform: 'scale(1)' },
      };
    }
    
    if (glow) {
      const glowColor = theme.palette[color as keyof typeof theme.palette] as any;
      styles.boxShadow = `0 0 20px ${alpha(glowColor?.main || theme.palette.primary.main, 0.5)}`;
    }
    
    return styles;
  };

  const buttonSx = {
    ...getVariantStyles(),
    ...getAnimationStyles(),
    ...(elevation > 0 && { boxShadow: theme.shadows[elevation] }),
    ...sx,
  };

  // Counter Button
  if (counter) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton
          size={size}
          onClick={() => handleCounterChange(-counter.step || -1)}
          disabled={disabled || counter.value <= (counter.min ?? -Infinity)}
        >
          <Remove />
        </IconButton>
        
        <Chip
          label={counter.value}
          variant="outlined"
          size={size}
          sx={{ minWidth: 60, fontWeight: 'bold' }}
        />
        
        <IconButton
          size={size}
          onClick={() => handleCounterChange(counter.step || 1)}
          disabled={disabled || counter.value >= (counter.max ?? Infinity)}
        >
          <Add />
        </IconButton>
      </Box>
    );
  }

  // Toggle Button
  if (toggle) {
    const toggleButton = (
      <ToggleButton
        value="toggle"
        selected={toggle.value}
        onChange={() => toggle.onChange(!toggle.value)}
        size={size}
        disabled={disabled}
        sx={buttonSx}
      >
        {startIcon}
        {children}
        {endIcon}
      </ToggleButton>
    );

    return tooltip ? (
      <Tooltip title={tooltip} placement={tooltipPlacement}>
        {toggleButton}
      </Tooltip>
    ) : toggleButton;
  }

  // Dropdown Button
  if (dropdownActions.length > 0) {
    return (
      <Box sx={{ display: 'flex' }}>
        <LoadingButton
          variant={variant === 'gradient' || variant === 'glass' ? 'contained' : variant}
          size={size}
          color={color}
          startIcon={startIcon}
          loading={loading}
          loadingPosition={loadingPosition}
          loadingIndicator={loadingIndicator}
          disabled={disabled}
          onClick={handleClick}
          sx={{
            ...buttonSx,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
          }}
        >
          {children}
        </LoadingButton>
        
        <Button
          variant={variant === 'gradient' || variant === 'glass' ? 'contained' : variant}
          size={size}
          color={color}
          disabled={disabled}
          onClick={handleDropdownClick}
          sx={{
            ...buttonSx,
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
            borderLeft: variant === 'outlined' ? 'none' : `1px solid ${alpha('#fff', 0.2)}`,
            minWidth: 'auto',
            px: 1,
          }}
        >
          <ArrowDropDown />
        </Button>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleDropdownClose}
        >
          {dropdownActions.map((action, index) => (
            <React.Fragment key={index}>
              {action.divider && <Divider />}
              <MenuItem
                onClick={() => {
                  action.onClick();
                  handleDropdownClose();
                }}
                disabled={action.disabled}
              >
                {action.icon && (
                  <Box sx={{ mr: 1, display: 'flex' }}>
                    {action.icon}
                  </Box>
                )}
                {action.label}
              </MenuItem>
            </React.Fragment>
          ))}
        </Menu>
      </Box>
    );
  }

  // Regular Button
  const button = (
    <LoadingButton
      variant={variant === 'gradient' || variant === 'glass' ? 'contained' : variant}
      size={size}
      color={color}
      startIcon={startIcon}
      endIcon={endIcon}
      loading={loading}
      loadingPosition={loadingPosition}
      loadingIndicator={loadingIndicator}
      disabled={disabled}
      fullWidth={fullWidth}
      href={href}
      target={target}
      type={type}
      onClick={handleClick}
      disableRipple={!ripple}
      sx={buttonSx}
    >
      {children}
    </LoadingButton>
  );

  // Wrap with badge if provided
  const buttonWithBadge = badge ? (
    <Badge
      badgeContent={badge.content}
      color={badge.color}
      variant={badge.variant}
      invisible={badge.invisible}
    >
      {button}
    </Badge>
  ) : button;

  // Wrap with tooltip if provided
  return tooltip ? (
    <Tooltip title={tooltip} placement={tooltipPlacement}>
      {buttonWithBadge}
    </Tooltip>
  ) : buttonWithBadge;
};

// Specialized button variants
export const ActionButton: React.FC<{
  action: 'save' | 'cancel' | 'delete' | 'edit' | 'add' | 'refresh';
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}> = ({ action, onClick, loading, disabled, size }) => {
  const getActionProps = () => {
    switch (action) {
      case 'save':
        return {
          children: 'Save',
          color: 'primary' as const,
          startIcon: <Check />,
          variant: 'contained' as const,
        };
      case 'cancel':
        return {
          children: 'Cancel',
          color: 'inherit' as const,
          startIcon: <Close />,
          variant: 'outlined' as const,
        };
      case 'delete':
        return {
          children: 'Delete',
          color: 'error' as const,
          variant: 'contained' as const,
        };
      case 'edit':
        return {
          children: 'Edit',
          color: 'primary' as const,
          variant: 'outlined' as const,
        };
      case 'add':
        return {
          children: 'Add',
          color: 'primary' as const,
          startIcon: <Add />,
          variant: 'contained' as const,
        };
      case 'refresh':
        return {
          children: 'Refresh',
          color: 'primary' as const,
          variant: 'outlined' as const,
        };
      default:
        return {};
    }
  };

  return (
    <EnhancedButton
      {...getActionProps()}
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      size={size}
    />
  );
};

export const FloatingActionButton: React.FC<{
  icon: React.ReactNode;
  onClick?: () => void;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  size?: 'small' | 'medium' | 'large';
  position?: 'fixed' | 'absolute';
  bottom?: number;
  right?: number;
  tooltip?: string;
  badge?: number;
}> = ({
  icon,
  onClick,
  color = 'primary',
  size = 'large',
  position = 'fixed',
  bottom = 16,
  right = 16,
  tooltip,
  badge,
}) => {
  const fab = (
    <Fab
      color={color}
      size={size}
      onClick={onClick}
      sx={{
        position,
        bottom,
        right,
      }}
    >
      {badge ? (
        <Badge badgeContent={badge} color="error">
          {icon}
        </Badge>
      ) : (
        icon
      )}
    </Fab>
  );

  return tooltip ? (
    <Tooltip title={tooltip} placement="left">
      {fab}
    </Tooltip>
  ) : fab;
};