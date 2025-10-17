import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Refresh,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';

export interface BaseWidgetProps {
  id: string;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | Error;
  warning?: string;
  info?: string;
  success?: string;
  refreshInterval?: number;
  autoRefresh?: boolean;
  onRefresh?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  sx?: object;
  children?: React.ReactNode;
}

export interface WidgetState {
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  data: any;
}

export abstract class BaseWidget<P extends BaseWidgetProps = BaseWidgetProps, S extends WidgetState = WidgetState> extends React.Component<P, S> {
  private refreshTimer: NodeJS.Timeout | null = null;
  private mounted = false;

  constructor(props: P) {
    super(props);
    this.state = {
      loading: false,
      error: null,
      lastUpdated: null,
      data: null,
    } as S;
  }

  componentDidMount() {
    this.mounted = true;
    this.setupAutoRefresh();
    this.loadData();
  }

  componentWillUnmount() {
    this.mounted = false;
    this.clearAutoRefresh();
  }

  componentDidUpdate(prevProps: P) {
    if (prevProps.refreshInterval !== this.props.refreshInterval || 
        prevProps.autoRefresh !== this.props.autoRefresh) {
      this.setupAutoRefresh();
    }
  }

  private setupAutoRefresh() {
    this.clearAutoRefresh();
    
    if (this.props.autoRefresh && this.props.refreshInterval && this.props.refreshInterval > 0) {
      this.refreshTimer = setInterval(() => {
        if (this.mounted && !this.state.loading) {
          this.refresh();
        }
      }, this.props.refreshInterval * 1000);
    }
  }

  private clearAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  protected setLoading(loading: boolean) {
    if (this.mounted) {
      this.setState({ loading });
    }
  }

  protected setError(error: string | Error | null) {
    if (this.mounted) {
      const errorMessage = error instanceof Error ? error.message : error;
      this.setState({ error: errorMessage });
      
      if (error && this.props.onError) {
        this.props.onError(error instanceof Error ? error : new Error(errorMessage || 'Unknown error'));
      }
    }
  }

  protected setData(data: any) {
    if (this.mounted) {
      this.setState({ 
        data, 
        lastUpdated: new Date(),
        error: null 
      });
    }
  }

  public async refresh() {
    try {
      this.setLoading(true);
      this.setError(null);
      await this.loadData();
      this.props.onRefresh?.();
    } catch (error) {
      this.setError(error as Error);
    } finally {
      this.setLoading(false);
    }
  }

  // Abstract method that must be implemented by subclasses
  protected abstract loadData(): Promise<void>;

  // Abstract method for rendering widget content
  protected abstract renderContent(): React.ReactNode;

  // Optional method for rendering widget header actions
  protected renderHeaderActions(): React.ReactNode {
    return (
      <Tooltip title="Refresh">
        <IconButton
          size="small"
          onClick={() => this.refresh()}
          disabled={this.state.loading}
        >
          <Refresh />
        </IconButton>
      </Tooltip>
    );
  }

  // Optional method for rendering widget footer
  protected renderFooter(): React.ReactNode {
    return null;
  }

  private getStatusIcon() {
    const { error, warning, info, success } = this.props;
    
    if (error || this.state.error) return <ErrorIcon color="error" fontSize="small" />;
    if (warning) return <WarningIcon color="warning" fontSize="small" />;
    if (success) return <SuccessIcon color="success" fontSize="small" />;
    if (info) return <InfoIcon color="info" fontSize="small" />;
    return null;
  }

  private getStatusMessage() {
    const { error, warning, info, success } = this.props;
    
    if (error) return typeof error === 'string' ? error : error.message;
    if (this.state.error) return this.state.error;
    if (warning) return warning;
    if (success) return success;
    if (info) return info;
    return null;
  }

  private getStatusSeverity(): 'error' | 'warning' | 'info' | 'success' {
    const { error, warning, success } = this.props;
    
    if (error || this.state.error) return 'error';
    if (warning) return 'warning';
    if (success) return 'success';
    return 'info';
  }

