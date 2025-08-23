"use client";
import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { toast } from "sonner";

type Sender = {
  id: string;
  from: string;
  fromEmail: string;
  listUnsub?: string;
  count: number;
  hasHttp: boolean;
  hasMailto: boolean;
};

interface SendersContextType {
  allSenders: Sender[];
  total: number;
  loading: boolean;
  lastFetched: number | null;
  loadSenders: () => Promise<void>;
  clearCache: () => void;
}

const SendersContext = createContext<SendersContextType | undefined>(undefined);

export function SendersProvider({ children }: { children: ReactNode }) {
  const [allSenders, setAllSenders] = useState<Sender[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  const loadSenders = useCallback(async () => {
    // Check if we have cached data that's less than 5 minutes old
    const now = Date.now();
    const cacheAge = lastFetched ? now - lastFetched : Infinity;
    const cacheValid = cacheAge < 5 * 60 * 1000; // 5 minutes

    if (allSenders.length > 0 && cacheValid) {
      return; // Use cached data
    }

    setLoading(true);
    try {
      const res = await fetch("/api/senders/list?page=1&pageSize=1000"); // Get all senders
      const data = await res.json();
      setAllSenders(data.senders ?? []);
      setTotal(data.total ?? 0);
      setLastFetched(now);
    } catch {
      toast.error("Failed to load senders");
    } finally {
      setLoading(false);
    }
  }, [allSenders.length, lastFetched]);

  const clearCache = useCallback(() => {
    setAllSenders([]);
    setTotal(0);
    setLastFetched(null);
  }, []);

  return (
    <SendersContext.Provider value={{
      allSenders,
      total,
      loading,
      lastFetched,
      loadSenders,
      clearCache,
    }}>
      {children}
    </SendersContext.Provider>
  );
}

export function useSenders() {
  const context = useContext(SendersContext);
  if (context === undefined) {
    throw new Error("useSenders must be used within a SendersProvider");
  }
  return context;
}
