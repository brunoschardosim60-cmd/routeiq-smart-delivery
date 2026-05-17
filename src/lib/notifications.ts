import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { listNotifications, type NotifItem } from "./notifications.functions";

const STORAGE_KEY = "routeiq:notif-read-v1";

function loadRead(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}

function saveRead(s: Set<string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...s])); } catch { /* noop */ }
}

export type RealNotification = NotifItem & { timeLabel: string; read: boolean };

export function useNotifications() {
  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const [readIds, setReadIds] = useState<Set<string>>(() => loadRead());

  // Sync across tabs
  useEffect(() => {
    const h = (e: StorageEvent) => { if (e.key === STORAGE_KEY) setReadIds(loadRead()); };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);

  const items: RealNotification[] = (q.data?.items ?? []).map((i) => ({
    ...i,
    read: readIds.has(i.id),
  }));
  const unread = items.filter((i) => !i.read).length;

  const markRead = (id: string) => {
    const next = new Set(readIds); next.add(id); setReadIds(next); saveRead(next);
  };
  const markAllRead = () => {
    const next = new Set(readIds); items.forEach((i) => next.add(i.id));
    setReadIds(next); saveRead(next);
  };

  return { items, unread, loading: q.isLoading, markRead, markAllRead, refetch: q.refetch };
}
