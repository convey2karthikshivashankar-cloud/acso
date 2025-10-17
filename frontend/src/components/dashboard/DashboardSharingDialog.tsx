import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Autocomplete,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Share,
  Person,
  Group,
  Delete,
  Edit,
  Visibility,
  Schedule,
  Link,
  ContentCopy,
  Email,
  Close,
  Add,
  Security,
  History,
  Comment,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DashboardTemplate } from './DashboardLayoutEngine';
import { DashboardUser, UserRole, DashboardShare } from './RoleBasedDashboard';
import { 
  dashboardCollaborationService, 
  ShareRequest, 
  DashboardActivity,
  CollaborationPermission 
} from '../../services/dashboardCollaborationService';

interface DashboardSharingDialogProps {
  open: boolean;
  onClose: () => void;
  dashboard: DashboardTemplate;
  currentUser: DashboardUser;
  availableUsers: DashboardUser[];
  availableRoles: UserRole[];
  existingShares: DashboardShare[];
  onShare: (request: ShareRequest) => Promise<void>;
  onUpdateShare: (shareId: string, permissions: string[]) => Promise<void>;
  onRevokeShare: (shareId: string) => Promise<void>;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`sharing-tabpanel-${index}`}
    aria-labelledby={`sharing-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

export const DashboardSharingDialog: React.FC<DashboardSharingDialogProps> = ({
  open,
  onClose,
  dashboard,
  currentUser,
  availableUsers,
  availableRoles,
  existingShares,
  onShare,
  onUpdateShare,
  onRevokeShare,
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = React.useState(0);
  const [selectedUsers, setSelectedUsers] = React.useState<DashboardUser[]>([]);
  const [selectedRoles, setSelectedRoles] = React.useState<UserRole[]>([]);
  const [selectedPermissions, setSelectedPermissions] = React.useState<string[]>(['view']);
  const [shareMessage, setShareMessage] = React.useState('');
  const [expirationDate, setExpirationDate] = React.useState<Date | null>(null);
  const [shareLink, setShareLink] = React.useState('');
  const [linkExpiration, setLinkExpiration] = React.useState<Date | null>(null);
  const [isPublicLink, setIsPublicLink] = React.useState(false);
  const [activity, setActivity] = React.useState<DashboardActivity[]>([]);
  const [loading, setLoading] = React.useState(false);

  const availablePermissions = dashboardCollaborationService.getAvailablePermissions();

  React.useEffect(() => {
    if (open) {
      loadActivity();
      generateShareLink();
    }
  }, [open, dashboard.id]);

  const loadActivity = async () => {
    const dashboardActivity = dashboardCollaborationService.getDashboardActivity(dashboard.id);
    setActivity(dashboardActivity);
  };

  const generateShareLink = () => {
    const baseUrl = window.location.origin;
    const linkId = `${dashboard.id}-${Date.now()}`;
    setShareLink(`${baseUrl}/shared/dashboard/${linkId}`);
  };

  const handleShare = async () => {
    setLoading(true);
    try {
      const sharedWith: string[] = [
        ...selectedUsers.map(user => user.id),
        ...selectedRoles.map(role => `role:${role.id}`),
      ];

      const request: ShareRequest = {
        dashboardId: dashboard.id,
        sharedWith,
        permissions: selectedPermissions,
        message: shareMessage || undefined,
        expiresAt: expirationDate || undefined,
      };

      await onShare(request);
      
      // Reset form
      setSelectedUsers([]);
      setSelectedRoles([]);
      setSelectedPermissions(['view']);
      setShareMessage('');
      setExpirationDate(null);
      
      // Reload activity
      await loadActivity();
    } catch (error) {
      console.error('Failed to share dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermissions = async (shareId: string, permissions: string[]) => {
    try {
      await onUpdateShare(shareId, permissions);
      await loadActivity();
    } catch (error) {
      console.error('Failed to update permissions:', error);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      await onRevokeShare(shareId);
      await loadActivity();
    } catch (error) {
      console.error('Failed to revoke share:', error);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    // Show success message (implement toast notification)
  };

  const getPermissionColor = (permission: string): string => {
    const colors: Record<string, string> = {
      view: theme.palette.info.main,
      comment: theme.palette.success.main,
      edit: theme.palette.warning.main,
      share: theme.palette.secondary.main,
      admin: theme.palette.error.main,
    };
    return colors[permission] || theme.palette.grey[500];
  };

  const renderShareForm = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6" gutterBottom>
        Share "{dashboard.name}"
      </Typography>

      {/* User Selection */}
      <Autocomplete
        multiple
        options={availableUsers.filter(user => user.id !== currentUser.id)}
        getOptionLabel={(user) => `${user.name} (${user.email})`}
        value={selectedUsers}
        onChange={(_, newValue) => setSelectedUsers(newValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Share with users"
            placeholder="Select users..."
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  <Person sx={{ mr: 1, color: 'text.secondary' }} />
                  {params.InputProps.startAdornment}
                </>
              ),
            }}
          />
        )}
        renderTags={(value, getTagProps) =>
          value.map((user, index) => (
            <Chip
              key={user.id}
              label={user.name}
              avatar={<Avatar src={user.avatar} sx={{ width: 24, height: 24 }} />}
              {...getTagProps({ index })}
            />
          ))
        }
      />

      {/* Role Selection */}
      <Autocomplete
        multiple
        options={availableRoles}
        getOptionLabel={(role) => role.displayName}
        value={selectedRoles}
        onChange={(_, newValue) => setSelectedRoles(newValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Share with roles"
            placeholder="Select roles..."
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  <Group sx={{ mr: 1, color: 'text.secondary' }} />
                  {params.InputProps.startAdornment}
                </>
              ),
            }}
          />
        )}
        renderTags={(value, getTagProps) =>
          value.map((role, index) => (
            <Chip
              key={role.id}
              label={role.displayName}
              avatar={
                <Avatar sx={{ bgcolor: role.color, width: 24, height: 24 }}>
                  {role.icon}
                </Avatar>
              }
              {...getTagProps({ index })}
            />
          ))
        }
      />

      {/* Permission Selection */}
      <FormControl fullWidth>
        <InputLabel>Permissions</InputLabel>
        <Select
          multiple
          value={selectedPermissions}
          onChange={(e) => setSelectedPermissions(e.target.value as string[])}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((permission) => {
                const permissionObj = availablePermissions.find(p => p.id === permission);
                return (
                  <Chip
                    key={permission}
                    label={permissionObj?.name || permission}
                    size="small"
                    sx={{ bgcolor: alpha(getPermissionColor(permission), 0.1) }}
                  />
                );
              })}
            </Box>
          )}
        >
          {availablePermissions.map((permission) => (
            <MenuItem key={permission.id} value={permission.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: getPermissionColor(permission.id),
                  }}
                />
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {permission.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {permission.description}
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Optional Message */}
      <TextField
        label="Message (optional)"
        multiline
        rows={3}
        value={shareMessage}
        onChange={(e) => setShareMessage(e.target.value)}
        placeholder="Add a message to explain why you're sharing this dashboard..."
      />

      {/* Expiration Date */}
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DateTimePicker
          label="Expiration (optional)"
          value={expirationDate}
          onChange={setExpirationDate}
          renderInput={(params) => (
            <TextField
              {...params}
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <>
                    <Schedule sx={{ mr: 1, color: 'text.secondary' }} />
                    {params.InputProps?.startAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      </LocalizationProvider>

      {/* Share Button */}
      <Button
        variant="contained"
        startIcon={<Share />}
        onClick={handleShare}
        disabled={selectedUsers.length === 0 && selectedRoles.length === 0 || loading}
        size="large"
      >
        {loading ? 'Sharing...' : 'Share Dashboard'}
      </Button>
    </Box>
  );

  const renderExistingShares = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" gutterBottom>
        Current Shares ({existingShares.length})
      </Typography>

      {existingShares.length === 0 ? (
        <Alert severity="info">
          This dashboard hasn't been shared with anyone yet.
        </Alert>
      ) : (
        <List>
          {existingShares.map((share) => (
            <Card key={share.id} variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar>
                    <Group />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" fontWeight="medium">
                      {share.sharedWith.length} recipient(s)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Shared on {share.createdAt.toLocaleDateString()}
                      {share.expiresAt && ` • Expires ${share.expiresAt.toLocaleDateString()}`}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {share.permissions.map((permission) => (
                    <Chip
                      key={permission}
                      label={permission}
                      size="small"
                      sx={{ bgcolor: alpha(getPermissionColor(permission), 0.1) }}
                    />
                  ))}
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Recipients: {share.sharedWith.join(', ')}
                </Typography>
              </CardContent>

              <CardActions>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    multiple
                    value={share.permissions}
                    onChange={(e) => handleUpdatePermissions(share.id, e.target.value as string[])}
                    size="small"
                  >
                    {availablePermissions.map((permission) => (
                      <MenuItem key={permission.id} value={permission.id}>
                        {permission.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  startIcon={<Delete />}
                  onClick={() => handleRevokeShare(share.id)}
                  color="error"
                  size="small"
                >
                  Revoke
                </Button>
              </CardActions>
            </Card>
          ))}
        </List>
      )}
    </Box>
  );

  const renderShareLink = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6" gutterBottom>
        Share Link
      </Typography>

      <Alert severity="info">
        Anyone with this link can access the dashboard with the specified permissions.
      </Alert>

      <FormControlLabel
        control={
          <Switch
            checked={isPublicLink}
            onChange={(e) => setIsPublicLink(e.target.checked)}
          />
        }
        label="Enable public link sharing"
      />

      {isPublicLink && (
        <>
          <TextField
            label="Share Link"
            value={shareLink}
            InputProps={{
              readOnly: true,
              startAdornment: <Link sx={{ mr: 1, color: 'text.secondary' }} />,
              endAdornment: (
                <IconButton onClick={copyShareLink} size="small">
                  <ContentCopy />
                </IconButton>
              ),
            }}
          />

          <FormControl fullWidth>
            <InputLabel>Link Permissions</InputLabel>
            <Select
              multiple
              value={selectedPermissions}
              onChange={(e) => setSelectedPermissions(e.target.value as string[])}
            >
              {availablePermissions.slice(0, 2).map((permission) => (
                <MenuItem key={permission.id} value={permission.id}>
                  {permission.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
              label="Link Expiration"
              value={linkExpiration}
              onChange={setLinkExpiration}
              renderInput={(params) => <TextField {...params} />}
            />
          </LocalizationProvider>
        </>
      )}
    </Box>
  );

  const renderActivity = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" gutterBottom>
        Sharing Activity
      </Typography>

      {activity.length === 0 ? (
        <Alert severity="info">
          No sharing activity yet.
        </Alert>
      ) : (
        <List>
          {activity.map((item) => (
            <ListItem key={item.id}>
              <ListItemAvatar>
                <Avatar>
                  {item.action === 'shared' ? <Share /> : 
                   item.action === 'updated' ? <Edit /> : 
                   <History />}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={`${item.userName} ${item.action} the dashboard`}
                secondary={
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {item.timestamp.toLocaleString()}
                    </Typography>
                    {item.details && (
                      <Typography variant="caption" display="block">
                        {JSON.stringify(item.details, null, 2)}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '80vh' },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Share />
            <Typography variant="h6">Share Dashboard</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab icon={<Add />} label="Share" />
          <Tab icon={<Group />} label="Current Shares" />
          <Tab icon={<Link />} label="Share Link" />
          <Tab icon={<History />} label="Activity" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        <TabPanel value={activeTab} index={0}>
          {renderShareForm()}
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          {renderExistingShares()}
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          {renderShareLink()}
        </TabPanel>
        <TabPanel value={activeTab} index={3}>
          {renderActivity()}
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};