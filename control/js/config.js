export const controlNav = [
  { id: "overview", label: "Übersicht", hint: "Systemstatus und Kern-KPIs" },
  { id: "kanban", label: "Kanban", hint: "Aufgaben, Status und Services", group: "Betrieb" },
  { id: "agentsroom", label: "AgentsRoom", hint: "Routing, Agenten und Geräte", group: "Betrieb" },
  { id: "home-assistant", label: "Home Assistant", hint: "HA, Backup und Mac mini", group: "Betrieb" },
  { id: "website", label: "Website", hint: "HTTP Checks und Seitenwerte", group: "Marketing" },
  { id: "shop", label: "Shop", hint: "Shop-Linkmonitor und Produktchecks", group: "Marketing" },
  { id: "catalog-upload", label: "Katalog Uploads", hint: "Alle Artikel mit Upload-Status", group: "Marketing" },
  { id: "content", label: "Inhalte", hint: "Content-Struktur und CTA-Hinweise", group: "Marketing" },
  { id: "social", label: "Social", hint: "Profile, Signale, Vergleiche", group: "Marketing" },
  { id: "live-activity", label: "Aktivität", hint: "Letzte Prüfereignisse", group: "System" },
  { id: "performance", label: "Technik", hint: "Verfügbarkeit und Fehlerlog", group: "System" },
  { id: "alerts", label: "Warnungen", hint: "Priorisierte Auffälligkeiten", group: "System" },
  { id: "settings", label: "Aktionen", hint: "Direkte Schnellzugriffe", group: "System" }
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
