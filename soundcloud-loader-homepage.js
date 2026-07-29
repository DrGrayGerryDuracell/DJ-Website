/**
 * ═══════════════════════════════════════════════════════════════
 * SOUNDCLOUD HOMEPAGE LOADER
 * Displays genres and descriptions from tracks.json
 * Auto-syncs with SoundCloud metadata
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const TRACKS_JSON_URL = '/assets/data/tracks.json';
  const CACHE_KEY = 'drgray_tracks_cache_homepage';
  const CACHE_DURATION = 3600000; // 1 hour

  /**
   * Fetch tracks from tracks.json
   */
  async function loadTracks() {
    try {
      // Check cache first
      const cached = getCachedTracks();
      if (cached) {
        console.log('📦 Using cached homepage tracks');
        return cached.tracks;
      }

      // Fetch from tracks.json
      const response = await fetch(TRACKS_JSON_URL);
      if (!response.ok) throw new Error('Failed to load tracks.json');

      const data = await response.json();
      cacheTrackData(data);

      console.log('✨ Loaded homepage tracks:', data.tracks.length);
      return data.tracks;
    } catch (error) {
      console.error('❌ Homepage track loading error:', error);
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
   * Display featured track with full description and genres
   */
  function displayFeaturedTrack(tracks) {
    const container = document.querySelector('[data-featured-track]');
    if (!container || !tracks || tracks.length === 0) return;

    // Get the latest track
    const featured = tracks[0];
    const genresHtml = featured.genres
      .map((g) => `<span class="genre-tag-homepage">${escapeHtml(g)}</span>`)
      .join('');

    container.innerHTML = `
      <div class="featured-track-card">
        <div class="featured-header">
          <h3 class="featured-title">${escapeHtml(featured.title)}</h3>
          <p class="featured-date">🎧 Hochgeladen am ${formatDate(featured.date)}</p>
        </div>

        <div class="featured-genres">
          ${genresHtml}
        </div>

        <p class="featured-description">
          ${escapeHtml(featured.description)}
        </p>

        <div class="featured-stats">
          <div class="stat-small">
            <span>🎧 ${formatNumber(featured.plays)} plays</span>
          </div>
          <div class="stat-small">
            <span>❤️ ${featured.likes} likes</span>
          </div>
          <div class="stat-small">
            <span>💬 ${featured.comments} comments</span>
          </div>
        </div>

        <a href="${featured.url}" target="_blank" rel="noopener" class="btn btn-primary">
          Auf SoundCloud hören
        </a>
      </div>
    `;
  }

  /**
   * Display track cards grid with genres
   */
  function displayTrackCardsGrid(tracks) {
    const container = document.querySelector('[data-homepage-track-grid]');
    if (!container || !tracks) return;

    // Get top 3 newest tracks
    const topTracks = tracks.slice(0, 3);

    container.innerHTML = topTracks
      .map((track, idx) => {
        const genresHtml = track.genres
          .map((g) => `<span class="genre-tag-homepage">${escapeHtml(g)}</span>`)
          .join('');

        return `
        <article class="track-card-homepage scroll-fade-in" style="--delay: ${idx * 0.1}s;">
          <div class="track-header-homepage">
            <h4 class="track-title-homepage">${escapeHtml(track.title)}</h4>
            <span class="track-date-small">📅 ${formatDate(track.date)}</span>
          </div>

          <div class="track-genres-homepage">
            ${genresHtml}
          </div>

          <p class="track-description-homepage">
            ${escapeHtml(track.description)}
          </p>

          <div class="track-stats-row">
            <span>🎧 ${formatNumber(track.plays)}</span>
            <span>❤️ ${track.likes}</span>
            <span>💬 ${track.comments}</span>
          </div>

          <a href="${track.url}" target="_blank" rel="noopener" class="btn btn-sm btn-ghost">
            Play
          </a>
        </article>
      `;
      })
      .join('');
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

  function formatNumber(num) {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Initialize everything
   */
  async function init() {
    console.log('🎵 Starting SoundCloud Homepage Loader...');

    const tracks = await loadTracks();
    if (tracks && tracks.length > 0) {
      displayFeaturedTrack(tracks);
      displayTrackCardsGrid(tracks);
      console.log('✅ Homepage loader complete');
    } else {
      console.log('⚠️ No tracks available');
    }

    // Reload every hour
    setInterval(async () => {
      console.log('🔄 Refreshing homepage tracks...');
      localStorage.removeItem(CACHE_KEY);
      const newTracks = await loadTracks();
      if (newTracks) {
        displayFeaturedTrack(newTracks);
        displayTrackCardsGrid(newTracks);
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
  window.soundcloudLoaderHomepage = {
    loadTracks,
    reload: () => {
      localStorage.removeItem(CACHE_KEY);
      init();
    }
  };
})();
