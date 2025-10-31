import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  IconButton,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Button,
  Alert,
  Collapse,
} from '@mui/material';
import {
  Warning,
  Error,
  Info,
  CheckCircle,
  Security,
  Computer,
  NetworkCheck,
  Storage,
  MoreVert,
  Notifications,
  NotificationsOff,
  Clear,
  ExpandMore,
  ExpandLess,
  Refresh,
} from '@mui/icons-material';

interface SystemAlert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  category: 'security' | 'system' | 'network' | 'performance';
  title: string;
  message: string;
  timestamp: Date;
  source: string;
  acknowledged: boolean;
  resolved: boolean;
  priority: 'high' | 'medium' | 'low';
  details?: string;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

interface AlertCenterProps {
  maxAlerts?: number;
  showResolved?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onAlertClick?: (alert: SystemAlert) => void;
}

export const AlertCenter: React.FC<AlertCenterProps> = ({
  maxAlerts = 10,
  showResolved = false,
  autoRefresh = true,
  refreshInterval = 30000,
  onAlertClick,
}) => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([
    {
      id: '1',
      type: 'critical',
      category: 'security',
      title: 'Suspicious Network Activity Detected',
      message: 'Multiple failed login attempts from IP 192.168.1.100',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      source: 'Threat Hunter Agent',
      acknowledged: false,
      resolved: false,
      priority: 'high',
      details: 'Detected 15 failed login attempts in the last 5 minutes from IP address 192.168.1.100. This may indicate a brute force attack.',
    },
    {
      id: '2',
      type: 'warning',
      category: 'system',
      title: 'High Memory Usage',
      message: 'Server node-02 memory usage at 89%',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      source: 'System Monitor',
      acknowledged: true,
      resolved: false,
      priority: 'medium',
      details: 'Memory usage on server node-02 has exceeded the warning threshold of 85%.',
    },
    {
      id: '3',
      type: 'info',
      category: 'system',
      title: 'Agent Update Available',
      message: 'New version 2.1.3 available for Threat Hunter agents',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      source: 'Update Manager',
      acknowledged: false,
      resolved: false,
      priority: 'low',
    },
    {
      id: '4',
      type: 'warning',
      category: 'network',
      title: 'Network Latency Spike',
      message: 'Increased latency detected on primary network interface',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      source: 'Network Monitor',
      acknowledged: true,
      resolved: false,
      priority: 'medium',
    },
    {
      id: '5',
      type: 'success',
      category: 'security',
      title: 'Threat Scan Completed',
      message: 'Full system scan completed successfully - no threats found',
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      source: 'Security Scanner',
      acknowledged: true,
      resolved: true,
      priority: 'low',
    },
  ]);

  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAlert, setSelectedAlert] = useState<SystemAlert | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const filteredAlerts = alerts
    .filter(alert => showResolved || !alert.resolved)
    .slice(0, maxAlerts);

  const unacknowledgedCount = alerts.filter(alert => !alert.acknowledged && !alert.resolved).length;
  const criticalCount = alerts.filter(alert => alert.type === 'critical' && !alert.resolved).length;

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Simulate new alerts or updates
      const shouldAddAlert = Math.random() < 0.1; // 10% chance
      if (shouldAddAlert) {
        const newAlert: SystemAlert = {
          id: Date.now().toString(),
          type: Math.random() > 0.7 ? 'critical' : Math.random() > 0.5 ? 'warning' : 'info',
          category: ['security', 'system', 'network', 'performance'][Math.floor(Math.random() * 4)] as any,
          title: 'New System Alert',
          message: 'Automated alert generated for demonstration',
          timestamp: new Date(),
          source: 'System Monitor',
          acknowledged: false,
          resolved: false,
          priority: 'medium',
        };
        setAlerts(prev => [newAlert, ...prev]);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const handleAlertClick = (alert: SystemAlert) => {
    setExpandedAlert(expandedAlert === alert.id ? null : alert.id);
    onAlertClick?.(alert);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, alert: SystemAlert) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedAlert(alert);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAlert(null);
  };

  const handleAcknowledge = () => {
    if (selectedAlert) {
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === selectedAlert.id
            ? { ...alert, acknowledged: true }
            : alert
        )
      );
    }
    handleMenuClose();
  };

  const handleResolve = () => {
    if (selectedAlert) {
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === selectedAlert.id
            ? { ...alert, resolved: true, acknowledged: true }
            : alert
        )
      );
    }
    handleMenuClose();
  };

  const handleDismiss = () => {
    if (selectedAlert) {
      setAlerts(prev => prev.filter(alert => alert.id !== selectedAlert.id));
    }
    handleMenuClose();
  };

  const getAlertIcon = (type: SystemAlert['type']) => {
    switch (type) {
      case 'critical':
        return <Error color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'info':
        return <Info color="info" />;
      case 'success':
        return <CheckCircle color="success" />;
      default:
        return <Info />;
    }
  };

  const getCategoryIcon = (category: SystemAlert['category']) => {
    switch (category) {
      case 'security':
        return <Security />;
      case 'system':
        return <Computer />;
      case 'network':
        return <NetworkCheck />;
      case 'performance':
        return <Storage />;
      default:
        return <Info />;
    }
  };

  const getAlertColor = (type: SystemAlert['type']) => {
    switch (type) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'success':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return timestamp.toLocaleDateString();
  };

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge badgeContent={unacknowledgedCount} color="error">
              <Typography variant="h6">Alert Center</Typography>
            </Badge>
            {criticalCount > 0 && (
              <Chip
                label={`${criticalCount} Critical`}
                color="error"
                size="small"
                variant="outlined"
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}>
              <IconButton
                size="small"
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              >
                {notificationsEnabled ? <Notifications /> : <NotificationsOff />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton size="small">
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Alerts List */}
        {filteredAlerts.length === 0 ? (
          <Alert severity="info">No alerts to display</Alert>
        ) : (
          <List sx={{ p: 0 }}>
            {filteredAlerts.map((alert, index) => (
              <React.Fragment key={alert.id}>
                <ListItem
                  button
                  onClick={() => handleAlertClick(alert)}
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: alert.acknowledged ? 'action.hover' : 'background.paper',
                    opacity: alert.resolved ? 0.7 : 1,
                    '&:hover': {
                      bgcolor: 'action.selected',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: `${getAlertColor(alert.type)}.main`,
                        width: 32,
                        height: 32,
                      }}
                    >
                      {getAlertIcon(alert.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" noWrap>
                          {alert.title}
                        </Typography>
                        <Chip
                          icon={getCategoryIcon(alert.category)}
                          label={alert.category}
                          size="small"
                          variant="outlined"
                        />
                        {alert.priority === 'high' && (
                          <Chip label="HIGH" color="error" size="small" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {alert.message}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {alert.source}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            •
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimestamp(alert.timestamp)}
                          </Typography>
                          {alert.acknowledged && (
                            <>
                              <Typography variant="caption" color="text.secondary">
                                •
                              </Typography>
                              <Chip label="Acknowledged" size="small" variant="outlined" />
                            </>
                          )}
                          {alert.resolved && (
                            <>
                              <Typography variant="caption" color="text.secondary">
                                •
                              </Typography>
                              <Chip label="Resolved" color="success" size="small" variant="outlined" />
                            </>
                          )}
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleAlertClick(alert)}
                      >
                        {expandedAlert === alert.id ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => handleMenuClick(e, alert)}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>

                {/* Expanded Details */}
                <Collapse in={expandedAlert === alert.id} timeout="auto" unmountOnExit>
                  <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                    {alert.details && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {alert.details}
                      </Typography>
                    )}
                    {alert.actions && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {alert.actions.map((action, actionIndex) => (
                          <Button
                            key={actionIndex}
                            size="small"
                            variant="outlined"
                            onClick={action.action}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Collapse>

                {index < filteredAlerts.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          {selectedAlert && !selectedAlert.acknowledged && (
            <MenuItem onClick={handleAcknowledge}>
              <CheckCircle sx={{ mr: 1 }} />
              Acknowledge
            </MenuItem>
          )}
          {selectedAlert && !selectedAlert.resolved && (
            <MenuItem onClick={handleResolve}>
              <CheckCircle sx={{ mr: 1 }} />
              Mark as Resolved
            </MenuItem>
          )}
          <MenuItem onClick={handleDismiss}>
            <Clear sx={{ mr: 1 }} />
            Dismiss
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
};