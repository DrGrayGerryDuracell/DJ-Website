/**
 * ═══════════════════════════════════════════════════════════════
 * SOUNDCLOUD SYNC SYSTEM (Simplified)
 * Uses direct SoundCloud track embeds + local data
 * No API key needed
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // Track metadata (update this with newest track info)
  const TRACKS = [
    {
      id: '2126060061',
      title: 'Emotional Flow',
      date: '2025-10-07',
      description: 'Aktuellster Upload – melodic, treibend, mit Herz.'
    },
    {
      id: '2168299668',
      title: 'Old Dogs are better Raver',
      date: '2025-09-19',
      description: 'Peaktime für die Erfahrenen. Rough, direkt, unverfälscht.'
    },
    {
      id: '2008790983',
      title: 'SYNCOPATH Part II',
      date: '2025-09-10',
      description: 'Die Reihe geht weiter. Kontrollierte Intensität, perfekt für die späte Nacht.'
    }
  ];

  /**
   * Initialize SoundCloud widgets on page
   */
  function initSoundCloudWidgets() {
    console.log('🎵 Initializing SoundCloud widgets...');

    // Update track display
    const container = document.querySelector('[data-soundcloud-tracks]');
    if (container) {
      updateTrackDisplay(container);
    }

    // Load SoundCloud embed script
    loadSoundCloudEmbedScript();

    console.log('✅ SoundCloud sync ready');
  }

  /**
   * Update track cards
   */
  function updateTrackDisplay(container) {
    if (!container) return;

    container.innerHTML = TRACKS.slice(0, 3)
      .map(
        (track) => `
      <article class="track-card scroll-fade-in">
        <h3 class="card-title">${escapeHtml(track.title)}</h3>
        <p class="card-copy">
          Hochgeladen: ${formatDate(track.date)}<br>
          <em>${escapeHtml(track.description)}</em>
        </p>
        <a href="https://soundcloud.com/drgray_sic/tracks" target="_blank" rel="noopener" class="btn btn-secondary">
          SoundCloud öffnen
        </a>
      </article>
    `
      )
      .join('');
  }

  /**
   * Load SoundCloud embed script
   */
  function loadSoundCloudEmbedScript() {
    if (window.SC && window.SC.Widget) {
      console.log('✅ SoundCloud script already loaded');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://w.soundcloud.com/player/api.js';
    script.async = true;
    script.onload = function () {
      console.log('✅ SoundCloud API loaded');
      initSoundCloudEmbeds();
    };
    document.body.appendChild(script);
  }

  /**
   * Initialize SoundCloud embed players
   */
  function initSoundCloudEmbeds() {
    if (!window.SC || !window.SC.Widget) {
      console.log('⏳ Waiting for SC.Widget...');
      setTimeout(initSoundCloudEmbeds, 500);
      return;
    }

    const iframes = document.querySelectorAll('[data-track]');
    if (iframes.length === 0) {
      console.log('📭 No SoundCloud iframes found');
      return;
    }

    iframes.forEach((iframe, index) => {
      const trackId = iframe.getAttribute('data-track');
      if (!trackId) return;

      const widget = SC.Widget(iframe);
      widget.bind(SC.Widget.Events.READY, function () {
        console.log(`✅ Track ${index + 1} ready`);
      });

      widget.bind(SC.Widget.Events.ERROR, function () {
        console.error(`❌ Track ${index + 1} error`);
      });
    });
  }

  /**
   * Format date
   */
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  /**
   * Escape HTML
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Update meta description
   */
  function updateMetaDescription() {
    const meta = document.querySelector('meta[name="description"]');
    if (!meta || TRACKS.length === 0) return;

    const latest = TRACKS[0];
    const current = meta.getAttribute('content');
    const updated = `${current} | Neuester Track: ${latest.title}`;
    meta.setAttribute('content', updated);
  }

  /**
   * Init on page load
   */
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        initSoundCloudWidgets();
        updateMetaDescription();
      });
    } else {
      initSoundCloudWidgets();
      updateMetaDescription();
    }
  }

  init();

  // Expose for manual updates
  window.soundcloudSync = {
    updateTracks(newTracks) {
      Object.assign(TRACKS, newTracks);
      console.log('✅ Tracks updated:', TRACKS);
      const container = document.querySelector('[data-soundcloud-tracks]');
      if (container) updateTrackDisplay(container);
    },
    getTracks() {
      return TRACKS;
    }
  };
})();
