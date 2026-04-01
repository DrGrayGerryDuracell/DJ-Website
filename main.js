(function () {
  "use strict";

  const body = document.body;
  const header = document.querySelector(".main-header");
  const banner = document.querySelector(".live-banner");
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector("#nav-links");
  let lastScrollTop = 0;
  let ticking = false;

  function setDynamicHeights() {
    if (header) {
      document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
    }

    if (banner) {
      document.documentElement.style.setProperty("--banner-h", banner.offsetHeight + "px");
    }
  }

  function updateHeader() {
    if (!header) {
      return;
    }

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop > lastScrollTop && scrollTop > 120 && !body.classList.contains("menu-open")) {
      header.classList.add("hide");
    } else {
      header.classList.remove("hide");
    }
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    ticking = false;
  }

  function setMenuState(isOpen) {
    if (!navToggle || !navLinks) {
      return;
    }

    body.classList.toggle("menu-open", isOpen);
    if (header) {
      header.classList.remove("hide");
    }
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Menü schließen" : "Menü öffnen");
  }

  function initMenu() {
    if (!navToggle || !navLinks) {
      return;
    }

    navToggle.addEventListener("click", function () {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      setMenuState(!isOpen);
    });

    navLinks.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenuState(false);
      });
    });

    document.addEventListener("click", function (event) {
      if (!body.classList.contains("menu-open")) {
        return;
      }
      if (header && header.contains(event.target)) {
        return;
      }
      setMenuState(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && body.classList.contains("menu-open")) {
        setMenuState(false);
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 760) {
        setMenuState(false);
      }
      if (header) {
        header.classList.remove("hide");
      }
      setDynamicHeights();
    });
  }

  function initSoundCloudEmbeds() {
    const soundcloudItems = document.querySelectorAll("[data-track]");
    if (!soundcloudItems.length || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }

        const container = entry.target;
        const trackId = container.getAttribute("data-track");
        if (!trackId || container.querySelector("iframe")) {
          observer.unobserve(container);
          return;
        }

        const iframe = document.createElement("iframe");
        iframe.className = "soundcloud-lazy";
        iframe.loading = "lazy";
        iframe.title = "SoundCloud Player";
        iframe.allow = "autoplay";
        iframe.src = "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/" + trackId + "&color=%23f5c84c&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false";

        container.innerHTML = "";
        container.appendChild(iframe);
        observer.unobserve(container);
      });
    }, {
      rootMargin: "120px 0px",
      threshold: 0.01
    });

    soundcloudItems.forEach(function (item) {
      observer.observe(item);
    });
  }

  function createCatalogCard(item) {
    function slugify(value) {
      return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }

    function isExternalUrl(href) {
      return typeof href === "string" && /^https?:\/\//i.test(href);
    }

    function resolveExternalLink(item) {
      const liveStatus = window.LIVE_LINK_STATUS && window.LIVE_LINK_STATUS.items ? window.LIVE_LINK_STATUS.items[item.id] : null;
      const fallbackHref = (liveStatus && liveStatus.fallbackHref) || (window.LIVE_LINK_STATUS && window.LIVE_LINK_STATUS.storeHref) || "https://www.shirtee.com/de/store/drgray-mrsdrgray/";
      const verified = Boolean(liveStatus && liveStatus.verified && Number(liveStatus.httpCode) === 200);

      if (verified) {
        return {
          href: liveStatus.finalUrl || item.href,
          label: "Jetzt kaufen"
        };
      }

      return {
        href: isExternalUrl(item.href) ? item.href : fallbackHref,
        label: "Store ansehen"
      };
    }

    const article = document.createElement("article");
    article.className = "catalog-card feature-card";
    const lineSlug = slugify(item.line);
    if (lineSlug) {
      article.classList.add("line-" + lineSlug);
    }
    article.setAttribute("data-line", lineSlug);
    article.setAttribute("data-section", String(item.section || "").toLowerCase());
    article.setAttribute("data-item-id", String(item.id || ""));
    article.setAttribute(
      "data-search",
      [
        item.title,
        item.slogan,
        item.copy,
        item.line,
        Array.isArray(item.products) ? item.products.join(" ") : "",
        Array.isArray(item.tags) ? item.tags.join(" ") : ""
      ].join(" ").toLowerCase()
    );

    const visual = document.createElement("div");
    visual.className = "catalog-card-visual";

    const image = document.createElement("img");
    image.src = item.image;
    image.alt = item.title;
    image.loading = "lazy";
    image.width = 900;
    image.height = 700;
    visual.appendChild(image);

    const header = document.createElement("div");
    header.className = "catalog-header";

    const line = document.createElement("span");
    line.className = "catalog-line";
    line.textContent = item.line;

    header.appendChild(line);

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = item.title;

    const slogan = document.createElement("p");
    slogan.className = "card-copy";
    slogan.textContent = item.slogan;

    const copy = document.createElement("p");
    copy.className = "card-copy";
    copy.textContent = item.copy;

    const products = document.createElement("div");
    products.className = "catalog-products";
    item.products.forEach(function (product) {
      const chip = document.createElement("span");
      chip.textContent = product;
      products.appendChild(chip);
    });

    const tags = document.createElement("div");
    tags.className = "pill-row";
    item.tags.forEach(function (tag) {
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = tag;
      tags.appendChild(pill);
    });

    const cta = document.createElement("div");
    cta.className = "cta-row";

    const link = document.createElement("a");
    link.className = "btn btn-secondary";

    if (isExternalUrl(item.href)) {
      const resolved = resolveExternalLink(item);
      link.href = resolved.href;
      link.textContent = resolved.label;
    } else if (String(item.href).indexOf("#") !== -1) {
      link.href = item.href;
      link.textContent = "Zum Abschnitt";
    } else {
      link.href = item.href;
      link.textContent = "Mehr ansehen";
    }

    if (isExternalUrl(item.href)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }

    cta.appendChild(link);

    article.appendChild(visual);
    article.appendChild(header);
    article.appendChild(title);
    article.appendChild(slogan);
    article.appendChild(copy);
    article.appendChild(products);
    article.appendChild(tags);
    article.appendChild(cta);

    return article;
  }

  function initMerchCatalog() {
    const catalog = window.MERCH_CATALOG;
    if (!catalog || !Array.isArray(catalog.items)) {
      return;
    }

    function uniqueIds(ids) {
      const seen = new Set();
      return ids.filter(function (id) {
        if (seen.has(id)) {
          return false;
        }
        seen.add(id);
        return true;
      });
    }

    function getSpotlightIds(mode) {
      if (mode === "new") {
        return uniqueIds(
          catalog.items
            .map(function (item) {
              return item && item.id;
            })
            .filter(Boolean)
            .slice(-8)
            .reverse()
        );
      }

      return uniqueIds(Array.isArray(catalog.spotlight) ? catalog.spotlight.slice() : []);
    }

    function getItemsFromIds(ids) {
      return ids.map(function (id) {
        return catalog.items.find(function (item) {
          return item.id === id;
        });
      }).filter(Boolean);
    }

    document.querySelectorAll("[data-merch-section]").forEach(function (container) {
      const section = container.getAttribute("data-merch-section");
      const items = catalog.items.filter(function (item) {
        return item.section === section;
      });
      items.sort(function (a, b) {
        return String(a.title || "").localeCompare(String(b.title || ""), "de");
      });

      if (!items.length) {
        return;
      }

      container.innerHTML = "";
      items.forEach(function (item) {
        container.appendChild(createCatalogCard(item));
      });
    });

    document.querySelectorAll("[data-merch-spotlight]").forEach(function (container) {
      const mode = String(container.getAttribute("data-merch-spotlight") || "top").toLowerCase();
      const limit = Math.max(1, Number(container.getAttribute("data-merch-limit")) || 6);
      const spotlightIds = getSpotlightIds(mode);
      const items = getItemsFromIds(spotlightIds).slice(0, limit);

      if (!items.length) {
        return;
      }

      container.innerHTML = "";
      items.forEach(function (item) {
        container.appendChild(createCatalogCard(item));
      });
    });
  }

  function initShopFilters() {
    const shopFilter = document.querySelector("[data-shop-filter]");
    if (!shopFilter) {
      return;
    }

    const buttons = Array.from(shopFilter.querySelectorAll("[data-filter-section]"));
    const searchInput = shopFilter.querySelector("[data-shop-search]");
    const resultNode = document.querySelector("[data-shop-filter-result]");
    const cards = Array.from(document.querySelectorAll(".catalog-grid[data-merch-section] .catalog-card"));
    const sectionGrids = Array.from(document.querySelectorAll(".catalog-grid[data-merch-section]"));
    let activeSection = "all";
    let searchQuery = "";

    function updateButtonState() {
      buttons.forEach(function (button) {
        const isActive = button.getAttribute("data-filter-section") === activeSection;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    }

    function applyFilters() {
      let visibleCount = 0;
      cards.forEach(function (card) {
        const section = card.getAttribute("data-section");
        const search = card.getAttribute("data-search") || "";
        const sectionMatch = activeSection === "all" || section === activeSection;
        const searchMatch = !searchQuery || search.indexOf(searchQuery) !== -1;
        const isVisible = sectionMatch && searchMatch;
        card.hidden = !isVisible;
        if (isVisible) {
          visibleCount += 1;
        }
      });

      sectionGrids.forEach(function (grid) {
        const hasVisibleCards = Array.from(grid.children).some(function (child) {
          return !child.hidden;
        });
        grid.hidden = !hasVisibleCards;
      });

      if (resultNode) {
        if (!visibleCount) {
          resultNode.textContent = "Keine Treffer. Bitte Filter oder Suchbegriff anpassen.";
        } else if (activeSection === "all" && !searchQuery) {
          resultNode.textContent = "Alle Artikel sichtbar.";
        } else {
          resultNode.textContent = String(visibleCount) + " passende Artikel gefunden.";
        }
      }
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        activeSection = button.getAttribute("data-filter-section") || "all";
        updateButtonState();
        applyFilters();
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        searchQuery = String(searchInput.value || "").trim().toLowerCase();
        applyFilters();
      });
    }

    updateButtonState();
    applyFilters();
  }

  function initMerchOptions() {
    const catalog = window.MERCH_CATALOG;
    if (!catalog || !Array.isArray(catalog.items)) {
      return;
    }

    const unique = new Map();
    catalog.items.forEach(function (item) {
      if (!Array.isArray(item.products)) {
        return;
      }
      item.products.forEach(function (name) {
        const label = String(name || "").trim();
        if (!label) {
          return;
        }
        const key = label.toLowerCase();
        if (!unique.has(key)) {
          unique.set(key, label);
        }
      });
    });

    const options = Array.from(unique.values()).sort(function (a, b) {
      return a.localeCompare(b, "de");
    });

    document.querySelectorAll("[data-merch-options-count]").forEach(function (node) {
      node.textContent = String(options.length);
    });

    document.querySelectorAll("[data-merch-options]").forEach(function (container) {
      container.innerHTML = "";
      options.forEach(function (label) {
        const chip = document.createElement("span");
        chip.className = "merch-option-chip";
        chip.textContent = label;
        container.appendChild(chip);
      });
    });
  }

  function initFadeIns() {
    const items = document.querySelectorAll(".feature-card, .quote-card, .timeline-item, .soundcloud-item, .merch-card, .catalog-card, .video-card, .reel-card, .info-panel, .contact-card, .track-note, .panel-image");
    if (!items.length || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.15,
      rootMargin: "0px 0px -40px 0px"
    });

    items.forEach(function (item, index) {
      item.classList.add("fade-in");
      item.style.setProperty("--fade-delay", Math.min(index * 35, 260) + "ms");
      observer.observe(item);
    });
  }

  function initYear() {
    const year = new Date().getFullYear();
    document.querySelectorAll("[data-year]").forEach(function (node) {
      node.textContent = String(year);
    });
  }

  window.addEventListener("scroll", function () {
    if (!ticking) {
      window.requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }, { passive: true });

  window.addEventListener("load", setDynamicHeights);
  document.addEventListener("DOMContentLoaded", function () {
    setDynamicHeights();
    if (header) {
      header.classList.remove("hide");
    }
    initMenu();
    initSoundCloudEmbeds();
    initMerchCatalog();
    initMerchOptions();
    initShopFilters();
    initFadeIns();
    initYear();
  });
})();
