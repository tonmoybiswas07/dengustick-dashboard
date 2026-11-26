"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Menu,
  Moon,
  Sun,
  ChevronDown,
  UserRound,
  Settings,
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import Sidebar from "../sidebar/Sidebar";
import { navigation } from "@/app/constants/navigation";
import NotificationBell from "./NotificationBell";

interface NavbarProps {
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

export default function Navbar({ user }: NavbarProps) {
  const { resolvedTheme, setTheme } = useTheme();
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

  const initials =
    user.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase() || "DV";

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
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </Button>
          </SheetTrigger>

          <SheetContent
            side="left"
            className="w-64 border-none p-0"
            showCloseButton={false}
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>

            <Sidebar role={user.role} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>

        <div>
          <h2 className="text-sm font-semibold md:text-lg">
            {currentPage?.title || "DengueVision"}
          </h2>

          <p className="hidden text-xs text-muted-foreground sm:block">
            DengueVision / {currentPage?.title || "Dashboard"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-5 dark:hidden" />
          <Moon className="hidden size-5 dark:block" />
        </Button>

        {hasPermission(user.role, "alerts:view") && <NotificationBell />}

        <div className="h-8 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto gap-2 px-1 md:px-2">
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="hidden text-left md:block">
                <p className="text-sm font-semibold">{user.name}</p>

                <p className="text-xs text-muted-foreground">
                  {roleLabels[user.role] || "User"}
                </p>
              </div>

              <ChevronDown className="hidden size-4 md:block" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="space-y-1">
                <p className="font-semibold">{user.name}</p>

                <p className="truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </p>

                <p className="text-xs font-normal text-primary">
                  {roleLabels[user.role] || "User"}
                </p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/settings">
                <UserRound size={16} />
                Profile
              </Link>
            </DropdownMenuItem>

            {hasPermission(user.role, "settings:manage") && (
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings size={16} />
                  Settings
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              disabled={loggingOut}
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut size={16} />

              {loggingOut ? "Logging out..." : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
