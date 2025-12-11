"use client";

import { useState } from "react";
import { useOrders, useInvalidateOrders } from "@/lib/hooks/useOrders";
import { useCancel } from "@/lib/hooks/useCancel";
import { ORDER_TYPE_LABELS, STATUS_LABELS, CHAIN_NAMES } from "@/lib/constants";
import type { ExternalOrder } from "@/lib/types";
import { OrderDetail } from "./OrderDetail";

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const badgeClass = `badge badge-${status}`;
  return <span className={badgeClass}>{STATUS_LABELS[status] || status}</span>;
}

// Format amount for display
function formatAmount(
  amount:
    | { raw: string; formatted: string; usdValue?: number | null }
    | undefined
) {
  if (!amount) return "-";
  const num = parseFloat(amount.formatted);
  if (num < 0.001) return "<0.001";
  if (num < 1) return num.toFixed(4);
  if (num < 1000) return num.toFixed(2);
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// Format USD value for display
function formatUsdValue(usdValue: number | null | undefined): string | null {
  if (usdValue === null || usdValue === undefined) return null;
  if (usdValue < 0.01) return `$${usdValue.toFixed(4)}`;
  if (usdValue < 1000) return `$${usdValue.toFixed(2)}`;
  return `$${usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

// Format date for display
function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleString();
}

// Truncate address
function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function OrderList() {
  const {
    orders,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refetch,
  } = useOrders();
  const invalidateOrders = useInvalidateOrders();
  const [selectedOrder, setSelectedOrder] = useState<ExternalOrder | null>(
    null
  );

  const handleOrderClick = (order: ExternalOrder) => {
    setSelectedOrder(order);
  };

  const handleCloseDetail = () => {
    setSelectedOrder(null);
    invalidateOrders();
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="card py-16 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-surface-400">Loading orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card py-16 text-center">
        <div className="text-red-400 mb-4">
          <svg
            className="w-12 h-12 mx-auto mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p>Failed to load orders</p>
        </div>
        <button onClick={() => refetch()} className="btn btn-secondary">
          Try Again
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="card py-16 text-center">
        <svg
          className="w-16 h-16 mx-auto mb-4 text-surface-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-surface-400 text-lg mb-2">No orders yet</p>
        <p className="text-surface-500 text-sm">
          Create your first order to get started
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-100">
            Your Orders
          </h2>
          <button
            onClick={() => refetch()}
            className="btn btn-secondary text-sm py-1 px-3"
          >
            Refresh
          </button>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto -mx-4">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left text-xs font-medium text-surface-400 uppercase tracking-wider px-4 py-3">
                  Type
                </th>
                <th className="text-left text-xs font-medium text-surface-400 uppercase tracking-wider px-4 py-3">
                  Pair
                </th>
                <th className="text-left text-xs font-medium text-surface-400 uppercase tracking-wider px-4 py-3">
                  Amount
                </th>
                <th className="text-left text-xs font-medium text-surface-400 uppercase tracking-wider px-4 py-3">
                  Chain
                </th>
                <th className="text-left text-xs font-medium text-surface-400 uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-surface-400 uppercase tracking-wider px-4 py-3">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {orders.map((order) => {
                const orderId = order.orderId;
                return (
                  <tr
                    key={orderId}
                    onClick={() => handleOrderClick(order)}
                    className="hover:bg-surface-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-surface-200">
                        {ORDER_TYPE_LABELS[order.orderType]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-surface-300">
                          {order.sellToken.symbol ||
                            truncateAddress(order.sellToken.address)}
                        </span>
                        <span className="text-surface-500">→</span>
                        <span className="text-surface-300">
                          {order.buyToken.symbol ||
                            truncateAddress(order.buyToken.address)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-surface-300">
                          {formatAmount(order.sellToken.amount || undefined)}{" "}
                          <span className="text-surface-500">
                            {order.sellToken.symbol}
                          </span>
                        </span>
                        {order.sellToken.amount?.usdValue !== null &&
                          order.sellToken.amount?.usdValue !== undefined && (
                            <span className="text-surface-500 text-xs mt-0.5">
                              {formatUsdValue(order.sellToken.amount.usdValue)}
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-surface-400 text-sm">
                        {CHAIN_NAMES[order.chainId] || `Chain ${order.chainId}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-surface-500 text-sm">
                        {formatDate(order.createdAt)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center mt-4 pb-4">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="btn btn-secondary text-sm py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingMore ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  Loading...
                </>
              ) : (
                "Load More"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetail order={selectedOrder} onClose={handleCloseDetail} />
      )}
    </>
  );
}
