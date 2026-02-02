// Type definitions for Chorus extension

export interface Product {
  id: string;
  name: string;
  url: string;
  selector?: string;
  submitSelector?: string;
  enabled: boolean;
}

export interface DistributionProgress {
  completed: number;
  total: number;
}

export interface DistributionResult {
  productName: string;
  success: boolean;
  error?: string;
}

export interface FillPromptRequest {
  action: 'fillPrompt';
  prompt: string;
  selector?: string;
  submitSelector?: string;
}

export interface FillPromptResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface DistributeRequest {
  action: 'distribute';
  prompt: string;
  products: Product[];
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
  tabIds: number[];
}
