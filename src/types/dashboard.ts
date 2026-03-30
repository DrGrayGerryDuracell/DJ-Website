export type StatusLevel = "ok" | "warn" | "info" | "error";
export type Trend = "up" | "down" | "neutral";

export interface SystemStatusItem {
  label: string;
  value: string;
  level: StatusLevel;
}

export interface KpiItem {
  id: string;
  label: string;
  value: number;
  unit?: "EUR" | "%";
  delta: string;
  trend: Trend;
}

export interface TrafficPoint {
  label: string;
  visitors: number;
  pageviews: number;
}

export interface PagePerformance {
  page: string;
  views: number;
  ctr: string;
}

export interface ShopPeriod {
  orders: number;
  revenue: number;
  conversion: string;
}

export interface ShopProduct {
  name: string;
  clicks: number;
  orders: number;
  revenue: number;
}

export interface ActivityItem {
  id: string;
  time: string;
  type: "order" | "click" | "social" | "contact" | "warn" | "warning";
  text: string;
}

export interface AlertItem {
  id: string;
  level: StatusLevel;
  title: string;
  description: string;
  source: string;
}

export interface QuickAction {
  id: string;
  label: string;
  href: string;
  external: boolean;
}

export interface DashboardData {
  metadata: {
    mode: "mock" | "live" | "hybrid";
    generatedAt: string;
    timezone: string;
  };
  systemStatus: Record<string, SystemStatusItem>;
  overviewKpis: KpiItem[];
  websiteMetrics: {
    trafficSeries: TrafficPoint[];
    topPages: PagePerformance[];
    audiences: Array<{ label: string; value: number }>;
    sources: Array<{ label: string; value: number }>;
    devices: Array<{ label: string; value: number }>;
    regions: Array<{ region: string; share: string }>;
    engagement: { avgSession: string; bounceRate: string; buttonCtr: string };
  };
  shopMetrics: {
    period: { today: ShopPeriod; week: ShopPeriod; month: ShopPeriod };
    topProducts: ShopProduct[];
    cartAbandonment: string;
    averageOrderValue: string;
    customerSplit: { newCustomers: number; returningCustomers: number };
    timeline: Array<{ time: string; type: string; detail: string }>;
  };
  socialMetrics: {
    links: Array<{ platform: string; clicks: number; ctr: string }>;
    comparisons: Array<{ label: string; value: string }>;
    officialAccounts: Array<{ label: string; url: string; status: "live" | "check" }>;
  };
  performanceMetrics: {
    webVitals: Array<{ metric: string; value: string; state: "good" | "warn" }>;
    responseTime: string;
    uptime: string;
    externalChecks: Array<{ label: string; status: string; level: StatusLevel }>;
    errorLog: Array<{ id: string; scope: string; message: string; level: "warn" | "info" | "error" }>;
  };
  contentPerformance: {
    strongestSections: Array<{ section: string; score: number }>;
    ctas: Array<{ name: string; clicks: number; rate: string }>;
    weakSpots: Array<{ item: string; note: string }>;
  };
  activityFeed: ActivityItem[];
  alerts: AlertItem[];
  quickActions: QuickAction[];
}
