import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  IconButton,
  Chip,
  Badge,
  useTheme,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  Visibility,
  Group,
  Assessment,
  Download,
  Share,
  Print,
  Refresh,
} from '@mui/icons-material';
import { IncidentTimeline, TimelineEvent } from './IncidentTimeline';
import { EvidenceViewer, Evidence } from './EvidenceViewer';
import { IncidentCollaboration, Comment, Collaborator } from './IncidentCollaboration';

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

interface IncidentInvestigationInterfaceProps {
  incident: Incident;
  timelineEvents: TimelineEvent[];
  evidence: Evidence[];
  comments: Comment[];
  collaborators: Collaborator[];
  currentUser: Collaborator;
  onUpdateIncident?: (incident: Partial<Incident>) => void;
  onAddTimelineEvent?: (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => void;
  onEditTimelineEvent?: (eventId: string, event: Partial<TimelineEvent>) => void;
  onDeleteTimelineEvent?: (eventId: string) => void;
  onViewEvidence?: (evidence: Evidence[]) => void;
  onDownloadEvidence?: (evidence: Evidence) => void;
  onAnalyzeEvidence?: (evidence: Evidence) => void;
  onAddComment?: (comment: Omit<Comment, 'id' | 'timestamp'>) => void;
  onEditComment?: (commentId: string, content: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onAddCollaborator?: (userId: string) => void;
  onRemoveCollaborator?: (userId: string) => void;
  onExportReport?: () => void;
}

export const IncidentInvestigationInterface: React.FC<IncidentInvestigationInterfaceProps> = ({
  incident,
  timelineEvents,
  evidence,
  comments,
  collaborators,
  currentUser,
  onUpdateIncident,
  onAddTimelineEvent,
  onEditTimelineEvent,
  onDeleteTimelineEvent,
  onViewEvidence,
  onDownloadEvidence,
  onAnalyzeEvidence,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onAddCollaborator,
  onRemoveCollaborator,
  onExportReport,
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = React.useState(0);
  const [selectedEvidence, setSelectedEvidence] = React.useState<Evidence | undefined>();

  const getSeverityColor = (severity: Incident['severity']) => {
    switch (severity) {
      case 'critical':
        return theme.palette.error.main;
      case 'high':
        return theme.palette.warning.main;
      case 'medium':
        return theme.palette.info.main;
      case 'low':
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getStatusColor = (status: Incident['status']) => {
    switch (status) {
      case 'open':
        return theme.palette.error.main;
      case 'investigating':
        return theme.palette.warning.main;
      case 'resolved':
        return theme.palette.success.main;
      case 'closed':
        return theme.palette.grey[500];
      default:
        return theme.palette.grey[500];
    }
  };

  const tabs = [
    {
      label: 'Timeline',
      icon: <TimelineIcon />,
      badge: timelineEvents.length,
      content: (
        <IncidentTimeline
          incidentId={incident.id}
          events={timelineEvents}
          onAddEvent={onAddTimelineEvent}
          onEditEvent={onEditTimelineEvent}
          onDeleteEvent={onDeleteTimelineEvent}
          onViewEvidence={onViewEvidence}
        />
      ),
    },
    {
      label: 'Evidence',
      icon: <Visibility />,
      badge: evidence.length,
      content: (
        <EvidenceViewer
          evidence={evidence}
          selectedEvidence={selectedEvidence}
          onEvidenceSelect={setSelectedEvidence}
          onDownload={onDownloadEvidence}
          onAnalyze={onAnalyzeEvidence}
        />
      ),
    },
    {
      label: 'Collaboration',
      icon: <Group />,
      badge: comments.length,
      content: (
        <IncidentCollaboration
          incidentId={incident.id}
          comments={comments}
          collaborators={collaborators}
          currentUser={currentUser}
          onAddComment={onAddComment}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
          onAddCollaborator={onAddCollaborator}
          onRemoveCollaborator={onRemoveCollaborator}
        />
      ),
    },
    {
      label: 'Analysis',
      icon: <Assessment />,
      content: (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Incident Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Analysis tools and insights will be displayed here.
          </Typography>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {/* Incident Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" gutterBottom>
                {incident.title}
              </Typography>
              
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {incident.description}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <Chip
                  label={incident.severity.toUpperCase()}
                  sx={{
                    backgroundColor: getSeverityColor(incident.severity),
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                />
                
                <Chip
                  label={incident.status.toUpperCase()}
                  sx={{
                    backgroundColor: getStatusColor(incident.status),
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                />
                
                {incident.assignee && (
                  <Chip
                    label={`Assigned to ${incident.assignee.name}`}
                    variant="outlined"
                  />
                )}
                
                <Typography variant="caption" color="text.secondary">
                  Created: {incident.createdAt.toLocaleString()}
                </Typography>
                
                <Typography variant="caption" color="text.secondary">
                  Updated: {incident.updatedAt.toLocaleString()}
                </Typography>
              </Box>
              
              {incident.tags.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {incident.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      size="small"
                      variant="filled"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton>
                <Refresh />
              </IconButton>
              <IconButton>
                <Share />
              </IconButton>
              <IconButton>
                <Print />
              </IconButton>
              {onExportReport && (
                <Button
                  startIcon={<Download />}
                  variant="outlined"
                  onClick={onExportReport}
                >
                  Export Report
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Investigation Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={
                  tab.badge !== undefined ? (
                    <Badge badgeContent={tab.badge} color="primary">
                      {tab.icon}
                    </Badge>
                  ) : (
                    tab.icon
                  )
                }
                label={tab.label}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Box>
        
        <Box sx={{ p: 0 }}>
          {tabs[activeTab]?.content}
        </Box>
      </Card>
    </Box>
  );
};