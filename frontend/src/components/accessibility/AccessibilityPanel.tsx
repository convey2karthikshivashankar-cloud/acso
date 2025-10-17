import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
} from '@mui/material';
import {
  Accessibility,
  Visibility,
  VolumeUp,
  Keyboard,
  Palette,
  TextFields,
  Speed,
  Settings,
  RestartAlt,
  Info,
} from '@mui/icons-material';
import { useAccessibilityFeatures } from '../../hooks/useAccessibilityFeatures';

interface AccessibilityPanelProps {
  open: boolean;
  onClose: () => void;
}

interface AccessibilityTestProps {
  onRunTest: (testType: string) => void;
  testResults: Record<string, { passed: boolean; issues: string[] }>;
}

const AccessibilityTest: React.FC<AccessibilityTestProps> = ({ onRunTest, testResults }) => {
  const tests = [
    {
      id: 'color-contrast',
      name: 'Color Contrast',
      description: 'Check if text has sufficient contrast ratio',
    },
    {
      id: 'keyboard-navigation',
      name: 'Keyboard Navigation',
      description: 'Verify all interactive elements are keyboard accessible',
    },
    {
      id: 'aria-labels',
      name: 'ARIA Labels',
      description: 'Check for proper ARIA labels and descriptions',
    },
    {
      id: 'focus-indicators',
      name: 'Focus Indicators',
      description: 'Ensure focus indicators are visible and clear',
    },
    {
      id: 'heading-structure',
      name: 'Heading Structure',
      description: 'Verify proper heading hierarchy',
    },
  ];

  return (
    <Card>
      <CardHeader title="Accessibility Tests" />
      <CardContent>
        <List>
          {tests.map((test) => {
            const result = testResults[test.id];
            return (
              <ListItem key={test.id} divider>
                <ListItemText
                  primary={test.name}
                  secondary={test.description}
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {result && (
                      <Chip
                        label={result.passed ? 'Passed' : 'Failed'}
                        color={result.passed ? 'success' : 'error'}
                        size="small"
                      />
                    )}
                    <Button
                      size="small"
                      onClick={() => onRunTest(test.id)}
                    >
                      Test
                    </Button>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
        
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={() => tests.forEach(test => onRunTest(test.id))}
          >
            Run All Tests
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const {
    preferences,
    updatePreference,
    resetPreferences,
    announceToScreenReader,
    skipToContent,
    isKeyboardUser,
  } = useAccessibilityFeatures();

  const [testResults, setTestResults] = React.useState<Record<string, { passed: boolean; issues: string[] }>>({});
  const [showTestDetails, setShowTestDetails] = React.useState(false);

  const handleRunTest = React.useCallback((testType: string) => {
    // Mock test implementation - in real app, this would run actual accessibility tests
    const mockResults = {
      'color-contrast': {
        passed: Math.random() > 0.3,
        issues: ['Button text has insufficient contrast ratio (2.1:1, should be 4.5:1)'],
      },
      'keyboard-navigation': {
        passed: Math.random() > 0.2,
        issues: ['Modal dialog is not keyboard accessible'],
      },
      'aria-labels': {
        passed: Math.random() > 0.4,
        issues: ['Form input missing aria-label'],
      },
      'focus-indicators': {
        passed: Math.random() > 0.1,
        issues: [],
      },
      'heading-structure': {
        passed: Math.random() > 0.2,
        issues: ['Heading levels skip from h1 to h3'],
      },
    };

    setTestResults(prev => ({
      ...prev,
      [testType]: mockResults[testType as keyof typeof mockResults] || { passed: true, issues: [] },
    }));

    announceToScreenReader(`Accessibility test ${testType} completed`);
  }, [announceToScreenReader]);

  const handlePreferenceChange = (key: keyof typeof preferences, value: any) => {
    updatePreference(key, value);
    announceToScreenReader(`${key} ${value ? 'enabled' : 'disabled'}`);
  };

  const handleReset = () => {
    resetPreferences();
    announceToScreenReader('Accessibility preferences reset to defaults');
  };

  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(result => result.passed).length;
  const failedTests = totalTests - passedTests;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Accessibility />
          <Typography variant="h6">Accessibility Settings</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Status Overview */}
          <Alert severity={isKeyboardUser ? 'info' : 'success'}>
            <AlertTitle>Navigation Status</AlertTitle>
            Currently using {isKeyboardUser ? 'keyboard' : 'mouse'} navigation
          </Alert>

          {/* Visual Preferences */}
          <Card>
            <CardHeader
              title="Visual Preferences"
              avatar={<Visibility />}
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.highContrast}
                      onChange={(e) => handlePreferenceChange('highContrast', e.target.checked)}
                    />
                  }
                  label="High Contrast Mode"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.largeText}
                      onChange={(e) => handlePreferenceChange('largeText', e.target.checked)}
                    />
                  }
                  label="Large Text"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.reducedMotion}
                      onChange={(e) => handlePreferenceChange('reducedMotion', e.target.checked)}
                    />
                  }
                  label="Reduce Motion"
                />
                
                <FormControl fullWidth>
                  <InputLabel>Color Blindness Support</InputLabel>
                  <Select
                    value={preferences.colorBlindnessSupport}
                    onChange={(e) => handlePreferenceChange('colorBlindnessSupport', e.target.value)}
                  >
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value="protanopia">Protanopia (Red-blind)</MenuItem>
                    <MenuItem value="deuteranopia">Deuteranopia (Green-blind)</MenuItem>
                    <MenuItem value="tritanopia">Tritanopia (Blue-blind)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>

          {/* Navigation Preferences */}
          <Card>
            <CardHeader
              title="Navigation Preferences"
              avatar={<Keyboard />}
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.keyboardNavigation}
                      onChange={(e) => handlePreferenceChange('keyboardNavigation', e.target.checked)}
                    />
                  }
                  label="Enhanced Keyboard Navigation"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.focusIndicators}
                      onChange={(e) => handlePreferenceChange('focusIndicators', e.target.checked)}
                    />
                  }
                  label="Visible Focus Indicators"
                />
                
                <Button
                  variant="outlined"
                  onClick={skipToContent}
                  startIcon={<Speed />}
                >
                  Skip to Main Content
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Screen Reader Preferences */}
          <Card>
            <CardHeader
              title="Screen Reader Preferences"
              avatar={<VolumeUp />}
            />
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.screenReaderMode}
                    onChange={(e) => handlePreferenceChange('screenReaderMode', e.target.checked)}
                  />
                }
                label="Screen Reader Optimizations"
              />
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Enables additional ARIA labels and descriptions for better screen reader experience
              </Typography>
            </CardContent>
          </Card>

          {/* Accessibility Testing */}
          <AccessibilityTest
            onRunTest={handleRunTest}
            testResults={testResults}
          />

          {/* Test Results Summary */}
          {totalTests > 0 && (
            <Card>
              <CardHeader title="Test Results Summary" />
              <CardContent>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Chip
                    label={`${passedTests} Passed`}
                    color="success"
                    variant={passedTests > 0 ? 'filled' : 'outlined'}
                  />
                  <Chip
                    label={`${failedTests} Failed`}
                    color="error"
                    variant={failedTests > 0 ? 'filled' : 'outlined'}
                  />
                </Box>
                
                {failedTests > 0 && (
                  <Button
                    variant="outlined"
                    startIcon={<Info />}
                    onClick={() => setShowTestDetails(true)}
                  >
                    View Issues
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button
          startIcon={<RestartAlt />}
          onClick={handleReset}
        >
          Reset to Defaults
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      {/* Test Details Dialog */}
      <Dialog
        open={showTestDetails}
        onClose={() => setShowTestDetails(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Accessibility Issues</DialogTitle>
        <DialogContent>
          {Object.entries(testResults)
            .filter(([_, result]) => !result.passed && result.issues.length > 0)
            .map(([testType, result]) => (
              <Box key={testType} sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {testType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Typography>
                <List dense>
                  {result.issues.map((issue, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={issue} />
                    </ListItem>
                  ))}
                </List>
                {testType !== Object.keys(testResults).filter(([_, r]) => !r.passed)[Object.keys(testResults).filter(([_, r]) => !r.passed).length - 1] && <Divider />}
              </Box>
            ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTestDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};