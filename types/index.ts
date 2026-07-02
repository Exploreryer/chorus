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
  taskId: string;
}

export interface DistributeResponse {
  success?: boolean;
  taskId?: string;
  cancelled?: boolean;
  results?: DistributionResult[];
  error?: string;
}

export interface DistributionTask {
  id: string;
  tabIds: number[];
  total: number;
  completed: number;
  cancelled: boolean;
  inProgress: boolean;
}

export interface DistributionProgressMessage {
  action: 'distributionProgress';
  taskId: string;
  completed: number;
  total: number;
}

export interface DistributionCompleteMessage {
  action: 'distributionComplete';
  taskId: string;
  results: DistributionResult[];
}

export interface DistributionCancelledMessage {
  action: 'distributionCancelled';
  taskId: string;
}

export interface DistributionState {
  tabIds: number[];
}
