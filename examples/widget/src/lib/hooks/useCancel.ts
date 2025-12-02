"use client";

import { useState, useCallback } from "react";
import { useSignTypedData } from "wagmi";
import { cancelOrder } from "@/lib/api";
import { BANKR_ORDERS_ADDRESSES } from "@/lib/constants";
import type { CancelOrderResponse } from "@/lib/types";

interface UseCancelResult {
  cancel: (orderId: string, orderChainId: number) => Promise<CancelOrderResponse | null>;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

export function useCancel(): UseCancelResult {
  const { signTypedDataAsync } = useSignTypedData();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const cancel = useCallback(
    async (orderId: string, orderChainId: number): Promise<CancelOrderResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        // Build CancelOrder typed data - use ORDER's chainId, not connected wallet's
        const verifyingContract = BANKR_ORDERS_ADDRESSES[orderChainId];
        if (!verifyingContract) {
          throw new Error(`Unsupported chain: ${orderChainId}`);
        }

        // Sign the cancel order typed data
        const signature = await signTypedDataAsync({
          domain: {
            name: "BankrOrders",
            version: "1",
            chainId: orderChainId,
            verifyingContract,
          },
          types: {
            CancelOrder: [{ name: "orderId", type: "string" }],
          },
          primaryType: "CancelOrder",
          message: {
            orderId,
          },
        });

        // Call cancel API
        const result = await cancelOrder(orderId, signature);

        // Check if API returned an error in the response
        if (!result.success && result.error) {
          setError(result.error.message || "Cancel failed");
          setIsLoading(false);
          return result;
        }

        setIsLoading(false);
        return result;
      } catch (err: unknown) {
        let errorMessage = "Failed to cancel order";
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === "object" && err !== null) {
          // Handle case where error is an object with message property
          const errObj = err as {
            message?: string;
            error?: { message?: string };
          };
          errorMessage =
            errObj.message || errObj.error?.message || JSON.stringify(err);
        }
        setError(errorMessage);
        setIsLoading(false);
        return null;
      }
    },
    [signTypedDataAsync]
  );

  return {
    cancel,
    isLoading,
    error,
    reset,
  };
}
