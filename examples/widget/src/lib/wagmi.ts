import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, mainnet, polygon } from "wagmi/chains";

// Unichain definition (not in wagmi/chains yet)
const unichain = {
  id: 130,
  name: "Unichain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://mainnet.unichain.org"] },
  },
  blockExplorers: {
    default: { name: "Uniscan", url: "https://uniscan.xyz" },
  },
} as const;

export const config = getDefaultConfig({
  appName: "External Orders Widget",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "demo",
  chains: [base, polygon, mainnet, unichain],
  ssr: true,
});

