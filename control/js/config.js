export const controlNav = [
  { id: "overview", label: "Overview" },
  { id: "website", label: "Website" },
  { id: "shop", label: "Shop" },
  { id: "live-activity", label: "Live Activity" },
  { id: "performance", label: "Performance" },
  { id: "content", label: "Content" },
  { id: "social", label: "Social" },
  { id: "alerts", label: "Alerts" },
  { id: "settings", label: "Settings" }
];

export const dateRanges = [
  { id: "today", label: "Heute" },
  { id: "week", label: "7 Tage" },
  { id: "month", label: "30 Tage" }
];

export const controlAuthConfig = {
  enabled: true,
  ownerLabel: "Private Session",
  sessionHours: 12,
  salt: "drgray-control-salt-v1",
  passphraseHash: "811b04c1a4d0b08cab49c67946d7230e1f20be5824b532b9ba763a2fca8fed01",
  storageKey: "dg-control-auth"
};
