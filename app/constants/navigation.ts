import {
  LayoutDashboard,
  ClipboardList,
  MapPinned,
  ScanEye,
  UsersRound,
  BellRing,
  ChartNoAxesCombined,
  FileChartColumn,
  BrainCircuit,
  ShieldCheck,
  Settings,
  ScrollText,
} from "lucide-react";

export const navigation = [
  {
    label: "Surveillance",
    items: [
      {
        title: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Inspections",
        href: "/inspections",
        icon: ClipboardList,
      },
      {
        title: "Geospatial Map",
        href: "/map",
        icon: MapPinned,
      },
      {
        title: "AI Review",
        href: "/ai-review",
        icon: ScanEye,
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
      },
      {
        title: "Alerts",
        href: "/alerts",
        icon: BellRing,
      },
    ],
  },
  {
    label: "Research & Analytics",
    items: [
      {
        title: "Analytics",
        href: "/analytics",
        icon: ChartNoAxesCombined,
      },
      {
        title: "Reports",
        href: "/reports",
        icon: FileChartColumn,
      },
      {
        title: "Model Evaluation",
        href: "/model-evaluation",
        icon: BrainCircuit,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        title: "User Management",
        href: "/users",
        icon: ShieldCheck,
      },
      {
        title: "Audit Logs",
        href: "/audit-logs",
        icon: ScrollText,
      },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];