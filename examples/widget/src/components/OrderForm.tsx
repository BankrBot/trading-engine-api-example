"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useAccount, useChainId, useBalance } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import {
  ORDER_TYPES,
  ORDER_TYPE_LABELS,
  ORDER_TYPE_DESCRIPTIONS,
  COMMON_TOKENS,
  DEFAULT_SLIPPAGE_BPS,
  MIN_EXPIRATION_HOURS,
  MIN_INTERVAL_SECONDS,
  APP_FEE_BPS,
  APP_FEE_RECIPIENT,
  type OrderType,
} from "@/lib/constants";
import type {
  QuoteRequest,
  LimitOrderConfig,
  StopOrderConfig,
  TimeIntervalOrderConfig,
} from "@/lib/types";
import { useOrderSubmit } from "@/lib/hooks/useOrderSubmit";
import { createQuote } from "@/lib/api";
import cogoToast from "cogo-toast";

export function OrderForm() {
  const { address } = useAccount();
  const chainId = useChainId();

  // Form state
  const [orderType, setOrderType] = useState<OrderType>("limit-buy");
  const [sellToken, setSellToken] = useState("");
  const [buyToken, setBuyToken] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [triggerPrice, setTriggerPrice] = useState("");
  const [trailing, setTrailing] = useState(false);
  const [interval, setInterval] = useState("600"); // 10 minutes default
  const [maxExecutions, setMaxExecutions] = useState("5");
  const [slippageBps, setSlippageBps] = useState(
    DEFAULT_SLIPPAGE_BPS.toString()
  );
  const [expirationHours, setExpirationHours] = useState("24");

  // Get available tokens for current chain
  const tokens = useMemo(() => COMMON_TOKENS[chainId] || [], [chainId]);

  // Set default tokens when chain changes
  useMemo(() => {
    if (tokens.length >= 2) {
      setSellToken(tokens[0].address);
      setBuyToken(tokens[1].address);
    }
  }, [tokens]);

  // Get sell token info
  const sellTokenInfo = useMemo(
    () => tokens.find((t) => t.address === sellToken),
    [tokens, sellToken]
  );

  // Fetch sell token balance
  const { data: balanceData } = useBalance({
    address,
    token: sellToken as `0x${string}` | undefined,
    query: {
      enabled: !!address && !!sellToken,
    },
  });

  // Format balance for display
  const formattedBalance = useMemo(() => {
    if (!balanceData) return null;
    const num = parseFloat(
      formatUnits(balanceData.value, balanceData.decimals)
    );
    if (num < 0.0001) return "<0.0001";
    if (num < 1) return num.toFixed(4);
    if (num < 1000) return num.toFixed(2);
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }, [balanceData]);

  // Get buy token info
  const buyTokenInfo = useMemo(
    () => tokens.find((t) => t.address === buyToken),
    [tokens, buyToken]
  );

  // Check if it's a time-based order
  const isTimeOrder = orderType === "dca" || orderType === "twap";
  const isStopOrder = orderType === "stop-buy" || orderType === "stop-sell";

  // Market price state (from debounced quote)
  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch market price via quote endpoint (debounced)
  const fetchMarketPrice = useCallback(async () => {
    if (
      !address ||
      !sellToken ||
      !buyToken ||
      !sellAmount ||
      sellToken === buyToken
    ) {
      setMarketPrice(null);
      setPriceError(null);
      return;
    }

    const parsedAmount = parseFloat(sellAmount);
    if (parsedAmount <= 0) {
      setMarketPrice(null);
      setPriceError(null);
      return;
    }

    setIsLoadingPrice(true);
    setPriceError(null);

    try {
      const decimals = sellTokenInfo?.decimals || 18;
      const sellAmountRaw = parseUnits(sellAmount, decimals).toString();
      const expirationDate =
        Math.floor(Date.now() / 1000) + parseInt(expirationHours) * 3600;

      // Use limit-buy order type with a dummy trigger price to get market quote
      const quoteRequest: QuoteRequest = {
        maker: address,
        orderType: "limit-buy",
        config: { triggerPrice: 1 }, // Dummy price - we only care about marketBuyAmount
        chainId,
        sellToken,
        buyToken,
        sellAmount: sellAmountRaw,
        slippageBps: 100,
        expirationDate,
        appFeeBps: APP_FEE_BPS,
        appFeeRecipient: APP_FEE_RECIPIENT,
      };

      const response = await createQuote(quoteRequest);

      // Debug logging
      console.log("[OrderForm] Quote response:", JSON.stringify(response, null, 2));
      console.log("[OrderForm] metadata:", response.metadata);
      console.log("[OrderForm] sellToken:", response.metadata?.sellToken);
      console.log("[OrderForm] buyToken.marketBuyAmount:", response.metadata?.buyToken?.marketBuyAmount);

      // Calculate market price from response: sellAmount / buyToken.marketBuyAmount
      if (!response.metadata?.sellToken?.amount?.raw) {
        console.error("[OrderForm] sellToken.amount.raw is missing:", response.metadata?.sellToken);
        throw new Error("sellToken amount not available in response");
      }
      if (!response.metadata?.buyToken?.marketBuyAmount?.raw) {
        console.error("[OrderForm] buyToken.marketBuyAmount.raw is missing:", response.metadata?.buyToken);
        throw new Error("buyToken.marketBuyAmount not available in response");
      }

      const sellRaw = BigInt(response.metadata.sellToken.amount.raw);
      const marketBuyRaw = BigInt(response.metadata.buyToken.marketBuyAmount.raw);

      if (marketBuyRaw > 0n) {
        const sellDecimals = response.metadata.sellToken.decimals;
        const buyDecimals = response.metadata.buyToken.decimals;

        // For sell orders: price = buyToken per sellToken (e.g., 2000 USDC per WETH)
        // For buy orders: price = sellToken per buyToken (e.g., 2000 USDC per WETH)
        // This matches backend's triggerToken/baseToken convention
        const isSellOrder = orderType === "limit-sell" || orderType === "stop-sell";

        let price: number;
        if (isSellOrder) {
          // buyAmount / sellAmount = USDC per WETH (for selling WETH)
          price =
            (Number(marketBuyRaw) * Math.pow(10, sellDecimals)) /
            (Number(sellRaw) * Math.pow(10, buyDecimals));
        } else {
          // sellAmount / buyAmount = USDC per WETH (for buying WETH with USDC)
          price =
            (Number(sellRaw) * Math.pow(10, buyDecimals)) /
            (Number(marketBuyRaw) * Math.pow(10, sellDecimals));
        }

        setMarketPrice(price);
        setPriceError(null);
      } else {
        setMarketPrice(null);
        setPriceError("No liquidity available");
      }
    } catch (err) {
      console.error("Failed to fetch market price:", err);
      setMarketPrice(null);
      setPriceError(
        err instanceof Error ? err.message : "Failed to fetch price"
      );
    } finally {
      setIsLoadingPrice(false);
    }
  }, [
    address,
    sellToken,
    buyToken,
    sellAmount,
    chainId,
    sellTokenInfo?.decimals,
    expirationHours,
  ]);

  // Debounced effect to fetch market price when inputs change
  useEffect(() => {
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Reset price and error when key inputs change
    setMarketPrice(null);
    setPriceError(null);

    // Don't fetch if missing required inputs
    if (
      !address ||
      !sellToken ||
      !buyToken ||
      !sellAmount ||
      sellToken === buyToken
    ) {
      return;
    }

    const parsedAmount = parseFloat(sellAmount);
    if (parsedAmount <= 0) {
      return;
    }

    // Debounce the fetch
    debounceRef.current = setTimeout(() => {
      fetchMarketPrice();
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [address, sellToken, buyToken, sellAmount, chainId, fetchMarketPrice]);

  // Format market price for display
  const formattedMarketPrice = useMemo(() => {
    if (marketPrice === null) return null;
    if (marketPrice < 0.0001) return marketPrice.toExponential(2);
    if (marketPrice < 1) return marketPrice.toFixed(6);
    if (marketPrice < 1000) return marketPrice.toFixed(4);
    return marketPrice.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }, [marketPrice]);

  // Order submission hook
  const { submit, isLoading, error, step } = useOrderSubmit();

  // Build quote request
  const buildQuoteRequest = (): QuoteRequest | null => {
    if (!address || !sellToken || !buyToken || !sellAmount) return null;

    const decimals = sellTokenInfo?.decimals || 18;
    const sellAmountRaw = parseUnits(sellAmount, decimals).toString();

    const expirationDate =
      Math.floor(Date.now() / 1000) + parseInt(expirationHours) * 3600;

    let config: LimitOrderConfig | StopOrderConfig | TimeIntervalOrderConfig;

    if (isTimeOrder) {
      config = {
        interval: parseInt(interval),
        maxExecutions: parseInt(maxExecutions),
      };
    } else if (isStopOrder) {
      config = {
        triggerPrice: parseFloat(triggerPrice),
        trailing,
      };
    } else {
      config = {
        triggerPrice: parseFloat(triggerPrice),
      };
    }

    return {
      maker: address,
      orderType,
      config,
      chainId,
      sellToken,
      buyToken,
      sellAmount: sellAmountRaw,
      slippageBps: parseInt(slippageBps),
      expirationDate,
      appFeeBps: APP_FEE_BPS,
      appFeeRecipient: APP_FEE_RECIPIENT,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const quoteRequest = buildQuoteRequest();
    if (!quoteRequest) return;

    const order = await submit(quoteRequest);
    if (order) {
      cogoToast.success(
        `Order created successfully! ID: ${order.orderId.slice(0, 10)}...`,
        {
          position: "top-right",
          heading: "Order Submitted",
        }
      );
      // Reset form
      setSellAmount("");
      setTriggerPrice("");
    }
  };

  // Validation
  const isValid = useMemo(() => {
    if (!sellToken || !buyToken || !sellAmount || sellToken === buyToken)
      return false;
    if (parseFloat(sellAmount) <= 0) return false;
    if (!isTimeOrder && (!triggerPrice || parseFloat(triggerPrice) <= 0))
      return false;
    if (isTimeOrder) {
      if (parseInt(interval) < MIN_INTERVAL_SECONDS) return false;
      if (parseInt(maxExecutions) < 1) return false;
    }
    return true;
  }, [
    sellToken,
    buyToken,
    sellAmount,
    triggerPrice,
    isTimeOrder,
    interval,
    maxExecutions,
  ]);

  return (
    <form onSubmit={handleSubmit} className="card space-y-6">
      {/* Order Type Selector */}
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-2">
          Order Type
        </label>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {ORDER_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setOrderType(type)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                orderType === type
                  ? "bg-primary-600 text-white"
                  : "bg-surface-800 text-surface-400 hover:bg-surface-700"
              }`}
            >
              {ORDER_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
        <p className="text-xs text-surface-500 mt-2">
          {ORDER_TYPE_DESCRIPTIONS[orderType]}
        </p>
      </div>

      {/* Token Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">
            Sell Token
          </label>
          <select
            value={sellToken}
            onChange={(e) => setSellToken(e.target.value)}
            className="input"
          >
            <option value="">Select token</option>
            {tokens.map((token) => (
              <option key={token.address} value={token.address}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">
            Buy Token
          </label>
          <select
            value={buyToken}
            onChange={(e) => setBuyToken(e.target.value)}
            className="input"
          >
            <option value="">Select token</option>
            {tokens.map((token) => (
              <option key={token.address} value={token.address}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sell Amount */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-surface-300">
            Sell Amount {sellTokenInfo && `(${sellTokenInfo.symbol})`}
          </label>
          {formattedBalance && (
            <button
              type="button"
              onClick={() =>
                balanceData &&
                setSellAmount(
                  formatUnits(balanceData.value, balanceData.decimals)
                )
              }
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Balance: {formattedBalance} {sellTokenInfo?.symbol}
            </button>
          )}
        </div>
        <input
          type="number"
          value={sellAmount}
          onChange={(e) => setSellAmount(e.target.value)}
          placeholder="0.0"
          step="any"
          min="0"
          className="input"
        />
      </div>

      {/* Trigger Price (for limit/stop orders) */}
      {!isTimeOrder && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-surface-300">
              Trigger Price
            </label>
            {isLoadingPrice ? (
              <span className="text-xs text-surface-500">Loading price...</span>
            ) : priceError ? (
              <span className="text-xs text-red-400" title={priceError}>
                Price error:{" "}
                {priceError.length > 40
                  ? priceError.slice(0, 40) + "..."
                  : priceError}
              </span>
            ) : formattedMarketPrice ? (
              <span className="text-xs text-surface-400">
                Current:{" "}
                <span className="text-primary-400 font-mono">
                  {formattedMarketPrice}
                </span>{" "}
                {sellTokenInfo?.symbol}/{buyTokenInfo?.symbol}
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={triggerPrice}
              onChange={(e) => setTriggerPrice(e.target.value)}
              placeholder="0.0"
              step="any"
              min="0"
              className="input flex-1"
            />
            {marketPrice !== null && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setTriggerPrice((marketPrice * 0.9).toFixed(6))
                  }
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-300 transition-colors whitespace-nowrap"
                >
                  −10%
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTriggerPrice((marketPrice * 1.1).toFixed(6))
                  }
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-300 transition-colors whitespace-nowrap"
                >
                  +10%
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-surface-500 mt-1">
            Price in{" "}
            {orderType === "limit-sell" || orderType === "stop-sell"
              ? `${buyTokenInfo?.symbol || "buy token"} per ${sellTokenInfo?.symbol || "sell token"}`
              : `${sellTokenInfo?.symbol || "sell token"} per ${buyTokenInfo?.symbol || "buy token"}`}
          </p>
        </div>
      )}

      {/* Trailing (for stop orders) */}
      {isStopOrder && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="trailing"
            checked={trailing}
            onChange={(e) => setTrailing(e.target.checked)}
            className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="trailing" className="text-sm text-surface-300">
            Enable trailing stop
          </label>
        </div>
      )}

      {/* Time-based order settings */}
      {isTimeOrder && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Interval (seconds)
            </label>
            <input
              type="number"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              min={MIN_INTERVAL_SECONDS}
              step="1"
              className="input"
            />
            <p className="text-xs text-surface-500 mt-1">
              Min {MIN_INTERVAL_SECONDS}s (5 minutes)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Max Executions
            </label>
            <input
              type="number"
              value={maxExecutions}
              onChange={(e) => setMaxExecutions(e.target.value)}
              min="1"
              step="1"
              className="input"
            />
          </div>
        </div>
      )}

      {/* Advanced Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">
            Slippage (bps)
          </label>
          <input
            type="number"
            value={slippageBps}
            onChange={(e) => setSlippageBps(e.target.value)}
            min="0"
            max="2000"
            step="1"
            className="input"
          />
          <p className="text-xs text-surface-500 mt-1">
            {(parseInt(slippageBps) / 100).toFixed(2)}% slippage tolerance
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">
            Expiration (hours)
          </label>
          <input
            type="number"
            value={expirationHours}
            onChange={(e) => setExpirationHours(e.target.value)}
            min={MIN_EXPIRATION_HOURS}
            step="1"
            className="input"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Progress Display */}
      {isLoading && step && (
        <div className="p-3 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm">
          {step === "quote" && "Creating quote..."}
          {step === "approval" && "Waiting for approval transaction..."}
          {step === "signing" && "Sign the order in your wallet..."}
          {step === "submitting" && "Submitting order..."}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isValid || isLoading}
        className="w-full btn btn-primary py-3 text-lg"
      >
        {isLoading
          ? "Processing..."
          : `Create ${ORDER_TYPE_LABELS[orderType]} Order`}
      </button>
    </form>
  );
}
