import React from 'react';
import { 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Switch, 
  FormControlLabel,
  Divider,
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { PageContainer } from '../components/layout/PageContainer';
import { useTheme } from '../components/theme/ThemeProvider';
import { useAppSelector, useAppDispatch } from '../store/hooks';

const SettingsPage: React.FC = () => {
  const { themeMode, setThemeMode } = useTheme();
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);

  return (
    <PageContainer title="Settings" subtitle="System configuration and preferences">
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          {/* Appearance Settings */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Appearance
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Theme Mode</InputLabel>
                    <Select
                      value={themeMode}
                      label="Theme Mode"
                      onChange={(e) => setThemeMode(e.target.value as any)}
                    >
                      <MenuItem value="light">Light</MenuItem>
                      <MenuItem value="dark">Dark</MenuItem>
                      <MenuItem value="auto">Auto (System)</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Enable animations"
                  />
                  
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Show tooltips"
                  />
                  
                  <FormControlLabel
                    control={<Switch />}
                    label="High contrast mode"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Notification Settings */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Notifications
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Desktop notifications"
                  />
                  
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Email notifications"
                  />
                  
                  <FormControlLabel
                    control={<Switch />}
                    label="SMS notifications"
                  />
                  
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Sound alerts"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* User Profile */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  User Profile
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      defaultValue={user?.name || ''}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      defaultValue={user?.email || ''}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      defaultValue=""
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Timezone</InputLabel>
                      <Select defaultValue="UTC">
                        <MenuItem value="UTC">UTC</MenuItem>
                        <MenuItem value="EST">Eastern Time</MenuItem>
                        <MenuItem value="PST">Pacific Time</MenuItem>
                        <MenuItem value="GMT">Greenwich Mean Time</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                
                <Divider sx={{ my: 3 }} />
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="contained">
                    Save Changes
                  </Button>
                  <Button variant="outlined">
                    Reset to Defaults
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* System Settings */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Settings
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Default Dashboard</InputLabel>
                      <Select defaultValue="overview">
                        <MenuItem value="overview">System Overview</MenuItem>
                        <MenuItem value="agents">Agents Dashboard</MenuItem>
                        <MenuItem value="incidents">Incidents Dashboard</MenuItem>
                        <MenuItem value="financial">Financial Dashboard</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Refresh Interval</InputLabel>
                      <Select defaultValue="30">
                        <MenuItem value="10">10 seconds</MenuItem>
                        <MenuItem value="30">30 seconds</MenuItem>
                        <MenuItem value="60">1 minute</MenuItem>
                        <MenuItem value="300">5 minutes</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Enable real-time updates"
                    />
                    
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Auto-save dashboard layouts"
                    />
                    
                    <FormControlLabel
                      control={<Switch />}
                      label="Enable debug mode"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </PageContainer>
  );
};

export default SettingsPage;