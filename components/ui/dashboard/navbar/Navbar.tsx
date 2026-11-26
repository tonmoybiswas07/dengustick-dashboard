"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import {
  Bell,
  Menu,
  Moon,
  Sun,
  ChevronDown,
  UserRound,
  Settings,
} from "lucide-react";

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



export default function Navbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const currentPage = navigation
    .flatMap((group) => group.items)
    .find(
      (item) =>
        pathname === item.href ||
        pathname.startsWith(`${item.href}/`)
    );

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
            <SheetTitle className="sr-only">
              Navigation
            </SheetTitle>

            <Sidebar onNavigate={() => setOpen(false)} />
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
          onClick={() =>
            setTheme(resolvedTheme === "dark" ? "light" : "dark")
          }
        >
          <Sun className="size-5 dark:hidden" />
          <Moon className="hidden size-5 dark:block" />
        </Button>

        <Button variant="ghost" size="icon" asChild>
          <Link href="/alerts" aria-label="View alerts">
            <Bell size={20} />
          </Link>
        </Button>

        <div className="h-8 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto gap-2 px-1 md:px-2"
            >
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                  DV
                </AvatarFallback>
              </Avatar>

              <div className="hidden text-left md:block">
                <p className="text-sm font-semibold">
                  Demo Admin
                </p>
                <p className="text-xs text-muted-foreground">
                  System Administrator
                </p>
              </div>

              <ChevronDown className="hidden size-4 md:block" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              My Account
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/settings">
                <UserRound size={16} />
                Profile
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings size={16} />
                Settings
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}