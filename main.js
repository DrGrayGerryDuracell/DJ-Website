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

  function initFadeIns() {
    const items = document.querySelectorAll(".feature-card, .quote-card, .timeline-item, .soundcloud-item, .merch-card, .video-card, .info-panel, .contact-card, .track-note, .panel-image");
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

    items.forEach(function (item) {
      item.classList.add("fade-in");
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
    initFadeIns();
    initYear();
  });
})();
