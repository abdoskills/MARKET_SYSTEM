"use client";

import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { getOfflineSyncState, triggerOfflineSync } from "@/lib/offline/sync";

export default function SyncStatusBadge() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Basic network status listener
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const tick = () => {
      const state = getOfflineSyncState();
      setIsSyncing(state.isSyncRunning);
      setPendingCount(state.total);
    };

    tick();
    const timer = window.setInterval(tick, 1000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.clearInterval(timer);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    await triggerOfflineSync();
    const state = getOfflineSyncState();
    setIsSyncing(state.isSyncRunning);
    setPendingCount(state.total);
  };

  return (
    <button
      onClick={handleSync}
      disabled={!isOnline || isSyncing}
      title={!isOnline ? "غير متصل بالشبكة" : pendingCount > 0 ? `يوجد ${pendingCount} طلبات تنتظر المزامنة` : "مزامنة البيانات"}
      className={`min-h-[44px] px-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-base focus:ring-offset-1 ${
        !isOnline
          ? "bg-red-50 text-red-500 cursor-not-allowed border border-red-100"
          : isSyncing
          ? "bg-gray-50 text-gray-500 border border-gray-200"
          : "bg-soft-mint text-emerald-base hover:bg-emerald-base hover:text-white border border-transparent active:scale-95"
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-5 h-5" />
          <span className="hidden sm:inline">غير متصل</span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="hidden sm:inline">جاري المزامنة...</span>
        </>
      ) : (
        <>
          <Wifi className="w-5 h-5" />
          <span className="hidden sm:inline">{pendingCount > 0 ? `متصل (${pendingCount})` : "متصل"}</span>
        </>
      )}
    </button>
  );
}
