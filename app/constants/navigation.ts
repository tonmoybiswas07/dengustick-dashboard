import {
  LayoutDashboard,
  ClipboardList,
  Map,
  ScanEye,
  UsersRound,
  BellRing,
  ChartNoAxesCombined,
  FileText,
  BrainCircuit,
  Settings,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";
import type { Permission } from "@/app/types/auth";

interface NavigationItem {
  title: string;
  href: string;
  icon: LucideIcon;
  permission: Permission;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export const navigation: NavigationGroup[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: "dashboard:view",
      },
    ],
  },
  {
    label: "Surveillance",
    items: [
      {
        title: "Inspections",
        href: "/inspections",
        icon: ClipboardList,
        permission: "inspections:view",
      },
      {
        title: "Geospatial Map",
        href: "/map",
        icon: Map,
        permission: "map:view",
      },
      {
        title: "AI Review",
        href: "/ai-review",
        icon: ScanEye,
        permission: "ai:review",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Field Operations",
        href: "/field-operations",
        icon: UsersRound,
        permission: "operations:view",
      },
      {
        title: "Alerts",
        href: "/alerts",
        icon: BellRing,
        permission: "alerts:view",
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        title: "Analytics",
        href: "/analytics",
        icon: ChartNoAxesCombined,
        permission: "analytics:view",
      },
      {
        title: "Reports",
        href: "/reports",
        icon: FileText,
        permission: "reports:view",
      },
      {
        title: "Model Evaluation",
        href: "/model-evaluation",
        icon: BrainCircuit,
        permission: "models:evaluate",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Administration",
        href: "/administration",
        icon: Settings,
        permission: "users:manage",
      },
    ],
  },
];