import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Chip,
  Avatar,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Security as SecurityIcon,
  Psychology as AgentIcon,
  AccountTree as WorkflowIcon,
  AttachMoney as FinancialIcon,
  Clear as ClearIcon,
  MarkEmailRead as MarkReadIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'security' | 'agent' | 'workflow' | 'financial' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

export const NotificationCenter: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'error',
      category: 'security',
      title: 'Critical Security Alert',
      message: 'Suspicious activity detected from IP 192.168.1.100',
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      read: false,
      actionUrl: '/incidents/investigation/inc_001',
    },
    {
      id: '2',
      type: 'warning',
      category: 'agent',
      title: 'Agent Performance Warning',
      message: 'Threat Hunter Agent response time increased by 40%',
      timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      read: false,
      actionUrl: '/agents/overview',
    },
    {
      id: '3',
      type: 'success',
      category: 'workflow',
      title: 'Workflow Completed',
      message: 'Automated patch deployment completed successfully',
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      read: true,
      actionUrl: '/workflows/execution',
    },
    {
      id: '4',
      type: 'info',
      category: 'financial',
      title: 'Cost Optimization Opportunity',
      message: 'Potential savings of $2,400/month identified',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: true,
      actionUrl: '/financial/cost-analysis',
    },
    {
      id: '5',
      type: 'warning',
      category: 'system',
      title: 'System Maintenance Scheduled',
      message: 'Scheduled maintenance window: Sunday 2:00-4:00 AM UTC',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      read: false,
    },
  ]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const handleRemoveNotification = (notificationId: string) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  const getNotificationIcon = (category: string, type: string) => {
    const categoryIcons = {
      security: <SecurityIcon />,
      agent: <AgentIcon />,
      workflow: <WorkflowIcon />,
      financial: <FinancialIcon />,
      system: <InfoIcon />,
    };

    const typeColors = {
      error: 'error.main',
      warning: 'warning.main',
      success: 'success.main',
      info: 'info.main',
    };

    return (
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: typeColors[type as keyof typeof typeColors],
          '& .MuiSvgIcon-root': {
            fontSize: '1rem',
          },
        }}
      >
        {categoryIcons[category as keyof typeof categoryIcons]}
      </Avatar>
    );
  };

  const getTypeChip = (type: string) => {
    const typeConfig = {
      error: { label: 'Critical', color: 'error' as const },
      warning: { label: 'Warning', color: 'warning' as const },
      success: { label: 'Success', color: 'success' as const },
      info: { label: 'Info', color: 'info' as const },
    };

    const config = typeConfig[type as keyof typeof typeConfig];
    return (
      <Chip
        label={config.label}
        size="small"
        color={config.color}
        variant="outlined"
        sx={{ fontSize: '0.75rem', height: 20 }}
      />
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-label="notifications"
        sx={{ ml: 1 }}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 600,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<MarkReadIcon />}
              onClick={handleMarkAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </Box>

        {/* Notifications List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {notifications.length === 0 ? (
            <Box
              sx={{
                p: 4,
                textAlign: 'center',
                color: 'text.secondary',
              }}
            >
              <NotificationsIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
              <Typography variant="body2">No notifications</Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    sx={{
                      alignItems: 'flex-start',
                      bgcolor: notification.read ? 'transparent' : 'action.hover',
                      '&:hover': {
                        bgcolor: 'action.selected',
                      },
                      cursor: notification.actionUrl ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (!notification.read) {
                        handleMarkAsRead(notification.id);
                      }
                      if (notification.actionUrl) {
                        // Navigate to action URL
                        window.location.href = notification.actionUrl;
                        handleClose();
                      }
                    }}
                  >
                    <ListItemIcon sx={{ mt: 1 }}>
                      {getNotificationIcon(notification.category, notification.type)}
                    </ListItemIcon>
                    
                    <ListItemText
                      sx={{ flex: 1 }}
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: notification.read ? 400 : 600,
                              flex: 1,
                            }}
                          >
                            {notification.title}
                          </Typography>
                          {getTypeChip(notification.type)}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 0.5 }}
                          >
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                          </Typography>
                        </Box>
                      }
                    />

                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveNotification(notification.id);
                      }}
                      sx={{ mt: 1, ml: 1 }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </ListItem>
                  
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <Box
            sx={{
              p: 1,
              borderTop: '1px solid',
              borderColor: 'divider',
              textAlign: 'center',
            }}
          >
            <Button
              size="small"
              onClick={() => {
                // Navigate to full notifications page
                window.location.href = '/notifications';
                handleClose();
              }}
            >
              View All Notifications
            </Button>
          </Box>
        )}
      </Popover>
    </>
  );
};