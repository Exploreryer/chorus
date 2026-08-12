export type ProductId = 'chatgpt' | 'claude' | 'gemini' | 'perplexity' | 'grok' | 'manus';

export interface PlatformAdapter {
  inputSelectors: string[];
  submitSelectors: string[];
  authSelectors: string[];
  sentIndicators: string[];
  generatingIndicators: string[];
  confirmTimeoutMs: number;
}

export interface PlatformDefinition {
  id: ProductId;
  name: string;
  url: string;
  matches: string[];
  reusablePaths: string[];
  defaultEnabled: boolean;
  loginHints: string[];
  adapter: PlatformAdapter;
}

export type Product = Omit<PlatformDefinition, 'adapter'>;

export type DistributionErrorCode =
  | 'AUTH_REQUIRED'
  | 'INPUT_NOT_FOUND'
  | 'INPUT_NOT_EMPTY'
  | 'CONVERSATION_NOT_EMPTY'
  | 'SUBMIT_NOT_FOUND'
  | 'SUBMIT_NOT_CONFIRMED'
  | 'PAGE_LOAD_TIMEOUT'
  | 'CONTENT_SCRIPT_UNAVAILABLE'
  | 'TAB_CLOSED'
  | 'TASK_IN_PROGRESS'
  | 'TASK_INTERRUPTED'
  | 'UNKNOWN';

export interface DistributionResult {
  productId: ProductId;
  productName: string;
  success: boolean;
  reusedTab: boolean;
  tabId?: number;
  errorCode?: DistributionErrorCode;
  error?: string;
}

export type DistributionTaskStatus = 'running' | 'completed' | 'cancelled' | 'failed';

export interface DistributionTask {
  id: string;
  status: DistributionTaskStatus;
  prompt: string;
  productIds: ProductId[];
  completed: number;
  total: number;
  results: DistributionResult[];
  createdTabIds: number[];
  startedAt: string;
  updatedAt: string;
  errorCode?: DistributionErrorCode;
  error?: string;
}

export interface FillPromptRequest {
  action: 'fillPrompt';
  prompt: string;
  productId: ProductId;
}

export interface InspectPageRequest {
  action: 'inspectPage';
  productId: ProductId;
}

export type ContentScriptRequest = FillPromptRequest | InspectPageRequest;

export interface FillPromptResponse {
  success: boolean;
  errorCode?: DistributionErrorCode;
  error?: string;
}

export interface InspectPageResponse {
  ready: boolean;
  inputEmpty: boolean;
  conversationEmpty: boolean;
  authRequired: boolean;
}

export interface DistributeRequest {
  action: 'distribute';
  prompt: string;
  productIds: ProductId[];
}

export interface CancelDistributionRequest {
  action: 'cancelDistribution';
  taskId: string;
}

export interface GetDistributionTaskRequest {
  action: 'getDistributionTask';
}

export interface CheckPlatformReadinessRequest {
  action: 'checkPlatformReadiness';
}

export type BackgroundRequest =
  | DistributeRequest
  | CancelDistributionRequest
  | GetDistributionTaskRequest
  | CheckPlatformReadinessRequest;

export interface DistributeResponse {
  success: boolean;
  taskId?: string;
  task?: DistributionTask | null;
  errorCode?: DistributionErrorCode;
  error?: string;
}

export type PlatformReadiness = 'ready' | 'willOpen' | 'signIn' | 'unavailable';

export type PlatformReadinessMap = Partial<Record<ProductId, PlatformReadiness>>;

export interface DistributionTaskUpdatedMessage {
  action: 'distributionTaskUpdated';
  task: DistributionTask;
}
