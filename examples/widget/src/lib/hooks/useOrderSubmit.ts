"use client";

import { useState, useCallback } from "react";
import {
  useAccount,
  useChainId,
  useSendTransaction,
  useSignTypedData,
  useWaitForTransactionReceipt,
} from "wagmi";
import { createQuote, submitOrder } from "@/lib/api";
import type { QuoteRequest, ExternalOrder, ApprovalAction } from "@/lib/types";

type SubmitStep = "quote" | "approval" | "signing" | "submitting" | null;

interface UseOrderSubmitResult {
  submit: (quoteRequest: QuoteRequest) => Promise<ExternalOrder | null>;
  isLoading: boolean;
  error: string | null;
  step: SubmitStep;
  reset: () => void;
}

export function useOrderSubmit(): UseOrderSubmitResult {
  const { address } = useAccount();
  const chainId = useChainId();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<SubmitStep>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { sendTransactionAsync } = useSendTransaction();
  const { signTypedDataAsync } = useSignTypedData();

  // Wait for approval transaction
  const { isLoading: isWaitingForTx } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setStep(null);
    setTxHash(undefined);
  }, []);

  const submit = useCallback(
    async (quoteRequest: QuoteRequest): Promise<ExternalOrder | null> => {
      if (!address) {
        setError("Wallet not connected");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Create quote
        setStep("quote");
        const quote = await createQuote(quoteRequest);

        // Step 2: Handle approval if needed
        const approvalAction = quote.actions.find(
          (a): a is ApprovalAction => a.type === "approval"
        );

        if (approvalAction) {
          setStep("approval");
          const hash = await sendTransactionAsync({
            to: approvalAction.to as `0x${string}`,
            data: approvalAction.data as `0x${string}`,
            value: approvalAction.value ? BigInt(approvalAction.value) : 0n,
          });
          setTxHash(hash);

          // Wait for transaction confirmation
          // The hook will handle this, but we need to wait
          await new Promise<void>((resolve) => {
            const checkTx = setInterval(() => {
              if (!isWaitingForTx) {
                clearInterval(checkTx);
                resolve();
              }
            }, 1000);
          });
        }

        // Step 3: Sign order
        setStep("signing");
        const orderSignatureAction = quote.actions.find(
          (a) => a.type === "orderSignature"
        );

        if (!orderSignatureAction || orderSignatureAction.type !== "orderSignature") {
          throw new Error("No order signature action in quote response");
        }

        const { typedData } = orderSignatureAction;

        // Sign the EIP-712 typed data
        const signature = await signTypedDataAsync({
          domain: {
            name: typedData.domain.name,
            version: typedData.domain.version,
            chainId: typedData.domain.chainId,
            verifyingContract: typedData.domain.verifyingContract as `0x${string}`,
          },
          types: typedData.types,
          primaryType: typedData.primaryType,
          message: typedData.message,
        });

        // Step 4: Submit order
        setStep("submitting");
        const order = await submitOrder({
          quoteId: quote.quoteId,
          orderSignature: signature,
        });

        setIsLoading(false);
        setStep(null);
        return order;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to submit order";
        setError(errorMessage);
        setIsLoading(false);
        setStep(null);
        return null;
      }
    },
    [address, sendTransactionAsync, signTypedDataAsync, isWaitingForTx]
  );

  return {
    submit,
    isLoading,
    error,
    step,
    reset,
  };
}

