# External Orders Widget

A Next.js widget for interacting with the Bankr External Orders API. Supports limit, stop, DCA, and TWAP orders with wallet connection and EIP-712 signing.

## Features

- **Wallet Connection**: Connect via RainbowKit (supports WalletConnect, Base wallet, MetaMask, etc.)
- **Chain Support**: Base (more soon)
- **Order Types**: Limit Buy/Sell, Stop Buy/Sell, DCA, TWAP
- **Order Management**: View, track, and cancel orders
- **EIP-712 Signing**: Secure order signing with typed data

## Setup

1. Install dependencies:

```bash
bun install
```

2. Create `.env.local` file:

```env
# Backend API (server-side, not exposed to browser)
API_BACKEND_URL=https://api.bankr.bot/trading/order
API_KEY=your-api-key-here

# Client-side (optional overrides)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your-walletconnect-project-id
```

3. Run the development server:

```bash
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable                                | Description                                                                        | Required |
| --------------------------------------- | ---------------------------------------------------------------------------------- | -------- |
| `API_BACKEND_URL`                       | Backend API URL (server-side only, default: `https://api.bankr.bot/trading/order`) | No       |
| `API_KEY`                               | API key (server-side only)                                                         | Yes      |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | WalletConnect project ID (use "demo" for local)                                    | No       |
| `NEXT_PUBLIC_API_BASE_URL`              | Override proxy path (default: `/api/order`)                                        | No       |

### Getting an API Key

Create an API [https://bankr.bot/api](https://bankr.bot/api)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── order/[...path]/route.ts  # API proxy (avoids CORS)
│   ├── layout.tsx      # Root layout with providers
│   ├── page.tsx        # Main widget page
│   ├── providers.tsx   # wagmi + RainbowKit + React Query providers
│   └── globals.css     # Tailwind styles
├── components/
│   ├── WalletButton.tsx   # Wallet connect/disconnect button
│   ├── OrderForm.tsx      # Order creation form
│   ├── OrderList.tsx      # Orders table view
│   └── OrderDetail.tsx    # Order details modal with cancel
└── lib/
    ├── api.ts          # API client functions
    ├── types.ts        # TypeScript interfaces
    ├── constants.ts    # Chain configs, tokens, order types
    ├── wagmi.ts        # wagmi/RainbowKit configuration
    └── hooks/
        ├── useOrderSubmit.ts  # Quote + sign + submit flow
        ├── useOrders.ts       # List orders with polling
        └── useCancel.ts       # Cancel order flow
```

## API Endpoints Used

| Endpoint           | Method | Description            |
| ------------------ | ------ | ---------------------- |
| `/quote`           | POST   | Create order quote     |
| `/submit`          | POST   | Submit signed order    |
| `/list`            | POST   | List orders for wallet |
| `/:orderId`        | GET    | Get order details      |
| `/cancel/:orderId` | POST   | Cancel order           |

## Order Flow

1. User fills order form (type, tokens, amount, price/interval)
2. Widget creates quote via `/quote` endpoint
3. If approval needed, user approves token spend
4. User signs EIP-712 typed data
5. Widget submits order via `/submit` endpoint
6. Order appears in orders list

## Cancel Flow

1. User clicks cancel on an open order
2. Widget constructs CancelOrder EIP-712 typed data
3. User signs cancellation
4. Widget calls `/cancel/:orderId` with signature

## License

MIT
