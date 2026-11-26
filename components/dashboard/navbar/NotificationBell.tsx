"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchCount() {
      try {
        const response = await fetch(
          "/api/alerts/count",
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) return;

        const result = await response.json();

        if (!controller.signal.aborted) {
          setCount(result.count ?? 0);
        }
      } catch {
        return;
      }
    }

    void fetchCount();

    const interval = window.setInterval(
      fetchCount,
      30000
    );

    window.addEventListener(
      "alerts-updated",
      fetchCount
    );

    window.addEventListener(
      "focus",
      fetchCount
    );

    return () => {
      controller.abort();

      window.clearInterval(interval);

      window.removeEventListener(
        "alerts-updated",
        fetchCount
      );

      window.removeEventListener(
        "focus",
        fetchCount
      );
    };
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      asChild
    >
      <Link
        href="/alerts"
        aria-label={`${count} unread alerts`}
      >
        <Bell className="size-5" />

        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-5 text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
}