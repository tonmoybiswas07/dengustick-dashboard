"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScanEye, ChevronRight, University, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { navigation } from "@/app/constants/navigation";

interface SidebarProps {
  role: string;
  onNavigate?: () => void;
}

export default function Sidebar({ role, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const compact = collapsed && !onNavigate;
  const pathname = usePathname();

  const allowedNavigation = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        hasPermission(role, item.permission)
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside className={cn("flex h-dvh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground", compact ? "w-16" : "w-60")}>
      <div className="flex h-16 shrink-0 items-center justify-center gap-3 border-b border-sidebar-border px-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <ScanEye size={20} aria-hidden="true" />
        </div>

        <div className={compact ? "sr-only" : "flex-1"}>
          <p className="text-base font-semibold tracking-tight text-white">DengueStick</p>
          <p className="text-[11px] text-slate-400">
            Surveillance Platform
          </p>
        </div>
      </div>

      <nav aria-label="Dashboard navigation" id={onNavigate ? undefined : "desktop-navigation"} className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-2 py-4">
        {allowedNavigation.map((group) => (
          <div key={group.label}>
            <p className={compact ? "sr-only" : "mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400"}>
              {group.label}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;

                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={compact ? item.title : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium motion-safe:transition-colors",
                      compact && "justify-center px-0",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-slate-400 hover:bg-sidebar-accent hover:text-white"
                    )}
                  >
                    <Icon size={18} className="shrink-0" />

                    <span className={compact ? "sr-only" : "flex-1"}>
                      {item.title}
                    </span>

                    {isActive && !compact && <ChevronRight size={14} aria-hidden="true" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {!onNavigate && <button type="button" aria-expanded={!compact} aria-controls="desktop-navigation"
        onClick={() => setCollapsed(!collapsed)} className="mx-2 mb-2 flex min-h-10 items-center justify-center gap-2 rounded-md text-sm hover:bg-sidebar-accent"
        aria-label={compact ? "Expand navigation" : "Collapse navigation"}>
        {compact ? <PanelLeftOpen size={18} aria-hidden="true" /> : <><PanelLeftClose size={18} aria-hidden="true" /> Collapse navigation</>}
      </button>}
      {!compact && <div className="flex items-center gap-3 border-t border-sidebar-border p-4">
        <University size={24} className="shrink-0 text-slate-400" />

        <div>
          <p className="text-xs font-medium text-slate-200">
            BAUST Research Project
          </p>
          <p className="mt-1 text-xs text-slate-400">
            ZRF-26-251C02
          </p>
        </div>
      </div>}
    </aside>
  );
}