  render() {
    const { title, subtitle, loading: propsLoading, className, sx } = this.props;
    const { loading: stateLoading } = this.state;
    const loading = propsLoading || stateLoading;
    const statusMessage = getStatusMessage();

    return (
      <Box
        className={className}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          ...sx,
        }}
      >
        {/* Widget Header */}
        {(title || subtitle) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {title && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" noWrap>
                    {title}
                  </Typography>
                  {loading && <CircularProgress size={16} />}
                  {this.getStatusIcon()}
                </Box>
              )}
              {subtitle && (
                <Typography variant="body2" color="text.secondary" noWrap>
                  {subtitle}
                </Typography>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {this.renderHeaderActions()}
            </Box>
          </Box>
        )}

        {/* Status Message */}
        {statusMessage && (
          <Alert
            severity={this.getStatusSeverity()}
            sx={{ borderRadius: 0 }}
          >
            {statusMessage}
          </Alert>
        )}

        {/* Widget Content */}
        <Box sx={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: 200,
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            this.renderContent()
          )}
        </Box>

        {/* Widget Footer */}
        {this.renderFooter()}
      </Box>
    );
  }
}

// Functional component wrapper for hooks-based widgets
export interface FunctionalWidgetProps extends BaseWidgetProps {
  renderContent: (props: {
    loading: boolean;
    error: string | null;
    data: any;
    refresh: () => void;
  }) => React.ReactNode;
  loadData: () => Promise<any>;
}

export const FunctionalWidget: React.FC<FunctionalWidgetProps> = ({
  renderContent,
  loadData,
  refreshInterval,
  autoRefresh = false,
  onRefresh,
  onError,
  ...props
}) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any>(null);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await loadData();
      setData(result);
      setLastUpdated(new Date());
      onRefresh?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [loadData, onRefresh, onError]);

  // Auto-refresh functionality
  React.useEffect(() => {
    if (autoRefresh && refreshInterval && refreshInterval > 0) {
      const timer = setInterval(() => {
        if (!loading) {
          refresh();
        }
      }, refreshInterval * 1000);

      return () => clearInterval(timer);
    }
  }, [autoRefresh, refreshInterval, loading, refresh]);

  // Initial load
  React.useEffect(() => {
    refresh();
  }, []);

  return (
    <BaseWidgetComponent
      {...props}
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      {renderContent({ loading, error, data, refresh })}
    </BaseWidgetComponent>
  );
};

// Simple wrapper component for consistent styling
const BaseWidgetComponent: React.FC<BaseWidgetProps> = ({
  title,
  subtitle,
  loading,
  error,
  warning,
  info,
  success,
  onRefresh,
  className,
  sx,
  children,
}) => {
  const theme = useTheme();

  const getStatusIcon = () => {
    if (error) return <ErrorIcon color="error" fontSize="small" />;
    if (warning) return <WarningIcon color="warning" fontSize="small" />;
    if (success) return <SuccessIcon color="success" fontSize="small" />;
    if (info) return <InfoIcon color="info" fontSize="small" />;
    return null;
  };

  const getStatusMessage = () => {
    if (error) return typeof error === 'string' ? error : error.message;
    if (warning) return warning;
    if (success) return success;
    if (info) return info;
    return null;
  };

  const getStatusSeverity = (): 'error' | 'warning' | 'info' | 'success' => {
    if (error) return 'error';
    if (warning) return 'warning';
    if (success) return 'success';
    return 'info';
  };

  const statusMessage = getStatusMessage();

  return (
    <Box
      className={className}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...sx,
      }}
    >
      {/* Widget Header */}
      {(title || subtitle) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {title && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" noWrap>
                  {title}
                </Typography>
                {loading && <CircularProgress size={16} />}
                {getStatusIcon()}
              </Box>
            )}
            {subtitle && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {subtitle}
              </Typography>
            )}
          </Box>
          
          {onRefresh && (
            <Tooltip title="Refresh">
              <IconButton
                size="small"
                onClick={onRefresh}
                disabled={loading}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}

      {/* Status Message */}
      {statusMessage && (
        <Alert
          severity={getStatusSeverity()}
          sx={{ borderRadius: 0 }}
        >
          {statusMessage}
        </Alert>
      )}

      {/* Widget Content */}
      <Box sx={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {children}
      </Box>
    </Box>
  );
};