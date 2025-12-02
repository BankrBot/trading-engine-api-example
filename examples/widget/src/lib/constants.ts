// API Configuration
// Use relative path to proxy through Next.js API routes (avoids CORS issues)
export const API_BASE_URL = "/api/order";

// Order type definitions
export const ORDER_TYPES = [
  "limit-buy",
  "limit-sell",
  "stop-buy",
  "stop-sell",
  "dca",
  "twap",
] as const;

export type OrderType = (typeof ORDER_TYPES)[number];

// Order type labels for UI
export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  "limit-buy": "Limit Buy",
  "limit-sell": "Limit Sell",
  "stop-buy": "Stop Buy",
  "stop-sell": "Stop Sell",
  dca: "DCA",
  twap: "TWAP",
};

// Order type descriptions
export const ORDER_TYPE_DESCRIPTIONS: Record<OrderType, string> = {
  "limit-buy": "Buy when price falls to target",
  "limit-sell": "Sell when price rises to target",
  "stop-buy": "Buy when price rises above trigger",
  "stop-sell": "Sell when price falls below trigger",
  dca: "Dollar-cost average over time intervals",
  twap: "Time-weighted average price execution",
};

// Chain ID to name mapping
export const CHAIN_NAMES: Record<number, string> = {
  8453: "Base",
  137: "Polygon",
  1: "Ethereum",
  130: "Unichain",
};

// Status labels and colors
export const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  ready: "Ready",
  pending: "Pending",
  completed: "Completed",
  cancelled: "Cancelled",
  paused: "Paused",
  expired: "Expired",
  error: "Error",
};

// BankrOrders contract addresses per chain
export const BANKR_ORDERS_ADDRESSES: Record<number, `0x${string}`> = {
  8453: "0xEEc572a465E8552129E0A715Fe5121F2C121CB10", // Base - placeholder
  137: "0xEEc572a465E8552129E0A715Fe5121F2C121CB10", // Polygon - placeholder
  1: "0xEEc572a465E8552129E0A715Fe5121F2C121CB10", // Mainnet - placeholder
  130: "0xEEc572a465E8552129E0A715Fe5121F2C121CB10", // Unichain - placeholder
};

// Common token addresses per chain
export const COMMON_TOKENS: Record<
  number,
  { address: `0x${string}`; symbol: string; decimals: number }[]
> = {
  8453: [
    // Base
    {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      symbol: "USDC",
      decimals: 6,
    },
    {
      address: "0x4200000000000000000000000000000000000006",
      symbol: "WETH",
      decimals: 18,
    },
    {
      address: "0x22af33fe49fd1fa80c7149773dde5890d3c76f3b",
      symbol: "BNKR",
      decimals: 18,
    },
  ],
  137: [
    // Polygon
    {
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      symbol: "USDC",
      decimals: 6,
    },
    {
      address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      symbol: "WETH",
      decimals: 18,
    },
  ],
  1: [
    // Mainnet
    {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      symbol: "USDC",
      decimals: 6,
    },
    {
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      symbol: "WETH",
      decimals: 18,
    },
  ],
  130: [
    // Unichain
    {
      address: "0x078D782b760474a361dDA0AF3839290b0EF57AD6",
      symbol: "USDC",
      decimals: 6,
    },
    {
      address: "0x4200000000000000000000000000000000000006",
      symbol: "WETH",
      decimals: 18,
    },
  ],
};

// Minimum values
export const MIN_EXPIRATION_HOURS = 1;
export const MIN_INTERVAL_SECONDS = 300; // 5 minutes
export const MAX_SLIPPAGE_BPS = 2000; // 20%
export const DEFAULT_SLIPPAGE_BPS = 100; // 1%

// App fee configuration
export const APP_FEE_BPS = 20; // 0.2%
export const APP_FEE_RECIPIENT = "0x2c64307F73F650e03299eb33b8a00A0d3ED442c2";
