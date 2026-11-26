"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScanEye, ChevronRight, University } from "lucide-react";

import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { navigation } from "@/app/constants/navigation";

interface SidebarProps {
  role: string;
  onNavigate?: () => void;
}

export default function Sidebar({ role, onNavigate }: SidebarProps) {
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
    <aside className="flex h-dvh w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-20 shrink-0 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-white">
          <ScanEye size={26} />
        </div>

        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">
            DengueVision
          </h1>
          <p className="text-[11px] text-slate-400">
            Surveillance Platform
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
        {allowedNavigation.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
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
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-white"
                        : "text-slate-400 hover:bg-sidebar-accent hover:text-white"
                    )}
                  >
                    <Icon size={18} className="shrink-0" />

                    <span className="flex-1">
                      {item.title}
                    </span>

                    {isActive && <ChevronRight size={14} />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t border-sidebar-border p-5">
        <University size={24} className="shrink-0 text-slate-400" />

        <div>
          <p className="text-xs font-medium text-slate-200">
            BAUST Research Project
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            ZRF-26-251C02
          </p>
        </div>
      </div>
    </aside>
  );
}