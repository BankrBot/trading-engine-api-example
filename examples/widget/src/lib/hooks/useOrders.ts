"use client";

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
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

export function useOrders(options: UseOrdersOptions = {}): UseOrdersResult {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const { type, status, refetchInterval = 10000 } = options;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["orders", address, type, status],
    queryFn: async () => {
      if (!address) return { orders: [], next: undefined };
      return listOrders({ maker: address, type, status });
    },
    enabled: !!address,
    refetchInterval,
  });

  const loadMore = () => {
    // TODO: Implement cursor-based pagination
    // For now, just refetch
    refetch();
  };

  return {
    orders: data?.orders || [],
    isLoading,
    error: error as Error | null,
    hasMore: !!data?.next,
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
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
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

