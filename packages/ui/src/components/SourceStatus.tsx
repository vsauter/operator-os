"use client";

import { useState } from "react";

export interface SourceStatusProps {
  id: string;
  name: string;
  status: "pending" | "loading" | "success" | "error" | "warning";
  itemCount?: number;
  error?: string;
  durationMs?: number;
}

const statusConfig = {
  pending: {
    icon: "○",
    emoji: "",
    color: "text-gray-400",
    bg: "bg-gray-50",
    border: "border-gray-200",
  },
  loading: {
    icon: "◌",
    emoji: "⏳",
    color: "text-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  success: {
    icon: "✓",
    emoji: "✅",
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  error: {
    icon: "✕",
    emoji: "❌",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  warning: {
    icon: "!",
    emoji: "⚠️",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
};

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function getStatusText(
  status: SourceStatusProps["status"],
  itemCount?: number,
  error?: string
): string {
  switch (status) {
    case "pending":
      return "Waiting...";
    case "loading":
      return "Loading...";
    case "success":
      if (itemCount !== undefined) {
        return `Loaded ${itemCount} ${itemCount === 1 ? "item" : "items"}`;
      }
      return "Loaded";
    case "warning":
      return "No data returned";
    case "error":
      return error || "Failed";
  }
}

export default function SourceStatus({
  id,
  name,
  status,
  itemCount,
  error,
  durationMs,
}: SourceStatusProps) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[status];
  const statusText = getStatusText(status, itemCount, error);

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden`}>
      <div
        className={`flex items-center gap-3 p-3 ${error ? "cursor-pointer" : ""}`}
        onClick={() => error && setExpanded(!expanded)}
      >
        <span className="text-base" role="img" aria-label={status}>
          {config.emoji || config.icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 truncate">{name}</p>
          <p className={`text-xs ${config.color}`}>{statusText}</p>
        </div>
        <div className="flex items-center gap-2">
          {durationMs !== undefined && status !== "loading" && status !== "pending" && (
            <span className="text-xs text-gray-500">{formatDuration(durationMs)}</span>
          )}
          {status === "loading" && (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
          {error && (
            <span className="text-xs text-gray-400">{expanded ? "▲" : "▼"}</span>
          )}
        </div>
      </div>
      {error && expanded && (
        <div className="px-3 pb-3 pt-0">
          <div className="bg-red-100 rounded p-2 text-xs text-red-700 font-mono whitespace-pre-wrap break-all">
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
