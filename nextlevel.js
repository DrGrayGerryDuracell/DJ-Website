/**
 * Dr.Gray & Mrs.Dr.Gray 🖤 — Next-Level JavaScript Enhancement
 * Einbindung: <script src="nextlevel.js" defer></script> (nach main.js)
 */

(function() {
  'use strict';

  // ===== 1. SCROLL REVEAL OBSERVER =====
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Einmalig, nicht wieder ausblenden
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  // Alle Elemente mit reveal-Klassen beobachten
  function initReveal() {
    document.querySelectorAll('.reveal-up, .reveal-fade').forEach(el => {
      revealObserver.observe(el);
    });
  }

  // ===== 2. AUDIO VISUALIZER GENERATOR =====
  function createAudioVisualizer(container, barCount = 40) {
    const viz = document.createElement('div');
    viz.className = 'audio-viz-bg';
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement('div');
      bar.className = 'audio-viz-bar';
      bar.style.animationDelay = `${(i / barCount) * 1.2}s`;
      viz.appendChild(bar);
    }
    container.appendChild(viz);
  }

  // ===== 3. MOUSE GLOW EFFECT =====
  function initMouseGlow() {
    if (window.matchMedia('(pointer: coarse)').matches) return; // Touch-Geräte skip

    const glow = document.createElement('div');
    glow.style.cssText = `
      position: fixed;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(245,200,76,0.06), transparent 70%);
      pointer-events: none;
      transform: translate(-50%, -50%);
      z-index: 9999;
      transition: opacity 0.2s ease;
      opacity: 0;
    `;
    document.body.appendChild(glow);

    let rafId = null;
    document.addEventListener('mousemove', (e) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
        glow.style.opacity = '1';
      });
    });

    document.addEventListener('mouseleave', () => {
      glow.style.opacity = '0';
    });
  }

  // ===== 4. BPM COUNTER (nur visuell, für Show) =====
  function initBPMGlow() {
    const bpm = 145; // Standard BPM deines Sets
    const interval = 60000 / bpm; // ms pro Beat

    setInterval(() => {
      document.querySelectorAll('.live-dot').forEach(dot => {
        dot.style.transform = 'scale(1.5)';
        dot.style.opacity = '1';
        setTimeout(() => {
          dot.style.transform = 'scale(1)';
        }, 100);
      });
    }, interval);
  }

  // ===== 5. SMOOTH SCROLL MIT OFFSET =====
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          e.preventDefault();
          const offset = (document.getElementById('site-header')?.offsetHeight || 0)
                       + (document.querySelector('.live-banner')?.offsetHeight || 0);
          window.scrollTo({
            top: target.getBoundingClientRect().top + window.scrollY - offset - 20,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  // ===== 6. EQUALIZER IN NAV BRAND =====
  function initNavEqualizer() {
    const brand = document.querySelector('.nav-brand');
    if (!brand) return;
    const eq = document.createElement('span');
    eq.className = 'eq-icon';
    eq.innerHTML = '<span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span>';
    eq.style.marginLeft = '8px';
    brand.querySelector('.nav-brand-text')?.appendChild(eq);
  }

  // ===== INITIALISIERUNG =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  function initAll() {
    initReveal();
    initMouseGlow();
    initBPMGlow();
    initSmoothScroll();
    initNavEqualizer();

    // Audio Visualizer am Ende des body einfügen
    if (!document.querySelector('.audio-viz-bg')) {
      createAudioVisualizer(document.body);
    }
  }
})();
