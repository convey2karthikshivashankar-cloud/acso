// Component-specific types

import { ReactNode } from 'react';

// Common component props
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
  'data-testid'?: string;
}

// Layout component types
export interface LayoutProps extends BaseComponentProps {
  sidebar?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
}

export interface SidebarProps extends BaseComponentProps {
  collapsed?: boolean;
  onToggle?: () => void;
  items: NavigationItem[];
  activeItem?: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon?: ReactNode;
  path?: string;
  children?: NavigationItem[];
  badge?: {
    count: number;
    color: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  };
  permissions?: string[];
  disabled?: boolean;
}

export interface HeaderProps extends BaseComponentProps {
  title?: string;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  user?: User;
  onUserMenuClick?: () => void;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: ReactNode;
}

// Form component types
export interface FormProps extends BaseComponentProps {
  onSubmit: (data: any) => void;
  onCancel?: () => void;
  loading?: boolean;
  disabled?: boolean;
  initialValues?: Record<string, any>;
  validationSchema?: any;
}

export interface FormFieldProps extends BaseComponentProps {
  name: string;
  label?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helpText?: string;
  error?: string;
  value?: any;
  onChange?: (value: any) => void;
  options?: FormOption[];
}

// Table component types
export interface TableProps<T = any> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: TablePagination;
  sorting?: TableSorting;
  filtering?: TableFiltering;
  selection?: TableSelection<T>;
  actions?: TableAction<T>[];
  onRowClick?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;
}

export interface TableColumn<T = any> {
  id: string;
  label: string;
  field?: keyof T;
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  sticky?: boolean;
}

export interface TablePagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export interface TableSorting {
  field: string;
  direction: 'asc' | 'desc';
  onSortChange: (field: string, direction: 'asc' | 'desc') => void;
}

export interface TableFiltering {
  filters: TableFilter[];
  onFilterChange: (filters: TableFilter[]) => void;
}

export interface TableFilter {
  field: string;
  operator: string;
  value: any;
}

export interface TableSelection<T = any> {
  selectedRows: T[];
  onSelectionChange: (selectedRows: T[]) => void;
  selectAll?: boolean;
  onSelectAllChange?: (selectAll: boolean) => void;
}

export interface TableAction<T = any> {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: (row: T) => void;
  disabled?: (row: T) => boolean;
  visible?: (row: T) => boolean;
}

// Chart component types
export interface ChartProps extends BaseComponentProps {
  data: ChartData[];
  type: ChartType;
  options?: ChartOptions;
  loading?: boolean;
  error?: string;
  onDataPointClick?: (dataPoint: ChartData) => void;
}

export interface MetricCardProps extends BaseComponentProps {
  title: string;
  value: number | string;
  unit?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    period: string;
  };
  icon?: ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
}

// Modal component types
export interface ModalProps extends BaseComponentProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  actions?: ModalAction[];
  loading?: boolean;
  disableBackdropClick?: boolean;
  disableEscapeKeyDown?: boolean;
}

export interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  disabled?: boolean;
  loading?: boolean;
}

// Notification component types
export interface NotificationProps extends BaseComponentProps {
  notification: Notification;
  onClose?: () => void;
  onAction?: (action: NotificationAction) => void;
  autoHideDuration?: number;
}

export interface NotificationProviderProps extends BaseComponentProps {
  maxNotifications?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

// Loading component types
export interface LoadingSpinnerProps extends BaseComponentProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'inherit';
  message?: string;
}

export interface SkeletonProps extends BaseComponentProps {
  variant?: 'text' | 'rectangular' | 'circular';
  width?: number | string;
  height?: number | string;
  animation?: 'pulse' | 'wave' | false;
}

// Search component types
export interface SearchBoxProps extends BaseComponentProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  suggestions?: string[];
  loading?: boolean;
  debounceMs?: number;
}

export interface SearchResultsProps extends BaseComponentProps {
  results: SearchResult;
  loading?: boolean;
  onResultClick?: (result: any) => void;
  onLoadMore?: () => void;
}

