export const controlNav = [
  { id: "overview", label: "Übersicht", hint: "Systemstatus und Kern-KPIs" },
  { id: "agentsroom", label: "AgentsRoom", hint: "Routing, Agenten und Geräte" },
  { id: "home-assistant", label: "Home Assistant", hint: "HA, Backup und Mac mini" },
  { id: "website", label: "Website", hint: "HTTP Checks und Seitenwerte" },
  { id: "shop", label: "Shop", hint: "Shop-Linkmonitor und Produktchecks" },
  { id: "catalog-upload", label: "Katalog Uploads", hint: "Alle Artikel mit Upload-Status" },
  { id: "live-activity", label: "Aktivität", hint: "Letzte Prüfereignisse" },
  { id: "performance", label: "Technik", hint: "Verfügbarkeit und Fehlerlog" },
  { id: "content", label: "Inhalte", hint: "Content-Struktur und CTA-Hinweise" },
  { id: "social", label: "Social", hint: "Profile, Signale, Vergleiche" },
  { id: "alerts", label: "Warnungen", hint: "Priorisierte Auffälligkeiten" },
  { id: "settings", label: "Aktionen", hint: "Direkte Schnellzugriffe" }
];

export const dateRanges = [
  { id: "live", label: "Live-Daten" }
];

export const controlAuthConfig = {
  enabled: true,
  ownerLabel: "Privater Zugriff",
  sessionHours: 12,
  salt: "drgray-control-salt-v1",
  passphraseHash: "811b04c1a4d0b08cab49c67946d7230e1f20be5824b532b9ba763a2fca8fed01",
  storageKey: "dg-control-auth"
};
