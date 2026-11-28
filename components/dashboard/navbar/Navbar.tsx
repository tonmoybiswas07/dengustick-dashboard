"use client";

import { GlobalSearch } from "./GlobalSearch";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  Moon,
  Sun,
  ChevronDown,
  LogOut,
} from "lucide-react";

import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import Sidebar from "../sidebar/Sidebar";
import { navigation } from "@/app/constants/navigation";
import NotificationBell from "./NotificationBell";

interface NavbarProps {
  preferences: import("@/lib/validations/account").PersonalSettings;
  user: {
    name: string;
    email: string;
    role: string;
  };
}

const roleLabels: Record<string, string> = {
  admin: "System Administrator",
  health_authority: "Health Authority",
  supervisor: "Supervisor",
  field_worker: "Field Worker",
  researcher: "Researcher",
};

export default function Navbar({ user, preferences }: NavbarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  useEffect(() => {
    setTheme(preferences.theme);
  }, [preferences.theme, user.email, setTheme]);
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const currentPage = navigation
    .flatMap((group) => group.items)
    .filter((item) => hasPermission(user.role, item.permission))
    .find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );

  const pageName = currentPage?.title ?? ({
    "/profile": "Profile",
    "/settings": "Settings",
    "/audit": "Audit log",
    "/permission-test": "Permission test",
  } as Record<string, string>)[pathname] ?? "Dashboard";
  const inspectionDetail = pathname.startsWith("/inspections/");

  const initials =
    user.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase() || "DS";

  async function toggleTheme() {
    const theme = resolvedTheme === "dark" ? "light" : "dark";
    try {
      const response = await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      if (!response.ok) throw new Error("Unable to save theme");
      setTheme(theme);
      router.refresh();
    } catch {
      toast.error("Unable to save theme");
    }
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      const { error } = await signOut();

      if (error) {
        toast.error(error.message || "Failed to sign out");
        return;
      }

      toast.success("Logged out successfully");

      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-1 border-b bg-card px-2 sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-1 sm:gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-10 lg:hidden"
                aria-label="Open navigation"
              />
            }
          >
            <Menu size={22} />
          </SheetTrigger>

          <SheetContent
            side="left"
            className="w-60 max-w-[calc(100vw-2rem)] border-none p-0"
            showCloseButton={false}
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>

            <Sidebar role={user.role} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="min-w-0 text-sm font-semibold">
          {inspectionDetail ? (
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 sm:gap-2">
              <Link href="/inspections" className="truncate text-muted-foreground hover:underline">Inspections</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page" className="truncate">Details</span>
            </nav>
          ) : <p className="truncate">{pageName}</p>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          aria-label="Toggle light and dark theme"
          onClick={toggleTheme}
        >
          <Sun className="size-5 dark:hidden" />
          <Moon className="hidden size-5 dark:block" />
        </Button>

        <GlobalSearch />
        {preferences.alertNotifications && hasPermission(user.role, "alerts:view") && <NotificationBell />}

        <div className="hidden h-7 w-px bg-border sm:block" aria-hidden="true" />

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" aria-label="Account menu" className="min-h-10 gap-2 px-1 md:px-2" />}>
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="hidden max-w-36 text-left xl:block">
              <p className="truncate text-sm font-semibold">{user.name}</p>

              <p className="text-xs text-muted-foreground">
                {roleLabels[user.role] || "User"}
              </p>
            </div>

            <ChevronDown className="hidden size-4 md:block" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="space-y-1">
                  <p className="wrap-anywhere font-semibold">{user.name}</p>

                  <p className="truncate text-xs font-normal text-muted-foreground">
                    {user.email}
                  </p>

                  <p className="text-xs font-normal text-primary">
                    {roleLabels[user.role] || "User"}
                  </p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/profile" />}>Profile</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/settings" />}>Settings</DropdownMenuItem>
              {user.role === "admin" && (
                <DropdownMenuItem render={<Link href="/audit" />}>Audit log</DropdownMenuItem>
              )}

              <DropdownMenuItem
                disabled={loggingOut}
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut size={16} />

                {loggingOut ? "Logging out..." : "Log out"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
