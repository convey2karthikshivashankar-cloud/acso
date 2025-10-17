import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  TextField,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Divider,
  Paper,
  Chip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Send,
  Attachment,
  Reply,
  Edit,
  Delete,
  Person,
  Group,
  Notifications,
  NotificationsOff,
  Share,
  Visibility,
  VisibilityOff,
  Schedule,
  CheckCircle,
  Warning,
  Info,
  MoreVert,
} from '@mui/icons-material';

export interface Comment {
  id: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  content: string;
  timestamp: Date;
  edited?: Date;
  attachments?: {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  }[];
  mentions?: string[];
  reactions?: {
    emoji: string;
    users: string[];
  }[];
  parentId?: string; // For replies
  visibility: 'public' | 'internal' | 'private';
  priority?: 'low' | 'medium' | 'high';
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  department: string;
  status: 'online' | 'offline' | 'away';
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canAssign: boolean;
    canClose: boolean;
  };
  lastSeen?: Date;
  notifications: boolean;
}

interface IncidentCollaborationProps {
  incidentId: string;
  comments: Comment[];
  collaborators: Collaborator[];
  currentUser: Collaborator;
  onAddComment?: (comment: Omit<Comment, 'id' | 'timestamp'>) => void;
  onEditComment?: (commentId: string, content: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onAddCollaborator?: (userId: string) => void;
  onRemoveCollaborator?: (userId: string) => void;
  onUpdatePermissions?: (userId: string, permissions: Collaborator['permissions']) => void;
  onToggleNotifications?: (userId: string, enabled: boolean) => void;
}

interface CommentItemProps {
  comment: Comment;
  currentUser: Collaborator;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onReply?: (parentId: string) => void;
  level?: number;
}

interface AddCommentProps {
  onAdd: (comment: Omit<Comment, 'id' | 'timestamp'>) => void;
  currentUser: Collaborator;
  parentId?: string;
  onCancel?: () => void;
}

interface CollaboratorListProps {
  collaborators: Collaborator[];
  currentUser: Collaborator;
  onAdd?: (userId: string) => void;
  onRemove?: (userId: string) => void;
  onUpdatePermissions?: (userId: string, permissions: Collaborator['permissions']) => void;
  onToggleNotifications?: (userId: string, enabled: boolean) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUser,
  onEdit,
  onDelete,
  onReply,
  level = 0,
}) => {
  const theme = useTheme();
  const [editing, setEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(comment.content);
  const [showReplies, setShowReplies] = React.useState(true);

  const canEdit = comment.author.id === currentUser.id || currentUser.permissions.canEdit;
  const canDelete = comment.author.id === currentUser.id || currentUser.permissions.canEdit;

  const handleSaveEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(comment.id, editContent);
      setEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setEditing(false);
  };

  const getVisibilityIcon = (visibility: Comment['visibility']) => {
    switch (visibility) {
      case 'private':
        return <VisibilityOff fontSize="small" />;
      case 'internal':
        return <Group fontSize="small" />;
      default:
        return <Visibility fontSize="small" />;
    }
  };

  const getVisibilityColor = (visibility: Comment['visibility']) => {
    switch (visibility) {
      case 'private':
        return theme.palette.error.main;
      case 'internal':
        return theme.palette.warning.main;
      default:
        return theme.palette.success.main;
    }
  };

  const getPriorityColor = (priority?: Comment['priority']) => {
    switch (priority) {
      case 'high':
        return theme.palette.error.main;
      case 'medium':
        return theme.palette.warning.main;
      case 'low':
        return theme.palette.info.main;
      default:
        return 'transparent';
    }
  };

  return (
    <Box
      sx={{
        ml: level * 4,
        mb: 2,
        borderLeft: level > 0 ? `2px solid ${theme.palette.divider}` : 'none',
        pl: level > 0 ? 2 : 0,
      }}
    >
      <Card
        sx={{
          borderLeft: `4px solid ${getPriorityColor(comment.priority)}`,
        }}
      >
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Avatar
              src={comment.author.avatar}
              sx={{ width: 32, height: 32 }}
            >
              {comment.author.name.charAt(0)}
            </Avatar>
            
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {comment.author.name}
                </Typography>
                <Chip label={comment.author.role} size="small" variant="outlined" />
                <Tooltip title={`Visibility: ${comment.visibility}`}>
                  <Box sx={{ color: getVisibilityColor(comment.visibility) }}>
                    {getVisibilityIcon(comment.visibility)}
                  </Box>
                </Tooltip>
                {comment.priority && (
                  <Chip
                    label={comment.priority.toUpperCase()}
                    size="small"
                    sx={{
                      backgroundColor: alpha(getPriorityColor(comment.priority), 0.1),
                      color: getPriorityColor(comment.priority),
                    }}
                  />
                )}
                <Typography variant="caption" color="text.secondary">
                  {comment.timestamp.toLocaleString()}
                  {comment.edited && ' (edited)'}
                </Typography>
              </Box>
              
              {editing ? (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    variant="outlined"
                    size="small"
                  />
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <Button size="small" onClick={handleSaveEdit} variant="contained">
                      Save
                    </Button>
                    <Button size="small" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                  {comment.content}
                </Typography>
              )}
              
              {comment.attachments && comment.attachments.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  {comment.attachments.map((attachment) => (
                    <Chip
                      key={attachment.id}
                      icon={<Attachment />}
                      label={`${attachment.name} (${(attachment.size / 1024).toFixed(1)} KB)`}
                      size="small"
                      variant="outlined"
                      clickable
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
              )}
              
              {comment.reactions && comment.reactions.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  {comment.reactions.map((reaction, index) => (
                    <Chip
                      key={index}
                      label={`${reaction.emoji} ${reaction.users.length}`}
                      size="small"
                      variant="outlined"
                      clickable
                      sx={{ mr: 0.5 }}
                    />
                  ))}
                </Box>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {onReply && (
                <Tooltip title="Reply">
                  <IconButton size="small" onClick={() => onReply(comment.id)}>
                    <Reply />
                  </IconButton>
                </Tooltip>
              )}
              
              {canEdit && !editing && (
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => setEditing(true)}>
                    <Edit />
                  </IconButton>
                </Tooltip>
              )}
              
              {canDelete && (
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={() => onDelete?.(comment.id)}>
                    <Delete />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

const AddComment: React.FC<AddCommentProps> = ({
  onAdd,
  currentUser,
  parentId,
  onCancel,
}) => {
  const [content, setContent] = React.useState('');
  const [visibility, setVisibility] = React.useState<Comment['visibility']>('public');
  const [priority, setPriority] = React.useState<Comment['priority']>('medium');
  const [attachments, setAttachments] = React.useState<File[]>([]);

  const handleSubmit = () => {
    if (content.trim()) {
      onAdd({
        author: currentUser,
        content: content.trim(),
        visibility,
        priority,
        parentId,
        attachments: attachments.map(file => ({
          id: Math.random().toString(36).substring(2),
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
        })),
      });
      
      setContent('');
      setAttachments([]);
      onCancel?.();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setAttachments(Array.from(event.target.files));
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Avatar src={currentUser.avatar} sx={{ width: 32, height: 32 }}>
            {currentUser.name.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder={parentId ? "Write a reply..." : "Add a comment..."}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              variant="outlined"
            />
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Visibility</InputLabel>
            <Select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Comment['visibility'])}
            >
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="internal">Internal</MenuItem>
              <MenuItem value="private">Private</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Comment['priority'])}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>
          
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="attachment-input"
          />
          <label htmlFor="attachment-input">
            <IconButton component="span">
              <Attachment />
            </IconButton>
          </label>
        </Box>
        
        {attachments.length > 0 && (
          <Box sx={{ mb: 2 }}>
            {attachments.map((file, index) => (
              <Chip
                key={index}
                label={`${file.name} (${(file.size / 1024).toFixed(1)} KB)`}
                onDelete={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                sx={{ mr: 0.5, mb: 0.5 }}
              />
            ))}
          </Box>
        )}
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<Send />}
            onClick={handleSubmit}
            disabled={!content.trim()}
          >
            {parentId ? 'Reply' : 'Comment'}
          </Button>
          {onCancel && (
            <Button onClick={onCancel}>
              Cancel
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const CollaboratorList: React.FC<CollaboratorListProps> = ({
  collaborators,
  currentUser,
  onAdd,
  onRemove,
  onUpdatePermissions,
  onToggleNotifications,
}) => {
  const getStatusColor = (status: Collaborator['status']) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'away':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardHeader
        title="Collaborators"
        action={
          onAdd && (
            <Button startIcon={<Person />} size="small">
              Add
            </Button>
          )
        }
      />
      <CardContent sx={{ pt: 0 }}>
        <List>
          {collaborators.map((collaborator) => (
            <ListItem key={collaborator.id} divider>
              <ListItemAvatar>
                <Badge
                  color={getStatusColor(collaborator.status) as any}
                  variant="dot"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                  <Avatar src={collaborator.avatar}>
                    {collaborator.name.charAt(0)}
                  </Avatar>
                </Badge>
              </ListItemAvatar>
              
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1">{collaborator.name}</Typography>
                    <Chip label={collaborator.role} size="small" variant="outlined" />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {collaborator.department}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {collaborator.status === 'online' ? 'Online' : 
                       collaborator.lastSeen ? `Last seen ${collaborator.lastSeen.toLocaleString()}` : 'Offline'}
                    </Typography>
                  </Box>
                }
              />
              
              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {onToggleNotifications && (
                    <Tooltip title={collaborator.notifications ? 'Disable notifications' : 'Enable notifications'}>
                      <IconButton
                        size="small"
                        onClick={() => onToggleNotifications(collaborator.id, !collaborator.notifications)}
                      >
                        {collaborator.notifications ? <Notifications /> : <NotificationsOff />}
                      </IconButton>
                    </Tooltip>
                  )}
                  
                  {onRemove && collaborator.id !== currentUser.id && (
                    <Tooltip title="Remove collaborator">
                      <IconButton
                        size="small"
                        onClick={() => onRemove(collaborator.id)}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export const IncidentCollaboration: React.FC<IncidentCollaborationProps> = ({
  incidentId,
  comments,
  collaborators,
  currentUser,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onAddCollaborator,
  onRemoveCollaborator,
  onUpdatePermissions,
  onToggleNotifications,
}) => {
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<'all' | 'public' | 'internal' | 'private'>('all');

  const filteredComments = React.useMemo(() => {
    let filtered = comments;
    
    if (filter !== 'all') {
      filtered = filtered.filter(comment => comment.visibility === filter);
    }
    
    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [comments, filter]);

  const handleAddComment = (comment: Omit<Comment, 'id' | 'timestamp'>) => {
    onAddComment?.(comment);
    setReplyingTo(null);
  };

  const handleReply = (parentId: string) => {
    setReplyingTo(parentId);
  };

  return (
    <Box sx={{ display: 'flex', gap: 3 }}>
      {/* Comments Section */}
      <Box sx={{ flex: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6">
            Comments ({filteredComments.length})
          </Typography>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Filter</InputLabel>
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <MenuItem value="all">All Comments</MenuItem>
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="internal">Internal</MenuItem>
              <MenuItem value="private">Private</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Add Comment Form */}
        {onAddComment && !replyingTo && (
          <AddComment
            onAdd={handleAddComment}
            currentUser={currentUser}
          />
        )}

        {/* Comments List */}
        <Box>
          {filteredComments.map((comment) => (
            <Box key={comment.id}>
              <CommentItem
                comment={comment}
                currentUser={currentUser}
                onEdit={onEditComment}
                onDelete={onDeleteComment}
                onReply={handleReply}
              />
              
              {/* Reply Form */}
              {replyingTo === comment.id && (
                <Box sx={{ ml: 4, mb: 2 }}>
                  <AddComment
                    onAdd={handleAddComment}
                    currentUser={currentUser}
                    parentId={comment.id}
                    onCancel={() => setReplyingTo(null)}
                  />
                </Box>
              )}
            </Box>
          ))}
        </Box>

        {filteredComments.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No comments yet
            </Typography>
          </Box>
        )}
      </Box>

      {/* Collaborators Sidebar */}
      <Box sx={{ flex: 1 }}>
        <CollaboratorList
          collaborators={collaborators}
          currentUser={currentUser}
          onAdd={onAddCollaborator}
          onRemove={onRemoveCollaborator}
          onUpdatePermissions={onUpdatePermissions}
          onToggleNotifications={onToggleNotifications}
        />
      </Box>
    </Box>
  );
};