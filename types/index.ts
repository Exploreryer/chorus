export type ProductId = 'chatgpt' | 'claude' | 'gemini' | 'perplexity' | 'grok' | 'manus';

export interface Product {
  id: ProductId;
  name: string;
  url: string;
  matches: string[];
  defaultEnabled: boolean;
  loginHints: string[];
}

export type DistributionErrorCode =
  | 'AUTH_REQUIRED'
  | 'INPUT_NOT_FOUND'
  | 'SUBMIT_NOT_FOUND'
  | 'PAGE_LOAD_TIMEOUT'
  | 'CONTENT_SCRIPT_UNAVAILABLE'
  | 'TAB_CLOSED'
  | 'UNKNOWN';

export interface DistributionProgress {
  completed: number;
  total: number;
  productId?: ProductId;
}

export interface DistributionResult {
  productId: ProductId;
  productName: string;
  success: boolean;
  reusedTab: boolean;
  tabId?: number;
  errorCode?: DistributionErrorCode;
  error?: string;
}

export interface FillPromptRequest {
  action: 'fillPrompt';
  prompt: string;
  productId: ProductId;
}

export interface FillPromptResponse {
  success: boolean;
  errorCode?: DistributionErrorCode;
  error?: string;
}

export interface DistributeRequest {
  action: 'distribute';
  prompt: string;
  productIds: ProductId[];
}

export interface CancelDistributionRequest {
  action: 'cancelDistribution';
}

export interface DistributeResponse {
  success?: boolean;
  cancelled?: boolean;
  results?: DistributionResult[];
  error?: string;
}

export interface DistributionState {
  createdTabIds: number[];
}
