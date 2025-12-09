import { API_BASE_URL } from "./constants";
import type {
  QuoteRequest,
  QuoteResponse,
  SubmitRequest,
  ExternalOrder,
  ListOrdersRequest,
  ListOrdersResponse,
  CancelOrderResponse,
  GetOrderResponse,
} from "./types";

// Helper for making API requests
// API key is handled server-side by the Next.js proxy route
async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  console.log(`[API] ${options.method || "GET"} ${url}`);
  if (options.body) {
    console.log("[API] Request body:", options.body);
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  console.log(`[API] Response status: ${response.status}`);
  console.log("[API] Response data:", JSON.stringify(data, null, 2));

  if (!response.ok) {
    // Handle nested error envelope: { error: { type, message, ... } }
    const nestedError = data?.error;
    const errorMessage =
      nestedError?.message ||
      (typeof nestedError === "string" ? nestedError : undefined) ||
      data?.message ||
      "API request failed";
    console.error("[API] Error:", errorMessage, "Full response:", data);
    throw new Error(errorMessage);
  }

  return data;
}

/**
 * Create an order quote
 * Returns quoteId, actions (approval + signature), and metadata
 */
export async function createQuote(
  quoteRequest: QuoteRequest
): Promise<QuoteResponse> {
  return apiRequest<QuoteResponse>("/quote", {
    method: "POST",
    body: JSON.stringify(quoteRequest),
  });
}

/**
 * Submit a signed order
 * Returns the created ExternalOrder
 */
export async function submitOrder(
  request: SubmitRequest
): Promise<ExternalOrder> {
  return apiRequest<ExternalOrder>("/submit", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Get order by ID
 */
export async function getOrder(orderId: string): Promise<ExternalOrder | null> {
  try {
    const response = await apiRequest<GetOrderResponse>(`/${orderId}`);
    return response.order;
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("not found")) {
      return null;
    }
    throw error;
  }
}

/**
 * List orders for a wallet
 */
export async function listOrders(
  request: ListOrdersRequest
): Promise<ListOrdersResponse> {
  return apiRequest<ListOrdersResponse>("/list", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Cancel an order
 */
export async function cancelOrder(
  orderId: string,
  signature: string
): Promise<CancelOrderResponse> {
  return apiRequest<CancelOrderResponse>(`/cancel/${orderId}`, {
    method: "POST",
    body: JSON.stringify({ signature }),
  });
}
