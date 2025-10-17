// API-specific types

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