// Filter component types
export interface FilterPanelProps extends BaseComponentProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onReset?: () => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface FilterChipProps extends BaseComponentProps {
  filter: FilterConfig;
  value: any;
  onRemove: () => void;
  onEdit?: () => void;
}

// Dashboard component types
export interface DashboardProps extends BaseComponentProps {
  config: DashboardConfig;
  onConfigChange?: (config: DashboardConfig) => void;
  editable?: boolean;
  loading?: boolean;
}

export interface WidgetProps extends BaseComponentProps {
  config: WidgetConfig;
  data?: any;
  loading?: boolean;
  error?: string;
  onConfigChange?: (config: WidgetConfig) => void;
  onRefresh?: () => void;
  editable?: boolean;
}

export interface GridLayoutProps extends BaseComponentProps {
  layouts: GridLayout[];
  onLayoutChange?: (layouts: GridLayout[]) => void;
  editable?: boolean;
  responsive?: boolean;
  breakpoints?: Record<string, number>;
  cols?: Record<string, number>;
}

// Agent component types
export interface AgentCardProps extends BaseComponentProps {
  agent: Agent;
  onClick?: () => void;
  onStart?: () => void;
  onStop?: () => void;
  onRestart?: () => void;
  onConfigure?: () => void;
  showActions?: boolean;
}

export interface AgentStatusProps extends BaseComponentProps {
  status: AgentStatus;
  health: HealthStatus;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export interface AgentMetricsProps extends BaseComponentProps {
  metrics: AgentMetrics;
  timeRange?: TimeRange;
  refreshInterval?: number;
}

// Workflow component types
export interface WorkflowDesignerProps extends BaseComponentProps {
  workflow: Workflow;
  onChange: (workflow: Workflow) => void;
  readonly?: boolean;
  onSave?: () => void;
  onExecute?: () => void;
}

export interface WorkflowNodeProps extends BaseComponentProps {
  node: WorkflowNode;
  selected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onDelete?: () => void;
  readonly?: boolean;
}

export interface WorkflowExecutionProps extends BaseComponentProps {
  execution: WorkflowExecution;
  onStepClick?: (step: ExecutionStep) => void;
  onCancel?: () => void;
  onRetry?: () => void;
  realTime?: boolean;
}

// Incident component types
export interface IncidentCardProps extends BaseComponentProps {
  incident: Incident;
  onClick?: () => void;
  onAssign?: (userId: string) => void;
  onStatusChange?: (status: IncidentStatus) => void;
  showActions?: boolean;
}

export interface IncidentTimelineProps extends BaseComponentProps {
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
  onAddComment?: (comment: string) => void;
  loading?: boolean;
}

export interface EvidenceViewerProps extends BaseComponentProps {
  evidence: Evidence[];
  onEvidenceClick?: (evidence: Evidence) => void;
  onAnalyze?: (evidenceId: string) => void;
  loading?: boolean;
}

// Financial component types
export interface CostChartProps extends BaseComponentProps {
  data: CostData[];
  timeRange: TimeRange;
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
  onDrillDown?: (dimension: string, value: string) => void;
}

export interface ROICalculatorProps extends BaseComponentProps {
  calculation: ROICalculation;
  onChange: (calculation: ROICalculation) => void;
  onCalculate: () => void;
  results?: ROIResults;
  loading?: boolean;
}

export interface BudgetTrackerProps extends BaseComponentProps {
  budgets: BudgetData[];
  onBudgetClick?: (budget: BudgetData) => void;
  onAddBudget?: () => void;
  loading?: boolean;
}

// Theme component types
export interface ThemeProviderProps extends BaseComponentProps {
  theme?: ThemeConfig;
  onThemeChange?: (theme: ThemeConfig) => void;
}

export interface ThemeSwitcherProps extends BaseComponentProps {
  currentTheme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
}

// Error component types
export interface ErrorBoundaryProps extends BaseComponentProps {
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

export interface ErrorFallbackProps extends BaseComponentProps {
  error: Error;
  resetError: () => void;
}

// Accessibility types
export interface A11yProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean;
  'aria-disabled'?: boolean;
  'aria-hidden'?: boolean;
  role?: string;
  tabIndex?: number;
}