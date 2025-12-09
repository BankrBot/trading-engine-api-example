import { NextRequest, NextResponse } from "next/server";

// Backend API URL (server-side only, not exposed to client)
const BACKEND_URL =
  process.env.API_BACKEND_URL || "https://api-staging.bankr.bot/trading/order";
const API_KEY = process.env.API_KEY || "";

async function proxyRequest(
  req: NextRequest,
  params: { path: string[] }
): Promise<NextResponse> {
  const path = params.path.join("/");
  const url = `${BACKEND_URL}/${path}`;

  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add API key if configured
    if (API_KEY) {
      headers["x-api-key"] = API_KEY;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    // Include body for non-GET requests
    if (req.method !== "GET" && req.method !== "HEAD") {
      const body = await req.text();
      if (body) {
        fetchOptions.body = body;
      }
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      {
        error: "Proxy request failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(req, await params);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(req, await params);
}
