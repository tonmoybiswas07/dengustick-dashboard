import type { UserRole } from "@/app/types/auth";

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  regionId?: string | null;
  image?: string | null;
  emailVerified: boolean;
  banned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Region {
  _id?: string;
  name: string;
  code: string;
  district: string;
  division: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegionDTO
  extends Omit<
    Region,
    "_id" | "createdAt" | "updatedAt"
  > {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  fieldWorkers: number;
  totalRegions: number;
  activeRegions: number;
}