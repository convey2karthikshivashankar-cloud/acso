import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Grid,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Add,
  Edit,
  Delete,
  Share,
  Copy,
  MoreVert,
  Visibility,
  VisibilityOff,
  Star,
  StarBorder,
  Schedule,
  People,
  Lock,
  Public,
  Settings,
  Refresh,
} from '@mui/icons-material';
import { DashboardTemplate } from './DashboardLayoutEngine';
import { DashboardUser, UserRole, DashboardShare } from './RoleBasedDashboard';
import { createRoleDashboardTemplates, getDefaultDashboardForRole } from './RoleDashboardTemplates';
import { dashboardCollaborationService } from '../../services/dashboardCollaborationService';

interface RoleDashboardManagerProps {
  user: DashboardUser;
  roles: UserRole[];
  dashboards: DashboardTemplate[];
  shares: DashboardShare[];
  onDashboardSelect: (dashboard: DashboardTemplate) => void;
  onDashboardCreate: (dashboard: Partial<DashboardTemplate>) => Promise<void>;
  onDashboardUpdate: (dashboardId: string, updates: Partial<DashboardTemplate>) => Promise<void>;
  onDashboardDelete: (dashboardId: string) => Promise<void>;
  onDashboardDuplicate: (dashboardId: string) => Promise<void>;
  onRoleChange: (roleId: string) => void;
}

