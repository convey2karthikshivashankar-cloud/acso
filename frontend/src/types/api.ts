// API-specific types

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    request_id?: string;
  };
  timestamp: string;
  request_id?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
}

export interface APIClient {
  get<T>(url: string, params?: Record<string, any>): Promise<APIResponse<T>>;
  post<T>(url: string, data?: any): Promise<APIResponse<T>>;
  put<T>(url: string, data?: any): Promise<APIResponse<T>>;
  delete<T>(url: string): Promise<APIResponse<T>>;
  patch<T>(url: string, data?: any): Promise<APIResponse<T>>;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  requestId: string;
  status: number;
}

// Core data types matching backend models
export enum AgentStatus {
  ACTIVE = 'active',
  IDLE = 'idle',
  PROCESSING = 'processing',
  ERROR = 'error',
  OFFLINE = 'offline'
}

export enum AgentType {
  SUPERVISOR = 'supervisor',
  THREAT_HUNTER = 'threat-hunter',
  INCIDENT_RESPONSE = 'incident-response',
  SERVICE_ORCHESTRATION = 'service-orchestration',
  FINANCIAL_INTELLIGENCE = 'financial-intelligence'
}

export interface Agent {
  agent_id: string;
  agent_type: AgentType;
  status: AgentStatus;
  name: string;
  description: string;
  capabilities: string[];
  current_task?: string;
  last_activity: string;
  metrics: Record<string, any>;
}

export interface AgentConfiguration {
  agent_id: string;
  config: Record<string, any>;
  version: string;
  updated_by: string;
  updated_at: string;
}

