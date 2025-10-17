// Core application types

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  permissions: Permission[];
  preferences: UserPreferences;
  lastLogin: Date;
  isActive: boolean;
  avatar?: string;
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  dashboardConfig?: DashboardConfig;
}

export interface Permission {
  resource: string;
  actions: PermissionAction[];
  conditions?: PermissionCondition[];
}

export type PermissionAction = 'read' | 'write' | 'execute' | 'admin';

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'not_in';
  value: any;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
  notifications: NotificationPreferences;
  dashboard: DashboardPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  channels: string[];
  frequency: 'immediate' | 'hourly' | 'daily';
}

export interface DashboardPreferences {
  defaultView: string;
  refreshInterval: number;
  widgetSettings: Record<string, any>;
}

// Authentication types
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthProvider {
  type: 'oauth' | 'saml' | 'ldap' | 'local';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
}

// API types
export interface APIResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  errors?: ValidationError[];
  pagination?: PaginationInfo;
  metadata?: ResponseMetadata;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ResponseMetadata {
  requestId: string;
  timestamp: Date;
  version: string;
}

// Agent types
export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  health: HealthStatus;
  configuration: AgentConfiguration;
  metrics: AgentMetrics;
  lastHeartbeat: Date;
  version: string;
  capabilities: string[];
}

export type AgentType = 
  | 'supervisor' 
  | 'threat_hunter' 
  | 'incident_response' 
  | 'service_orchestration' 
  | 'financial_intelligence';

export type AgentStatus = 'active' | 'inactive' | 'error' | 'maintenance';
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface AgentConfiguration {
  [key: string]: any;
}

export interface AgentMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkIO: number;
  diskIO: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
}

// Workflow types
export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: string;
  status: WorkflowStatus;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  configuration: WorkflowConfiguration;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export type WorkflowStatus = 'draft' | 'active' | 'inactive' | 'archived';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
  style?: Record<string, any>;
}

export type WorkflowNodeType = 
  | 'start' 
  | 'end' 
  | 'task' 
  | 'decision' 
  | 'approval' 
  | 'parallel' 
  | 'merge';

export interface WorkflowNodeData {
  label: string;
  agent?: string;
  action?: string;
  parameters?: Record<string, any>;
  timeout?: number;
  retries?: number;
  approvalRequired?: boolean;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
  label?: string;
}

export interface WorkflowConfiguration {
  timeout: number;
  retries: number;
  errorHandling: 'stop' | 'continue' | 'retry';
  notifications: string[];
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  steps: ExecutionStep[];
  metrics: ExecutionMetrics;
  triggeredBy: string;
  parameters: Record<string, any>;
}

export type ExecutionStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'paused';

export interface ExecutionStep {
  id: string;
  nodeId: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  output?: any;
  error?: string;
  agent?: string;
}

export interface ExecutionMetrics {
  duration: number;
  stepsCompleted: number;
  stepsTotal: number;
  resourceUsage: Record<string, number>;
}

// Incident types
export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category: string;
  source: string;
  assignee?: User;
  reporter: User;
  timeline: TimelineEvent[];
  evidence: Evidence[];
  actions: ResponseAction[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  metadata: Record<string, any>;
}

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 
  | 'open' 
  | 'investigating' 
  | 'contained' 
  | 'resolved' 
  | 'closed' 
  | 'false_positive';

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'created' | 'updated' | 'action' | 'comment' | 'status_change';
  description: string;
  user: User;
  data?: any;
}

export interface Evidence {
  id: string;
  type: 'log' | 'file' | 'network' | 'system' | 'screenshot';
  source: string;
  timestamp: Date;
  data: any;
  hash?: string;
  analysis?: AnalysisResult;
}

export interface AnalysisResult {
  confidence: number;
  findings: string[];
  recommendations: string[];
  riskScore: number;
}

export interface ResponseAction {
  id: string;
  type: 'manual' | 'automated';
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  executedBy?: User;
  executedAt?: Date;
  parameters?: Record<string, any>;
  result?: any;
}

