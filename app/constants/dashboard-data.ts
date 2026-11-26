export const dashboardStats = {
  totalInspections: 1248,
  positiveSites: 286,
  pendingReviews: 42,
  activeInspectors: 18,
};

export const inspectionTrends = [
  { day: "Mon", inspections: 62, positive: 18 },
  { day: "Tue", inspections: 90, positive: 24 },
  { day: "Wed", inspections: 75, positive: 20 },
  { day: "Thu", inspections: 110, positive: 35 },
  { day: "Fri", inspections: 92, positive: 28 },
  { day: "Sat", inspections: 120, positive: 42 },
  { day: "Sun", inspections: 105, positive: 32 },
];

export const detectionDistribution = [
  { name: "Negative", value: 920, fill: "#0d9488" },
  { name: "Positive", value: 286, fill: "#ef4444" },
  { name: "Pending", value: 42, fill: "#94a3b8" },
];

export const recentInspections = [
  {
    id: "INS-001",
    location: "Saidpur",
    container: "Water Tank",
    larvae: 12,
    confidence: 94,
    status: "Positive",
    date: "2026-11-26",
  },
  {
    id: "INS-002",
    location: "Rangpur",
    container: "Plastic Bucket",
    larvae: 0,
    confidence: 97,
    status: "Negative",
    date: "2026-11-26",
  },
  {
    id: "INS-003",
    location: "Nilphamari",
    container: "Old Tire",
    larvae: 8,
    confidence: 72,
    status: "Pending",
    date: "2026-11-25",
  },
  {
    id: "INS-004",
    location: "Dinajpur",
    container: "Flower Pot",
    larvae: 5,
    confidence: 91,
    status: "Positive",
    date: "2026-11-25",
  },
  {
    id: "INS-005",
    location: "Saidpur",
    container: "Water Drum",
    larvae: 0,
    confidence: 96,
    status: "Negative",
    date: "2026-11-24",
  },
];

export const priorityAlerts = [
  {
    id: "ALT-001",
    title: "Verified larvae finding",
    location: "Saidpur",
    description: "Follow-up site inspection requested.",
    priority: "High",
  },
  {
    id: "ALT-002",
    title: "Detection needs verification",
    location: "Nilphamari",
    description: "AI prediction requires expert review.",
    priority: "Medium",
  },
  {
    id: "ALT-003",
    title: "Follow-up inspection due",
    location: "Rangpur",
    description: "Scheduled site reinspection is pending.",
    priority: "Medium",
  },
];