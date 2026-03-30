export const DASHBOARD_ROUTE = "/control";

export const DASHBOARD_NAV = [
  "Overview",
  "Website",
  "Shop",
  "Live Activity",
  "Performance",
  "Content",
  "Social",
  "Alerts",
  "Settings"
] as const;

export const DATA_SOURCE_FLAGS = {
  mode: "mock" as const,
  websiteMetrics: "mock" as const,
  shopMetrics: "mock" as const,
  socialMetrics: "mock" as const,
  performanceMetrics: "mock" as const
};
