# Trading Engine API Example

This example shows how to place an order using direct API calls with viem for wallet operations.

## Full Example: Quote, Sign, Submit

```ts
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const API_BASE_URL = "https://api.bankr.bot/trading/order";
const API_KEY = process.env.API_KEY!;

async function placeOrder() {
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

  const client = createWalletClient({
    account,
    chain: base,
    transport: http(process.env.RPC_URL),
  }).extend(publicActions);

  // 1) Request a quote
  const quoteResponse = await fetch(`${API_BASE_URL}/quote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({
      maker: account.address,
      orderType: "limit-buy",
      config: { triggerPrice: "2500" }, // decimal string
      chainId: base.id,
      sellToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
      buyToken: "0x4200000000000000000000000000000000000006", // WETH on Base
      sellAmount: "1000000", // 1.0 USDC in raw units (6 decimals)
      slippageBps: 100, // 1%
      expirationDate: Math.floor(Date.now() / 1000) + 3600,
    }),
  });

  if (!quoteResponse.ok) {
    const error = await quoteResponse.json();
    throw new Error(error.error?.message || "Quote request failed");
  }

  const quote = await quoteResponse.json();

  // 2) If an approval action is present, send that tx before signing
  const approval = quote.actions.find((a: any) => a.type === "approval");
  if (approval) {
    const hash = await client.sendTransaction({
      to: approval.to as `0x${string}`,
      data: approval.data as `0x${string}`,
      value: BigInt(approval.value ?? "0"),
    });
    await client.waitForTransactionReceipt({ hash });
  }

  // 3) Sign the EIP-712 order payload
  const signAction = quote.actions.find(
    (a: any) => a.type === "orderSignature"
  );
  if (!signAction) {
    throw new Error("No orderSignature action returned");
  }

  const { domain, types, message } = signAction.typedData;
  const orderSignature = await client.signTypedData({
    domain: {
      name: domain.name,
      version: domain.version,
      chainId: domain.chainId,
      verifyingContract: domain.verifyingContract as `0x${string}`,
    },
    types,
    primaryType: "Order",
    message,
  });

  // 4) Submit the signed order
  const submitResponse = await fetch(`${API_BASE_URL}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({
      quoteId: quote.quoteId,
      orderSignature,
    }),
  });

  if (!submitResponse.ok) {
    const error = await submitResponse.json();
    throw new Error(error.error?.message || "Submit request failed");
  }

  const order = await submitResponse.json();
  console.log("Order submitted:", order.orderId, "status:", order.status);
}

placeOrder().catch(console.error);
```

## Environment Variables

Set these before running:

- `API_KEY` - Your API key
- `RPC_URL` - RPC endpoint for Base (e.g., `https://mainnet.base.org`)
- `PRIVATE_KEY` - Wallet private key (with `0x` prefix)

## API Endpoints

| Endpoint            | Method | Description                  |
| ------------------- | ------ | ---------------------------- |
| `/quote`            | POST   | Request a quote for an order |
| `/submit`           | POST   | Submit a signed order        |
| `/list`             | POST   | List orders for a wallet     |
| `/{orderId}`        | GET    | Get order by ID              |
| `/cancel/{orderId}` | POST   | Cancel an order              |

## Order Types

- `limit-buy` - Buy when price falls to target
- `limit-sell` - Sell when price rises to target
- `stop-buy` - Buy when price rises above trigger
- `stop-sell` - Sell when price falls below trigger
- `dca` - Dollar-cost average over time intervals
- `twap` - Time-weighted average price execution

## Quote Request Schema

```ts
interface QuoteRequest {
  maker: string; // Wallet address
  orderType: string; // See order types above
  config: OrderConfig; // Order-type-specific config
  chainId: number; // Chain ID (e.g., 8453 for Base)
  sellToken: string; // Token address to sell
  buyToken: string; // Token address to buy
  sellAmount: string; // Amount in raw units (bigint string)
  slippageBps: number; // Slippage tolerance in basis points
  expirationDate: number; // Unix timestamp
  appFeeBps?: number; // Optional app fee in basis points
  appFeeRecipient?: string; // Optional fee recipient address
  allowPartial?: boolean; // Allow partial fills
}

// Config for limit-buy, limit-sell
interface LimitOrderConfig {
  triggerPrice: string; // Decimal price as string
}

// Config for stop-buy, stop-sell
interface StopOrderConfig {
  triggerPrice: string; // Decimal price as string
  trailing?: boolean; // Enable trailing stop
}

// Config for dca, twap
interface TimeIntervalOrderConfig {
  interval: number; // Seconds between executions (min 300)
  maxExecutions: number; // Number of executions
}
```

## Quote Response Schema

```ts
interface QuoteResponse {
  quoteId: string;
  actions: Array<ApprovalAction | OrderSignatureAction>;
  metadata: {
    sellToken: TokenMetadata;
    buyToken: TokenMetadata;
  };
}

interface ApprovalAction {
  type: "approval";
  to: string; // Contract to approve
  data: string; // Calldata for approval tx
  value?: string;
}

interface OrderSignatureAction {
  type: "orderSignature";
  typedData: {
    domain: TypedDataDomain;
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: "Order";
    message: Record<string, unknown>;
  };
}
```

## Submit Request Schema

```ts
interface SubmitRequest {
  quoteId: string; // From quote response
  orderSignature: string; // EIP-712 signature
}
```
