"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { WalletButton } from "@/components/WalletButton";
import { OrderForm } from "@/components/OrderForm";
import { OrderList } from "@/components/OrderList";

export default function Home() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<"create" | "orders">("create");

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-surface-100">
              External Orders
            </h1>
            <p className="text-surface-400 text-sm mt-1">
              Trading widget for limit, stop, DCA & TWAP orders
            </p>
          </div>
          <WalletButton />
        </header>

        {isConnected ? (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab("create")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === "create"
                    ? "bg-primary-600 text-white"
                    : "bg-surface-800 text-surface-400 hover:bg-surface-700"
                }`}
              >
                Create Order
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === "orders"
                    ? "bg-primary-600 text-white"
                    : "bg-surface-800 text-surface-400 hover:bg-surface-700"
                }`}
              >
                My Orders
              </button>
            </div>

            {/* Content */}
            {activeTab === "create" ? <OrderForm /> : <OrderList />}
          </>
        ) : (
          <div className="card text-center py-16">
            <div className="text-surface-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
                />
              </svg>
              <p className="text-lg">Connect your wallet to get started</p>
              <p className="text-sm mt-2">
                Place limit, stop, DCA, and TWAP orders on supported chains
              </p>
            </div>
            <WalletButton />
          </div>
        )}
      </div>
    </main>
  );
}