export interface AgentMetrics {
  agent_id: string;
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  task_count: number;
  success_rate: number;
  avg_response_time: number;
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface Task {
  task_id: string;
  type: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_agent?: string;
  context: Record<string, any>;
  results: Record<string, any>;
  created_at: string;
  completed_at?: string;
}

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface WorkflowNode {
  node_id: string;
  type: string;
  name: string;
  config: Record<string, any>;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  edge_id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface Workflow {
  workflow_id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  created_by: string;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface WorkflowExecution {
  execution_id: string;
  workflow_id: string;
  status: TaskStatus;
  started_at: string;
  completed_at?: string;
  results: Record<string, any>;
  error?: string;
}

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum IncidentStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  CONTAINED = 'contained',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export interface Incident {
  incident_id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category: string;
  source: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  metadata: Record<string, any>;
  tags: string[];
}

export interface TimelineEvent {
  event_id: string;
  incident_id: string;
  type: string;
  description: string;
  timestamp: string;
  user_id?: string;
  metadata: Record<string, any>;
}

export interface ResponseAction {
  action_id: string;
  incident_id: string;
  name: string;
  description: string;
  status: TaskStatus;
  executed_by?: string;
  executed_at?: string;
  results: Record<string, any>;
}

export interface CostData {
  date: string;
  service: string;
  cost: number;
  currency: string;
  region?: string;
  tags: Record<string, string>;
}

export interface CostBreakdown {
  dimension: string;
  value: string;
  cost: number;
  percentage: number;
}

export interface ROICalculation {
  investment: number;
  benefits: number[];
  time_period: number;
  discount_rate: number;
}

export interface ROIResults {
  roi_percentage: number;
  npv: number;
  payback_period: number;
  irr: number;
}

export interface SearchQuery {
  query: string;
  filters: Record<string, any>;
  sort?: string;
  order: 'asc' | 'desc';
  limit: number;
  offset: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  query: string;
  took: number;
  facets: Record<string, any>;
}

export interface User {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  roles: string[];
  permissions: string[];
  last_login?: string;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface WebSocketMessage {
  type: string;
  data: Record<string, any>;
  timestamp: string;
  source?: string;
}

export interface APIConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
}

// Specific API endpoints
export interface AgentsAPI {
  getAgents(): Promise<APIResponse<Agent[]>>;
  getAgent(id: string): Promise<APIResponse<Agent>>;
  updateAgent(id: string, config: Partial<AgentConfiguration>): Promise<APIResponse<Agent>>;
  startAgent(id: string): Promise<APIResponse<void>>;
  stopAgent(id: string): Promise<APIResponse<void>>;
  restartAgent(id: string): Promise<APIResponse<void>>;
  getAgentLogs(id: string, params?: LogQueryParams): Promise<APIResponse<LogEntry[]>>;
  getAgentMetrics(id: string, timeRange?: TimeRange): Promise<APIResponse<AgentMetrics[]>>;
}

export interface WorkflowsAPI {
  getWorkflows(params?: WorkflowQueryParams): Promise<APIResponse<Workflow[]>>;
  getWorkflow(id: string): Promise<APIResponse<Workflow>>;
  createWorkflow(workflow: CreateWorkflowRequest): Promise<APIResponse<Workflow>>;
  updateWorkflow(id: string, workflow: UpdateWorkflowRequest): Promise<APIResponse<Workflow>>;
  deleteWorkflow(id: string): Promise<APIResponse<void>>;
  executeWorkflow(id: string, params?: Record<string, any>): Promise<APIResponse<WorkflowExecution>>;
  getWorkflowExecutions(workflowId: string): Promise<APIResponse<WorkflowExecution[]>>;
  getWorkflowExecution(executionId: string): Promise<APIResponse<WorkflowExecution>>;
}

export interface IncidentsAPI {
  getIncidents(params?: IncidentQueryParams): Promise<APIResponse<Incident[]>>;
  getIncident(id: string): Promise<APIResponse<Incident>>;
  createIncident(incident: CreateIncidentRequest): Promise<APIResponse<Incident>>;
  updateIncident(id: string, incident: UpdateIncidentRequest): Promise<APIResponse<Incident>>;
  assignIncident(id: string, assigneeId: string): Promise<APIResponse<Incident>>;
  addComment(id: string, comment: string): Promise<APIResponse<TimelineEvent>>;
  executeAction(id: string, actionId: string, params?: Record<string, any>): Promise<APIResponse<ResponseAction>>;
}

export interface FinancialAPI {
  getCostData(params: CostQueryParams): Promise<APIResponse<CostData[]>>;
  getCostBreakdown(params: CostBreakdownParams): Promise<APIResponse<CostBreakdown[]>>;
  calculateROI(calculation: ROICalculation): Promise<APIResponse<ROIResults>>;
  getBudgetData(params?: BudgetQueryParams): Promise<APIResponse<BudgetData[]>>;
  getForecast(params: ForecastParams): Promise<APIResponse<ForecastData[]>>;
}

export interface SearchAPI {
  search<T>(query: SearchQuery): Promise<APIResponse<SearchResult<T>>>;
  suggest(query: string, type?: string): Promise<APIResponse<string[]>>;
  getSearchHistory(): Promise<APIResponse<SearchQuery[]>>;
  saveSearch(query: SearchQuery, name: string): Promise<APIResponse<SavedSearch>>;
}

// Query parameter types
export interface LogQueryParams {
  level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface WorkflowQueryParams {
  status?: WorkflowStatus;
  tags?: string[];
  createdBy?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IncidentQueryParams {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  assignee?: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface CostQueryParams {
  startDate: Date;
  endDate: Date;
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
  services?: string[];
  regions?: string[];
  tags?: Record<string, string>;
}

export interface CostBreakdownParams {
  date: Date;
  dimension: 'service' | 'region' | 'tag' | 'account';
  limit?: number;
}

export interface BudgetQueryParams {
  year?: number;
  month?: number;
  department?: string;
}

export interface ForecastParams {
  startDate: Date;
  endDate: Date;
  model: 'linear' | 'exponential' | 'seasonal';
  confidence?: number;
}

// Request/Response types
export interface CreateWorkflowRequest {
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  configuration: WorkflowConfiguration;
  tags?: string[];
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  configuration?: WorkflowConfiguration;
  tags?: string[];
}

export interface CreateIncidentRequest {
  title: string;
  description: string;
  severity: IncidentSeverity;
  category: string;
  source: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface UpdateIncidentRequest {
  title?: string;
  description?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  category?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: SearchQuery;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetData {
  period: string;
  budgeted: number;
  actual: number;
  variance: number;
  category: string;
}

export interface ForecastData {
  date: Date;
  predicted: number;
  confidence: {
    lower: number;
    upper: number;
  };
}