interface DashboardCardProps {
  dashboard: DashboardTemplate;
  currentUser: DashboardUser;
  currentRole: UserRole;
  isShared: boolean;
  isDefault: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onShare: () => void;
  onToggleFavorite: () => void;
  onToggleDefault: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  dashboard,
  currentUser,
  currentRole,
  isShared,
  isDefault,
  isFavorite,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onShare,
  onToggleFavorite,
  onToggleDefault,
}) => {
  const theme = useTheme();
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);

  const canEdit = dashboardCollaborationService.hasPermission(
    dashboard.id,
    currentUser.id,
    'edit',
    currentRole
  );

  const canDelete = dashboardCollaborationService.hasPermission(
    dashboard.id,
    currentUser.id,
    'delete',
    currentRole
  );

  const canShare = dashboardCollaborationService.hasPermission(
    dashboard.id,
    currentUser.id,
    'share',
    currentRole
  );

  const roleColor = currentRole?.color || theme.palette.primary.main;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8],
        },
        ...(isDefault && {
          border: `2px solid ${roleColor}`,
          boxShadow: `0 0 0 1px ${alpha(roleColor, 0.2)}`,
        }),
      }}
      onClick={onSelect}
    >
      {/* Status Indicators */}
      <Box sx={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 0.5 }}>
        {isDefault && (
          <Chip
            label="Default"
            size="small"
            sx={{
              bgcolor: alpha(roleColor, 0.1),
              color: roleColor,
              fontWeight: 'bold',
            }}
          />
        )}
        {isShared && (
          <Chip
            label="Shared"
            size="small"
            color="info"
            icon={<Share sx={{ fontSize: 14 }} />}
          />
        )}
        {dashboard.role && (
          <Chip
            label={dashboard.role}
            size="small"
            sx={{
              bgcolor: alpha(roleColor, 0.1),
              color: roleColor,
            }}
          />
        )}
      </Box>

      {/* Actions Menu */}
      <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setMenuAnchor(e.currentTarget);
          }}
        >
          <MoreVert />
        </IconButton>
        
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem
            onClick={() => {
              onToggleFavorite();
              setMenuAnchor(null);
            }}
          >
            {isFavorite ? <Star /> : <StarBorder />}
            <Typography sx={{ ml: 1 }}>
              {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            </Typography>
          </MenuItem>
          
          <MenuItem
            onClick={() => {
              onToggleDefault();
              setMenuAnchor(null);
            }}
          >
            <Settings />
            <Typography sx={{ ml: 1 }}>
              {isDefault ? 'Remove as default' : 'Set as default'}
            </Typography>
          </MenuItem>
          
          <Divider />
          
          {canEdit && (
            <MenuItem
              onClick={() => {
                onEdit();
                setMenuAnchor(null);
              }}
            >
              <Edit />
              <Typography sx={{ ml: 1 }}>Edit</Typography>
            </MenuItem>
          )}
          
          <MenuItem
            onClick={() => {
              onDuplicate();
              setMenuAnchor(null);
            }}
          >
            <Copy />
            <Typography sx={{ ml: 1 }}>Duplicate</Typography>
          </MenuItem>
          
          {canShare && (
            <MenuItem
              onClick={() => {
                onShare();
                setMenuAnchor(null);
              }}
            >
              <Share />
              <Typography sx={{ ml: 1 }}>Share</Typography>
            </MenuItem>
          )}
          
          {canDelete && (
            <>
              <Divider />
              <MenuItem
                onClick={() => {
                  onDelete();
                  setMenuAnchor(null);
                }}
                sx={{ color: 'error.main' }}
              >
                <Delete />
                <Typography sx={{ ml: 1 }}>Delete</Typography>
              </MenuItem>
            </>
          )}
        </Menu>
      </Box>

      <CardContent sx={{ flex: 1, pt: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: roleColor,
              width: 48,
              height: 48,
            }}
          >
            <DashboardIcon />
          </Avatar>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" component="h3" gutterBottom>
              {dashboard.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dashboard.description}
            </Typography>
          </Box>
          
          {isFavorite && (
            <Star sx={{ color: theme.palette.warning.main }} />
          )}
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Chip
            label={`${dashboard.widgets.length} widgets`}
            size="small"
            variant="outlined"
          />
          {dashboard.updatedAt && (
            <Chip
              label={`Updated ${dashboard.updatedAt.toLocaleDateString()}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>

        {dashboard.tags && dashboard.tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {dashboard.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
              />
            ))}
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Button
          variant="contained"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          sx={{ bgcolor: roleColor }}
        >
          Open Dashboard
        </Button>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {canEdit && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Edit />
            </IconButton>
          )}
          
          {canShare && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
            >
              <Share />
            </IconButton>
          )}
        </Box>
      </CardActions>
    </Card>
  );
};

export const RoleDashboardManager: React.FC<RoleDashboardManagerProps> = ({
  user,
  roles,
  dashboards,
  shares,
  onDashboardSelect,
  onDashboardCreate,
  onDashboardUpdate,
  onDashboardDelete,
  onDashboardDuplicate,
  onRoleChange,
}) => {
  const theme = useTheme();
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedDashboard, setSelectedDashboard] = React.useState<DashboardTemplate | null>(null);
  const [newDashboard, setNewDashboard] = React.useState({
    name: '',
    description: '',
    role: user.activeRole,
    isPublic: false,
  });
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set());
  const [defaultDashboards, setDefaultDashboards] = React.useState<Record<string, string>>({});

  const currentRole = roles.find(role => role.id === user.activeRole);
  const availableDashboards = getAvailableDashboards();
  const sharedDashboards = getSharedDashboards();

  React.useEffect(() => {
    // Load user preferences
    loadUserPreferences();
  }, [user.id]);

  const loadUserPreferences = () => {
    // In a real app, load from API or localStorage
    const savedFavorites = localStorage.getItem(`favorites-${user.id}`);
    const savedDefaults = localStorage.getItem(`defaults-${user.id}`);
    
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
    
    if (savedDefaults) {
      setDefaultDashboards(JSON.parse(savedDefaults));
    }
  };

  const saveUserPreferences = () => {
    localStorage.setItem(`favorites-${user.id}`, JSON.stringify([...favorites]));
    localStorage.setItem(`defaults-${user.id}`, JSON.stringify(defaultDashboards));
  };

  React.useEffect(() => {
    saveUserPreferences();
  }, [favorites, defaultDashboards]);

  function getAvailableDashboards(): DashboardTemplate[] {
    return dashboards.filter(dashboard => {
      // Admin can see all dashboards
      if (currentRole?.permissions.includes('*')) return true;
      
      // User can see dashboards for their role
      if (dashboard.role === user.activeRole) return true;
      
      // User can see public dashboards
      if (!dashboard.role) return true;
      
      return false;
    });
  }

  function getSharedDashboards(): DashboardTemplate[] {
    const sharedDashboardIds = shares
      .filter(share => share.sharedWith.includes(user.id))
      .map(share => share.dashboardId);
    
    return dashboards.filter(dashboard => 
      sharedDashboardIds.includes(dashboard.id)
    );
  }

  const handleCreateDashboard = async () => {
    try {
      const template = getDefaultDashboardForRole(newDashboard.role);
      
      await onDashboardCreate({
        ...newDashboard,
        widgets: template?.widgets || [],
        layouts: template?.layouts || { lg: [], md: [], sm: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      setCreateDialogOpen(false);
      setNewDashboard({
        name: '',
        description: '',
        role: user.activeRole,
        isPublic: false,
      });
    } catch (error) {
      console.error('Failed to create dashboard:', error);
    }
  };

  const handleEditDashboard = async () => {
    if (!selectedDashboard) return;
    
    try {
      await onDashboardUpdate(selectedDashboard.id, {
        name: newDashboard.name,
        description: newDashboard.description,
        role: newDashboard.role,
        updatedAt: new Date(),
      });
      
      setEditDialogOpen(false);
      setSelectedDashboard(null);
    } catch (error) {
      console.error('Failed to update dashboard:', error);
    }
  };

  const handleToggleFavorite = (dashboardId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(dashboardId)) {
      newFavorites.delete(dashboardId);
    } else {
      newFavorites.add(dashboardId);
    }
    setFavorites(newFavorites);
  };

  const handleToggleDefault = (dashboardId: string) => {
    const newDefaults = { ...defaultDashboards };
    if (newDefaults[user.activeRole] === dashboardId) {
      delete newDefaults[user.activeRole];
    } else {
      newDefaults[user.activeRole] = dashboardId;
    }
    setDefaultDashboards(newDefaults);
  };

  const openEditDialog = (dashboard: DashboardTemplate) => {
    setSelectedDashboard(dashboard);
    setNewDashboard({
      name: dashboard.name,
      description: dashboard.description || '',
      role: dashboard.role || user.activeRole,
      isPublic: !dashboard.role,
    });
    setEditDialogOpen(true);
  };

  const renderDashboardGrid = (dashboards: DashboardTemplate[], title: string) => (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {title}
        <Chip label={dashboards.length} size="small" />
      </Typography>
      
      {dashboards.length === 0 ? (
        <Alert severity="info">
          No dashboards available. Create a new dashboard to get started.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {dashboards.map((dashboard) => {
            const isShared = sharedDashboards.some(d => d.id === dashboard.id);
            const isDefault = defaultDashboards[user.activeRole] === dashboard.id;
            const isFavorite = favorites.has(dashboard.id);
            
            return (
              <Grid item xs={12} sm={6} md={4} key={dashboard.id}>
                <DashboardCard
                  dashboard={dashboard}
                  currentUser={user}
                  currentRole={currentRole!}
                  isShared={isShared}
                  isDefault={isDefault}
                  isFavorite={isFavorite}
                  onSelect={() => onDashboardSelect(dashboard)}
                  onEdit={() => openEditDialog(dashboard)}
                  onDelete={() => onDashboardDelete(dashboard.id)}
                  onDuplicate={() => onDashboardDuplicate(dashboard.id)}
                  onShare={() => {/* Handle share */}}
                  onToggleFavorite={() => handleToggleFavorite(dashboard.id)}
                  onToggleDefault={() => handleToggleDefault(dashboard.id)}
                />
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );

  const renderCreateDialog = () => (
    <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Dashboard</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Dashboard Name"
            value={newDashboard.name}
            onChange={(e) => setNewDashboard({ ...newDashboard, name: e.target.value })}
            fullWidth
            required
          />
          
          <TextField
            label="Description"
            value={newDashboard.description}
            onChange={(e) => setNewDashboard({ ...newDashboard, description: e.target.value })}
            multiline
            rows={3}
            fullWidth
          />
          
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={newDashboard.role}
              onChange={(e) => setNewDashboard({ ...newDashboard, role: e.target.value })}
            >
              {roles.filter(role => user.roles.includes(role.id)).map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: role.color, width: 24, height: 24 }}>
                      {role.icon}
                    </Avatar>
                    {role.displayName}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch
                checked={newDashboard.isPublic}
                onChange={(e) => setNewDashboard({ ...newDashboard, isPublic: e.target.checked })}
              />
            }
            label="Make this dashboard public"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
        <Button
          onClick={handleCreateDashboard}
          variant="contained"
          disabled={!newDashboard.name.trim()}
        >
          Create Dashboard
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderEditDialog = () => (
    <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Dashboard</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Dashboard Name"
            value={newDashboard.name}
            onChange={(e) => setNewDashboard({ ...newDashboard, name: e.target.value })}
            fullWidth
            required
          />
          
          <TextField
            label="Description"
            value={newDashboard.description}
            onChange={(e) => setNewDashboard({ ...newDashboard, description: e.target.value })}
            multiline
            rows={3}
            fullWidth
          />
          
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={newDashboard.role}
              onChange={(e) => setNewDashboard({ ...newDashboard, role: e.target.value })}
            >
              {roles.filter(role => user.roles.includes(role.id)).map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: role.color, width: 24, height: 24 }}>
                      {role.icon}
                    </Avatar>
                    {role.displayName}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch
                checked={newDashboard.isPublic}
                onChange={(e) => setNewDashboard({ ...newDashboard, isPublic: e.target.checked })}
              />
            }
            label="Make this dashboard public"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
        <Button
          onClick={handleEditDashboard}
          variant="contained"
          disabled={!newDashboard.name.trim()}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Dashboard Manager
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your role-based dashboards and access shared dashboards
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
          size="large"
        >
          Create Dashboard
        </Button>
      </Box>

      {/* Current Role Info */}
      {currentRole && (
        <Card sx={{ mb: 4, bgcolor: alpha(currentRole.color, 0.05) }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: currentRole.color, width: 48, height: 48 }}>
                {currentRole.icon}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">
                  Current Role: {currentRole.displayName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentRole.description}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(currentRole.dashboardPermissions)
                  .filter(([_, allowed]) => allowed)
                  .map(([permission]) => (
                    <Chip
                      key={permission}
                      label={permission.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                      size="small"
                      sx={{ bgcolor: alpha(currentRole.color, 0.1) }}
                    />
                  ))}
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Favorite Dashboards */}
      {favorites.size > 0 && (
        renderDashboardGrid(
          availableDashboards.filter(d => favorites.has(d.id)),
          '⭐ Favorite Dashboards'
        )
      )}

      {/* Role Dashboards */}
      {renderDashboardGrid(availableDashboards, `${currentRole?.displayName} Dashboards`)}

      {/* Shared Dashboards */}
      {sharedDashboards.length > 0 && (
        renderDashboardGrid(sharedDashboards, '🤝 Shared with Me')
      )}

      {/* Dialogs */}
      {renderCreateDialog()}
      {renderEditDialog()}
    </Box>
  );
};