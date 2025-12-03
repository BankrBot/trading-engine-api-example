"use client";

import { useCancel } from "@/lib/hooks/useCancel";
import { ORDER_TYPE_LABELS, STATUS_LABELS, CHAIN_NAMES } from "@/lib/constants";
import type { ExternalOrder } from "@/lib/types";
import cogoToast from "cogo-toast";

interface OrderDetailProps {
  order: ExternalOrder;
  onClose: () => void;
}

// Format amount for display
function formatAmount(amount: { raw: string; formatted: string } | undefined) {
  if (!amount) return "-";
  const num = parseFloat(amount.formatted);
  if (num < 0.0001) return amount.formatted;
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

// Calculate expected buy amount from trigger price for limit/stop orders
function calculateExpectedBuyAmount(order: ExternalOrder): string | null {
  // Only calculate for orders without buyAmount
  if (order.buyAmount) return null;
  if (!order.sellAmount?.formatted) return null;
  if (!order.quoteRequest?.config) return null;

  // Check if this is a price-based order with triggerPrice
  const config = order.quoteRequest.config as { triggerPrice?: number };
  if (!config.triggerPrice || config.triggerPrice <= 0) return null;

  // Calculate: buyAmount = sellAmount / triggerPrice
  const sellAmount = parseFloat(order.sellAmount.formatted);
  const expectedBuy = sellAmount / config.triggerPrice;

  // Format the result
  if (expectedBuy < 0.0001) return expectedBuy.toExponential(2);
  if (expectedBuy < 1) return expectedBuy.toFixed(6);
  if (expectedBuy < 1000) return expectedBuy.toFixed(4);
  return expectedBuy.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

// Format date for display
function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleString();
}

// Truncate address for display
function truncateAddress(address: string) {
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const badgeClass = `badge badge-${status}`;
  return <span className={badgeClass}>{STATUS_LABELS[status] || status}</span>;
}

// Info row component
function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between py-2 border-b border-surface-800 last:border-0">
      <span className="text-surface-400 text-sm">{label}</span>
      <span className={`text-surface-200 text-sm ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export function OrderDetail({ order, onClose }: OrderDetailProps) {
  const { cancel, isLoading, error } = useCancel();

  const canCancel =
    order.status === "open" ||
    order.status === "ready" ||
    order.status === "paused";

  const handleCancel = async () => {
    // Get verifying contract from protocolData (the contract the order was signed against)
    const verifyingContract = order.protocolData?.protocolAddress;

    if (!verifyingContract) {
      cogoToast.error("Unable to cancel: order is missing protocol data", {
        position: "top-right",
      });
      return;
    }

    const result = await cancel(
      order.orderId,
      order.chainId,
      verifyingContract as `0x${string}`
    );
    if (result?.success) {
      cogoToast.success("Order cancelled successfully", {
        position: "top-right",
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-900 border border-surface-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-800">
          <div>
            <h2 className="text-lg font-semibold text-surface-100">
              {ORDER_TYPE_LABELS[order.orderType]} Order
            </h2>
            <p className="text-sm text-surface-500 font-mono mt-1">
              {truncateAddress(order.orderId)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-surface-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Status */}
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            <span className="text-surface-400 text-sm">
              on {CHAIN_NAMES[order.chainId] || `Chain ${order.chainId}`}
            </span>
          </div>

          {/* Token Info */}
          <div className="bg-surface-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-surface-400 text-xs mb-1">Sell</p>
                <p className="text-xl font-semibold text-surface-100">
                  {formatAmount(order.sellAmount)}
                </p>
                <p className="text-surface-300 text-sm">
                  {order.sellToken.symbol ||
                    truncateAddress(order.sellToken.address)}
                </p>
              </div>

              <div className="text-surface-500">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </div>

              <div className="text-center">
                <p className="text-surface-400 text-xs mb-1">Buy</p>
                <p className="text-xl font-semibold text-surface-100">
                  {order.buyAmount
                    ? formatAmount(order.buyAmount)
                    : calculateExpectedBuyAmount(order)
                    ? `~${calculateExpectedBuyAmount(order)}`
                    : "~"}
                </p>
                <p className="text-surface-300 text-sm">
                  {order.buyToken.symbol ||
                    truncateAddress(order.buyToken.address)}
                </p>
              </div>
            </div>
          </div>

          {/* Execution Summary (if applicable) */}
          {(order.totalSoldAmount || order.totalReceivedAmount) && (
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
              <p className="text-primary-400 text-sm font-medium mb-2">
                Execution Summary
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-surface-400">Total Sold</p>
                  <p className="text-surface-200">
                    {formatAmount(order.totalSoldAmount)}{" "}
                    {order.sellToken.symbol}
                  </p>
                </div>
                <div>
                  <p className="text-surface-400">Total Received</p>
                  <p className="text-surface-200">
                    {formatAmount(order.totalReceivedAmount)}{" "}
                    {order.buyToken.symbol}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Order Details */}
          <div>
            <h3 className="text-sm font-medium text-surface-300 mb-2">
              Details
            </h3>
            <div className="bg-surface-800/30 rounded-lg px-4">
              <InfoRow
                label="Order ID"
                value={truncateAddress(order.orderId)}
                mono
              />
              <InfoRow label="Slippage" value={`${order.slippageBps / 100}%`} />
              <InfoRow label="Created" value={formatDate(order.createdAt)} />
              <InfoRow label="Expires" value={formatDate(order.expiresAt)} />
              {order.trailing && <InfoRow label="Trailing" value="Yes" />}
              {order.txHash && (
                <InfoRow
                  label="Tx Hash"
                  value={truncateAddress(order.txHash)}
                  mono
                />
              )}
            </div>
          </div>

          {/* Fees */}
          {order.fees && order.fees.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-surface-300 mb-2">
                Fees
              </h3>
              <div className="bg-surface-800/30 rounded-lg px-4">
                {order.fees.map((fee, idx) => (
                  <InfoRow
                    key={idx}
                    label={fee.recipientType}
                    value={`${fee.feeBps / 100}%`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Execution History */}
          {order.executionHistory && order.executionHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-surface-300 mb-2">
                Execution History
              </h3>
              <div className="space-y-2">
                {order.executionHistory.map((entry, idx) => (
                  <div
                    key={idx}
                    className="bg-surface-800/30 rounded-lg p-3 text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`font-medium ${
                          entry.status === "success"
                            ? "text-green-400"
                            : entry.status === "partial"
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {entry.status.charAt(0).toUpperCase() +
                          entry.status.slice(1)}
                      </span>
                      <span className="text-surface-500">
                        {formatDate(entry.executedAt)}
                      </span>
                    </div>
                    {entry.output && (
                      <div className="text-surface-400">
                        {entry.output.sellAmount && (
                          <span>
                            Sold {formatAmount(entry.output.sellAmount)}{" "}
                            {order.sellToken.symbol}
                          </span>
                        )}
                        {entry.output.buyAmount && (
                          <span>
                            {" "}
                            → Received {formatAmount(
                              entry.output.buyAmount
                            )}{" "}
                            {order.buyToken.symbol}
                          </span>
                        )}
                      </div>
                    )}
                    {entry.error && (
                      <p className="text-red-400 mt-1">{entry.error.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-surface-800">
          <button onClick={onClose} className="flex-1 btn btn-secondary">
            Close
          </button>
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1 btn btn-danger"
            >
              {isLoading ? "Cancelling..." : "Cancel Order"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
