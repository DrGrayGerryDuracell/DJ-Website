import type { DashboardData } from "../types/dashboard";

export const mockDashboardData: DashboardData = {
  metadata: {
    mode: "mock",
    generatedAt: "2026-03-30T21:45:00+02:00",
    timezone: "Europe/Berlin"
  },
  systemStatus: {
    website: { label: "Website", value: "Online", level: "ok" },
    storeLinks: { label: "Shop-Links", value: "Teilweise eingeschraenkt", level: "warn" },
    contactFlow: { label: "Kontakt-Flow", value: "Stabil", level: "ok" },
    deployment: { label: "Deployment", value: "Vercel-ready", level: "ok" }
  },
  overviewKpis: [
    { id: "visitorsToday", label: "Besucher heute", value: 1482, delta: "+12.4%", trend: "up" },
    { id: "visitorsWeek", label: "Besucher Woche", value: 9826, delta: "+7.9%", trend: "up" },
    { id: "pageviews", label: "Seitenaufrufe", value: 24231, delta: "+9.1%", trend: "up" },
    { id: "activeUsers", label: "Aktive Nutzer", value: 114, delta: "+5", trend: "up" },
    { id: "shopClicks", label: "Shop-Klicks", value: 689, delta: "+18.2%", trend: "up" },
    { id: "contactClicks", label: "Kontakt-Klicks", value: 87, delta: "+3.4%", trend: "up" },
    { id: "socialClicks", label: "Social-Klicks", value: 412, delta: "+11.5%", trend: "up" },
    { id: "revenueToday", label: "Umsatz heute", value: 486, unit: "EUR", delta: "+6.2%", trend: "up" },
    { id: "ordersToday", label: "Bestellungen heute", value: 19, delta: "+4", trend: "up" },
    { id: "openOrders", label: "Offene Bestellungen", value: 13, delta: "-2", trend: "down" },
    { id: "conversionRate", label: "Conversion Rate", value: 2.7, unit: "%", delta: "+0.3pp", trend: "up" },
    { id: "warnings", label: "Warnungen", value: 3, delta: "+1", trend: "neutral" }
  ],
  websiteMetrics: {
    trafficSeries: [
      { label: "Mo", visitors: 1180, pageviews: 3560 },
      { label: "Di", visitors: 1244, pageviews: 3899 },
      { label: "Mi", visitors: 1312, pageviews: 4010 },
      { label: "Do", visitors: 1390, pageviews: 4202 },
      { label: "Fr", visitors: 1536, pageviews: 4610 },
      { label: "Sa", visitors: 1668, pageviews: 5022 },
      { label: "So", visitors: 1496, pageviews: 4684 }
    ],
    topPages: [
      { page: "/index.html", views: 8960, ctr: "4.8%" },
      { page: "/shop.html", views: 6412, ctr: "8.1%" },
      { page: "/musik.html", views: 3320, ctr: "3.7%" },
      { page: "/videos.html", views: 2985, ctr: "4.2%" },
      { page: "/bio.html", views: 2554, ctr: "3.1%" }
    ],
    audiences: [
      { label: "Neu", value: 63 },
      { label: "Wiederkehrend", value: 37 }
    ],
    sources: [
      { label: "Direkt", value: 42 },
      { label: "TikTok", value: 24 },
      { label: "Instagram", value: 11 },
      { label: "SoundCloud", value: 9 },
      { label: "Suche", value: 14 }
    ],
    devices: [
      { label: "Mobile", value: 71 },
      { label: "Desktop", value: 24 },
      { label: "Tablet", value: 5 }
    ],
    regions: [
      { region: "DE / NRW", share: "34%" },
      { region: "DE / Berlin", share: "12%" },
      { region: "AT", share: "8%" },
      { region: "CH", share: "6%" },
      { region: "NL", share: "5%" }
    ],
    engagement: {
      avgSession: "03:42",
      bounceRate: "37%",
      buttonCtr: "5.9%"
    }
  },
  shopMetrics: {
    period: {
      today: { orders: 19, revenue: 486, conversion: "2.7%" },
      week: { orders: 121, revenue: 3214, conversion: "2.5%" },
      month: { orders: 428, revenue: 11462, conversion: "2.3%" }
    },
    catalog: {
      totalItems: 167,
      liveItems: 2,
      uploadWave: 70,
      sections: [
        { label: "Herren", items: 31 },
        { label: "Damen", items: 35 },
        { label: "Couple", items: 31 },
        { label: "Unisex", items: 28 },
        { label: "Accessoires", items: 32 },
        { label: "Special", items: 10 }
      ]
    },
    topProducts: [
      { name: "Mrs. Dr. Gray Crop Shirt", clicks: 143, orders: 11, revenue: 286 },
      { name: "Mrs. Dr. Gray Unisex Hoodie", clicks: 119, orders: 8, revenue: 298 },
      { name: "Top Upload Tee Sets", clicks: 96, orders: 6, revenue: 214 }
    ],
    cartAbandonment: "41%",
    averageOrderValue: "25.58 EUR",
    customerSplit: { newCustomers: 58, returningCustomers: 42 },
    timeline: [
      { time: "12:05", type: "order", detail: "Neue Bestellung: Crop Shirt" },
      { time: "12:38", type: "click", detail: "Top Upload Hoodie geklickt" },
      { time: "13:16", type: "order", detail: "Bestellung: Unisex Hoodie" },
      { time: "14:02", type: "warning", detail: "3 Campaign-URLs liefern 404" },
      { time: "14:24", type: "order", detail: "Bestellung: Couple Tee Set" }
    ]
  },
  socialMetrics: {
    links: [
      { platform: "TikTok Dr. Gray", clicks: 244, ctr: "6.2%" },
      { platform: "TikTok Mrs.", clicks: 171, ctr: "4.9%" },
      { platform: "SoundCloud", clicks: 133, ctr: "3.8%" },
      { platform: "Shop", clicks: 689, ctr: "8.1%" },
      { platform: "Kontakt", clicks: 87, ctr: "2.3%" }
    ],
    comparisons: [
      { label: "TikTok gesamt vs Shop", value: "1:1.66" },
      { label: "SoundCloud vs TikTok gesamt", value: "1:3.12" }
    ],
    officialAccounts: [
      { label: "Website", url: "https://drgray-mrsdrgray.com", status: "live" },
      { label: "Shirtee Store", url: "https://www.shirtee.com/de/store/drgray-mrsdrgray/", status: "live" },
      { label: "SoundCloud", url: "https://soundcloud.com/drgray_sic", status: "live" },
      { label: "TikTok Dr. Gray", url: "https://www.tiktok.com/@dr.gray.sic", status: "live" },
      { label: "TikTok Mrs.", url: "https://www.tiktok.com/@ktina1986", status: "live" }
    ]
  },
  performanceMetrics: {
    webVitals: [
      { metric: "LCP", value: "2.1s", state: "good" },
      { metric: "INP", value: "147ms", state: "good" },
      { metric: "CLS", value: "0.04", state: "good" }
    ],
    responseTime: "286ms",
    uptime: "99.96%",
    externalChecks: [
      { label: "Store URL", status: "OK", level: "ok" },
      { label: "3 neue Produkt-URLs", status: "404", level: "warn" },
      { label: "Kontakt Mailto", status: "OK", level: "ok" }
    ],
    errorLog: [
      { id: "E-104", scope: "shop", message: "3 bekannte Kampagnenpfade nicht oeffentlich erreichbar", level: "warn" },
      { id: "E-077", scope: "media", message: "Ein Video-Fallback auf mobile aktiv", level: "info" }
    ]
  },
  contentPerformance: {
    strongestSections: [
      { section: "Shop Radar", score: 92 },
      { section: "Hero + CTA", score: 88 },
      { section: "Videos", score: 83 }
    ],
    ctas: [
      { name: "Zum Shirtee Store", clicks: 462, rate: "8.4%" },
      { name: "Jetzt kaufen", clicks: 188, rate: "10.3%" },
      { name: "Drop Anfragen", clicks: 59, rate: "2.1%" }
    ],
    weakSpots: [
      { item: "Kontaktbereich Mobile", note: "Formular-Alternative mit mehr Direkt-Buttons testen" },
      { item: "Unisex Teaser", note: "Benefit-Kommunikation klarer priorisieren" }
    ]
  },
  activityFeed: [
    { id: "A1", time: "vor 2m", type: "order", text: "Neue Bestellung im Shirtee Store erfasst" },
    { id: "A2", time: "vor 7m", type: "click", text: "Shop CTA auf /shop.html geklickt" },
    { id: "A3", time: "vor 12m", type: "social", text: "TikTok-Profilaufruf aus Hero-Bereich" },
    { id: "A4", time: "vor 19m", type: "contact", text: "Kontakt-Link fuer Booking angeklickt" },
    { id: "A5", time: "vor 27m", type: "warn", text: "404 Check fuer 3 neue Kampagnen bestaetigt" }
  ],
  alerts: [
    { id: "AL-1", level: "warn", title: "Neue Shirtee-Produktlinks liefern 404", description: "Betroffen: 3 Kampagnen-URLs. Fallback auf Store-Hauptseite aktiv.", source: "Shop Monitoring" },
    { id: "AL-2", level: "info", title: "Traffic-Spike am Freitag erkannt", description: "Live-Zeitslot 20:00-22:00 erzeugt +21% mehr Sessions.", source: "Website Monitoring" },
    { id: "AL-3", level: "ok", title: "Core-Seiten online", description: "Alle Hauptseiten antworten stabil ohne Ausfall.", source: "Performance" }
  ],
  quickActions: [
    { id: "qa-1", label: "Website oeffnen", href: "https://drgray-mrsdrgray.com", external: true },
    { id: "qa-2", label: "Shop Seite oeffnen", href: "https://drgray-mrsdrgray.com/shop.html", external: true },
    { id: "qa-3", label: "Shirtee Store", href: "https://www.shirtee.com/de/store/drgray-mrsdrgray/", external: true },
    { id: "qa-7", label: "SoundCloud Profil", href: "https://soundcloud.com/drgray_sic", external: true },
    { id: "qa-4", label: "TikTok Dr. Gray", href: "https://www.tiktok.com/@dr.gray.sic", external: true },
    { id: "qa-8", label: "TikTok Mrs.", href: "https://www.tiktok.com/@ktina1986", external: true },
    { id: "qa-5", label: "Kontakt testen", href: "https://drgray-mrsdrgray.com/kontakt.html", external: true },
    { id: "qa-6", label: "Report Export (mock)", href: "#export", external: false }
  ]
};
