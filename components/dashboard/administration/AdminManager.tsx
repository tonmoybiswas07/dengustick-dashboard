"use client";

import { loadDirectory } from "@/lib/directory";

import { useEffect, useState } from "react";

import {
  ShieldCheck,
  Users,
  MapPin,
  UserPlus,
  Plus,
  RefreshCw,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import AdminStats from "./AdminStats";
import UserTable from "./UserTable";
import UserDialog from "./UserDialog";
import RegionTable from "./RegionTable";
import RegionDialog from "./RegionDialog";
import RolePermissions from "./RolePermissions";

import type {
  AdminUser,
  RegionDTO,
  AdminStatistics,
} from "@/app/types/administration";

export default function AdminManager({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);

  const [regions, setRegions] = useState<RegionDTO[]>([]);

  const [stats, setStats] = useState<AdminStatistics>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    fieldWorkers: 0,
    totalRegions: 0,
    activeRegions: 0,
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [userOpen, setUserOpen] = useState(false);

  const [selectedUser, setSelectedUser] =
    useState<AdminUser | null>(null);

  const [regionOpen, setRegionOpen] = useState(false);

  const [selectedRegion, setSelectedRegion] =
    useState<RegionDTO | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchAdministration() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          search,
          page: String(page),
        });

        const [userResponse, regions, statsResponse] = await Promise.all([
          fetch(`/api/administration/users?${params}`, {
            cache: "no-store",
            signal: controller.signal,
          }),

          loadDirectory<RegionDTO>("/api/administration/regions", controller.signal),

          fetch("/api/administration/stats", {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);

        const [userResult, statsResult] = await Promise.all([userResponse.json(), statsResponse.json()]);
        if (!userResponse.ok || !statsResponse.ok) {
          throw new Error(
            "Failed to load administration data"
          );
        }

        if (controller.signal.aborted) return;

        setUsers(userResult.data);
        setRegions(regions);
        setStats(statsResult.data);

        const pages = Math.max(
          1,
          userResult.pagination.totalPages
        );

        setTotalPages(pages);

        if (page > pages) {
          setPage(pages);
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        setError(
          error instanceof Error
            ? error.message
            : "Something went wrong"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    const timer = window.setTimeout(
      fetchAdministration,
      300
    );

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [search, page, refreshKey]);

  function refreshData() {
    setRefreshKey((previous) => previous + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight md:text-3xl">
            <ShieldCheck className="size-7 text-primary" />
            Administration
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Manage users, surveillance regions and system access.
          </p>
        </div>

        <Button
          variant="outline"
          disabled={loading}
          onClick={refreshData}
        >
          <RefreshCw
            className={`size-4 ${
              loading ? "animate-spin" : ""
            }`}
          />

          Refresh
        </Button>
      </div>

      {!error && <AdminStats stats={stats} />}

      {error ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-xl border bg-card">
          <p className="text-sm text-destructive">
            {error}
          </p>

          <Button
            variant="outline"
            onClick={refreshData}
          >
            Try Again
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="users" className="space-y-5">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="users">
              <Users className="size-4" />
              Users
            </TabsTrigger>

            <TabsTrigger value="regions">
              <MapPin className="size-4" />
              Regions
            </TabsTrigger>

            <TabsTrigger value="permissions">
              <ShieldCheck className="size-4" />
              Roles & Permissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  placeholder="Search users..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <Button
                disabled={loading}
                onClick={() => {
                  setSelectedUser(null);
                  setUserOpen(true);
                }}
              >
                <UserPlus className="size-4" />
                Add User
              </Button>
            </div>

            {loading ? (
              <div className="flex min-h-64 items-center justify-center rounded-xl border bg-card">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <UserTable
                  users={users}
                  regions={regions}
                  currentUserId={currentUserId}
                  onEdit={(user) => {
                    setSelectedUser(user);
                    setUserOpen(true);
                  }}
                />

                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((previous) => previous - 1)
                    }
                  >
                    <ChevronLeft className="size-4" />
                  </Button>

                  <span className="text-sm">
                    Page {page} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((previous) => previous + 1)
                    }
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="regions" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Surveillance Regions
                </h2>

                <p className="text-sm text-muted-foreground">
                  Manage regional coverage and availability.
                </p>
              </div>

              <Button
                disabled={loading}
                onClick={() => {
                  setSelectedRegion(null);
                  setRegionOpen(true);
                }}
              >
                <Plus className="size-4" />
                Add Region
              </Button>
            </div>

            {loading ? (
              <div className="flex min-h-64 items-center justify-center rounded-xl border bg-card">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
            ) : (
              <RegionTable
                regions={regions}
                onEdit={(region) => {
                  setSelectedRegion(region);
                  setRegionOpen(true);
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="permissions">
            <RolePermissions />
          </TabsContent>
        </Tabs>
      )}

      {userOpen && (
        <UserDialog
          key={selectedUser?._id ?? "new-user"}
          user={selectedUser}
          regions={regions}
          onClose={() => setUserOpen(false)}
          onSuccess={refreshData}
        />
      )}

      {regionOpen && (
        <RegionDialog
          key={selectedRegion?._id ?? "new-region"}
          region={selectedRegion}
          onClose={() => setRegionOpen(false)}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}