// Dashboard types
export interface DashboardConfig {
  id: string;
  name: string;
  role: string;
  layout: GridLayout[];
  widgets: WidgetConfig[];
  refreshInterval: number;
  filters: FilterConfig[];
  isDefault: boolean;
}

export interface GridLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  dataSource: string;
  configuration: Record<string, any>;
  refreshInterval?: number;
  filters?: FilterConfig[];
}

export type WidgetType = 
  | 'metric' 
  | 'chart' 
  | 'table' 
  | 'list' 
  | 'status' 
  | 'map' 
  | 'custom';

export interface FilterConfig {
  field: string;
  operator: string;
  value: any;
  label?: string;
}

// Notification types
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
  actions?: NotificationAction[];
  metadata?: Record<string, any>;
}

export type NotificationType = 
  | 'system' 
  | 'security' 
  | 'workflow' 
  | 'incident' 
  | 'agent' 
  | 'financial';

export interface NotificationAction {
  label: string;
  action: string;
  parameters?: Record<string, any>;
}

// Theme types
export interface ThemeConfig {
  mode: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
  customizations?: Record<string, any>;
}

// Search types
export interface SearchQuery {
  query: string;
  filters: SearchFilter[];
  sort?: SearchSort;
  pagination?: SearchPagination;
}

export interface SearchFilter {
  field: string;
  operator: string;
  value: any;
}

export interface SearchSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SearchPagination {
  page: number;
  limit: number;
}

export interface SearchResult<T = any> {
  items: T[];
  total: number;
  facets?: SearchFacet[];
  suggestions?: string[];
}

export interface SearchFacet {
  field: string;
  values: SearchFacetValue[];
}

export interface SearchFacetValue {
  value: string;
  count: number;
}

// Financial types
export interface CostData {
  timestamp: Date;
  amount: number;
  currency: string;
  service: string;
  region: string;
  tags: Record<string, string>;
  breakdown?: CostBreakdown[];
}

export interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface ROICalculation {
  investment: number;
  benefits: number[];
  timeHorizon: number;
  discountRate: number;
  results: ROIResults;
}

export interface ROIResults {
  roi: number;
  paybackPeriod: number;
  npv: number;
  irr: number;
  sensitivity: SensitivityAnalysis;
}

export interface SensitivityAnalysis {
  scenarios: ROIScenario[];
  variables: SensitivityVariable[];
}

export interface ROIScenario {
  name: string;
  probability: number;
  roi: number;
}

export interface SensitivityVariable {
  name: string;
  impact: number;
  range: [number, number];
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
  stack?: string;
}

// WebSocket types
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
  id?: string;
}

export interface WebSocketConfig {
  url: string;
  reconnectAttempts: number;
  reconnectInterval: number;
  heartbeatInterval: number;
}

// Chart types
export interface ChartData {
  timestamp: Date;
  value: number;
  category?: string;
  metadata?: Record<string, any>;
}

export interface ChartConfig {
  type: ChartType;
  data: ChartData[];
  options: ChartOptions;
}

export type ChartType = 
  | 'line' 
  | 'bar' 
  | 'pie' 
  | 'area' 
  | 'scatter' 
  | 'heatmap' 
  | 'sankey';

export interface ChartOptions {
  title?: string;
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  legend?: LegendConfig;
  colors?: string[];
  interactive?: boolean;
  responsive?: boolean;
}

export interface AxisConfig {
  label?: string;
  type?: 'linear' | 'logarithmic' | 'time' | 'category';
  min?: number;
  max?: number;
  format?: string;
}

export interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
}

// Form types
export interface FormField {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  validation?: ValidationRule[];
  options?: FormOption[];
  defaultValue?: any;
  placeholder?: string;
  helpText?: string;
}

export interface ValidationRule {
  type: string;
  value?: any;
  message: string;
}

export interface FormOption {
  label: string;
  value: any;
  disabled?: boolean;
}

// Export all types
export * from './api';
export * from './components';