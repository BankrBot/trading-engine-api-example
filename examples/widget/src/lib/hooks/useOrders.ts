"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { listOrders, getOrder } from "@/lib/api";
import type { ExternalOrder, OrderStatus } from "@/lib/types";
import type { OrderType } from "@/lib/constants";

interface UseOrdersOptions {
  type?: OrderType;
  status?: OrderStatus;
  refetchInterval?: number;
}

interface UseOrdersResult {
  orders: ExternalOrder[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

export function useOrders(options: UseOrdersOptions = {}): UseOrdersResult {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const { type, status, refetchInterval = 10000 } = options;

  // Track accumulated orders and cursor
  const [accumulatedOrders, setAccumulatedOrders] = useState<ExternalOrder[]>(
    []
  );
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["orders", address, type, status],
    queryFn: async () => {
      if (!address) return { orders: [], next: undefined };
      return listOrders({ maker: address, type, status });
    },
    enabled: !!address,
    refetchInterval,
  });

  // Update accumulated orders when initial data changes
  useEffect(() => {
    if (data) {
      setAccumulatedOrders(data.orders);
      setNextCursor(data.next);
    }
  }, [data]);

  // Reset accumulated orders when filters change
  useEffect(() => {
    setAccumulatedOrders([]);
    setNextCursor(undefined);
  }, [address, type, status]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || !address || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const response = await listOrders({
        maker: address,
        type,
        status,
        cursor: nextCursor,
      });
      setAccumulatedOrders((prev) => [...prev, ...response.orders]);
      setNextCursor(response.next);
    } catch (err) {
      console.error("Error loading more orders:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, address, type, status, isLoadingMore]);

  return {
    orders: accumulatedOrders,
    isLoading,
    isLoadingMore,
    error: error as Error | null,
    hasMore: !!nextCursor,
    loadMore,
    refetch,
  };
}

interface UseOrderResult {
  order: ExternalOrder | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useOrder(orderId: string | null): UseOrderResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      return getOrder(orderId);
    },
    enabled: !!orderId,
    refetchInterval: 5000,
  });

  return {
    order: data || null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// Hook to invalidate orders cache (useful after creating/cancelling orders)
export function useInvalidateOrders() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };
}
