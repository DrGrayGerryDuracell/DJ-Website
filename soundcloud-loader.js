/**
 * ═══════════════════════════════════════════════════════════════
 * SOUNDCLOUD AUTO-LOADER
 * Loads latest tracks from tracks.json
 * Updates all pages automatically
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const TRACKS_JSON_URL = '/assets/data/tracks.json';
  const CACHE_KEY = 'drgray_tracks_cache';
  const CACHE_DURATION = 3600000; // 1 hour

  /**
   * Fetch tracks from tracks.json
   */
  async function loadTracks() {
    try {
      // Check cache first
      const cached = getCachedTracks();
      if (cached) {
        console.log('📦 Using cached tracks data');
        return cached.tracks;
      }

      // Fetch from tracks.json
      const response = await fetch(TRACKS_JSON_URL);
      if (!response.ok) throw new Error('Failed to load tracks.json');

      const data = await response.json();

      // Cache the data
      cacheTrackData(data);

      console.log('✨ Loaded latest tracks:', data.tracks.length);
      return data.tracks;
    } catch (error) {
      console.error('❌ Track loading error:', error);
      return null;
    }
  }

  /**
   * Cache management
   */
  function getCachedTracks() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  }

  function cacheTrackData(data) {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  }

  /**
   * Display tracks on musik.html
   */
  function displayTracks(tracks) {
    const container = document.querySelector('[data-soundcloud-tracks]');
    if (!container || !tracks) return;

    // Get top 3 tracks
    const topTracks = tracks.slice(0, 3);

    container.innerHTML = topTracks
      .map(
        (track) => `
      <article class="track-card scroll-fade-in">
        <h3 class="card-title">${escapeHtml(track.title)}</h3>
        <p class="card-copy">
          📅 ${formatDate(track.date)} |
          🎧 ${formatPlays(track.plays)} plays<br>
          <em>${escapeHtml(track.description)}</em>
        </p>
        <div class="pill-row">
          ${track.genres
            .map((g) => `<span class="pill">${escapeHtml(g)}</span>`)
            .join('')}
        </div>
        <a href="${track.url}" target="_blank" rel="noopener" class="btn btn-secondary">
          Auf SoundCloud hören
        </a>
      </article>
    `
      )
      .join('');
  }

  /**
   * Update meta descriptions with latest track
   */
  function updateMetaDescriptions(tracks) {
    if (!tracks || tracks.length === 0) return;

    const latest = tracks[0];
    const metas = document.querySelectorAll('meta[name="description"]');

    metas.forEach((meta) => {
      const current = meta.getAttribute('content');
      const updated = `${current.split('|')[0].trim()} | Neuester: ${latest.title}`;
      meta.setAttribute('content', updated);
    });
  }

  /**
   * Update page title with track count
   */
  function updatePageInfo(tracks) {
    const heading = document.querySelector('[data-soundcloud-feed] .section-title');
    if (heading) {
      heading.innerHTML = `Zuletzt hochgeladen auf <span>SoundCloud</span> (${tracks.length} neue Tracks)`;
    }
  }

  /**
   * Format helpers
   */
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  function formatPlays(plays) {
    if (plays >= 1000) {
      return (plays / 1000).toFixed(1) + 'K';
    }
    return plays;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Load and display tracks
   */
  async function init() {
    console.log('🎵 Starting SoundCloud loader...');

    const tracks = await loadTracks();
    if (tracks && tracks.length > 0) {
      displayTracks(tracks);
      updateMetaDescriptions(tracks);
      updatePageInfo(tracks);
      console.log('✅ SoundCloud loader complete');
    } else {
      console.log('⚠️ No tracks available');
    }

    // Reload every hour
    setInterval(async () => {
      console.log('🔄 Refreshing track data...');
      localStorage.removeItem(CACHE_KEY); // Clear cache
      const newTracks = await loadTracks();
      if (newTracks) {
        displayTracks(newTracks);
        updateMetaDescriptions(newTracks);
      }
    }, CACHE_DURATION);
  }

  // Start on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose API
  window.soundcloudLoader = {
    loadTracks,
    reload: () => {
      localStorage.removeItem(CACHE_KEY);
      init();
    }
  };
})();
