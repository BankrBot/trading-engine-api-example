import type { OrderType } from "./constants";

// Config types for different order types
export interface LimitOrderConfig {
  triggerPrice: string; // Decimal value as string
}

export interface StopOrderConfig {
  triggerPrice: string; // Decimal value as string
  trailing?: boolean;
}

export interface TimeIntervalOrderConfig {
  interval: number; // Seconds (min 300)
  maxExecutions: number;
}

export type OrderConfig =
  | LimitOrderConfig
  | StopOrderConfig
  | TimeIntervalOrderConfig;

// Quote request - sent to POST /quote
export interface QuoteRequest {
  maker: string;
  orderType: OrderType;
  config: OrderConfig;
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount: string; // Raw units bigint string
  slippageBps: number;
  expirationDate: number; // Unix timestamp
  appFeeBps?: number;
  appFeeRecipient?: string;
  allowPartial?: boolean;
}

// Amount representation
export interface Amount {
  raw: string;
  formatted: string;
}

// Token metadata in responses
export interface TokenMetadata {
  address: string;
  symbol?: string;
  name?: string;
  image?: string;
  decimals: number;
}

// Quote token metadata (includes amount)
export interface QuoteTokenMetadata extends TokenMetadata {
  amount: Amount | null;
}

// Buy token metadata (includes market buy amount for price calculation)
export interface BuyQuoteTokenMetadata extends QuoteTokenMetadata {
  marketBuyAmount: Amount;
}

// External order config DTOs (no orderType here; top-level orderType covers it)
export interface LimitOrderConfigDto {
  triggerPrice: string;
  submitPrice: number;
}

export interface StopOrderConfigDto {
  triggerPrice: string;
  trailing?: boolean;
  percentage?: number;
  submitPrice: number;
}

export interface DcaConfigDto {
  interval: number;
  maxExecutions: number;
}

export interface TwapConfigDto {
  interval: number;
  maxExecutions: number;
}

export type ExternalOrderConfig =
  | LimitOrderConfigDto
  | StopOrderConfigDto
  | DcaConfigDto
  | TwapConfigDto;

// EIP-712 typed data
export interface TypedDataDomain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export interface OrderTypedData {
  domain: TypedDataDomain;
  types: {
    Order: Array<{ name: string; type: string }>;
  };
  primaryType: "Order";
  message: Record<string, unknown>;
}

// Actions in quote response
export interface ApprovalAction {
  type: "approval";
  to: string;
  data: string;
  value?: string;
}

export interface OrderSignatureAction {
  type: "orderSignature";
  typedData: OrderTypedData;
}

export type QuoteAction = ApprovalAction | OrderSignatureAction;

// Quote response from POST /quote
export interface QuoteResponse {
  quoteId: string;
  actions: QuoteAction[];
  metadata: {
    sellToken: QuoteTokenMetadata;
    buyToken: BuyQuoteTokenMetadata;
  };
}

// Submit request - sent to POST /submit
export interface SubmitRequest {
  quoteId: string;
  orderSignature: string;
}

// Order fee
export interface OrderFee {
  recipientType: "Bankr" | "App";
  feeBps: number;
  feeRecipient?: string;
}

// Order status
export type OrderStatus =
  | "open"
  | "ready"
  | "pending"
  | "completed"
  | "cancelled"
  | "paused"
  | "expired"
  | "error";

// Execution history entry
export interface ExecutionHistoryEntry {
  executedAt: number;
  status: "success" | "failed" | "partial";
  output?: {
    txHash?: string;
    sellAmount?: Amount;
    buyAmount?: Amount;
  };
  error?: {
    type: string;
    message: string;
  };
}

// Protocol data - contains the contract address the order was signed against
export interface ProtocolData {
  protocol: string;
  protocolAddress: string;
  data: {
    order: Record<string, unknown>;
    orderSignature: string;
  };
}

// External order - returned from API
export interface ExternalOrder {
  orderId: string;
  orderType: OrderType;
  chainArch: "EVM";
  chainId: number;
  sellToken: QuoteTokenMetadata;
  buyToken: QuoteTokenMetadata;
  slippageBps: number;
  createdAt: number;
  expiresAt: number;
  status: OrderStatus;
  fees?: OrderFee[];
  appFeeBps?: number;
  appFeeRecipient?: string;
  allowPartial?: boolean;
  config: ExternalOrderConfig;
  protocolData?: ProtocolData;
  totalSoldAmount?: Amount;
  totalReceivedAmount?: Amount;
  executionHistory?: ExecutionHistoryEntry[];
}

// List orders request
export interface ListOrdersRequest {
  maker: string;
  type?: OrderType;
  status?: OrderStatus;
  cursor?: string;
}

// List orders response
export interface ListOrdersResponse {
  orders: ExternalOrder[];
  next?: string;
}

// Cancel order response
export interface CancelOrderResponse {
  status: string;
  success: boolean;
  error?: {
    type: string;
    message: string;
  };
}

// Get order response
export interface GetOrderResponse {
  order: ExternalOrder;
}

// API error response
export interface ApiError {
  error: {
    type: string;
    message: string;
    [key: string]: any;
  };
}
