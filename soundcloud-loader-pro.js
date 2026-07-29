/**
 * ═══════════════════════════════════════════════════════════════
 * SOUNDCLOUD PRO LOADER
 * Displays embedded players, covers, likes, comments
 * Full featured track management
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const TRACKS_JSON_URL = '/assets/data/tracks.json';
  const CACHE_KEY = 'drgray_tracks_cache_pro';
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
   * Display full track cards with players
   */
  function displayTrackCards(tracks) {
    const container = document.querySelector('[data-soundcloud-track-cards]');
    if (!container || !tracks) return;

    // Get newest tracks
    const newTracks = tracks.filter((t) => t.isNew).slice(0, 4);

    container.innerHTML = newTracks
      .map((track, idx) => `
      <article class="track-card-pro scroll-fade-in" style="--delay: ${idx * 0.1}s;">
        <!-- Cover & Badge -->
        <div class="track-cover-wrapper">
          <img src="${track.cover}" alt="${escapeHtml(track.title)}" class="track-cover">
          ${track.isNew ? '<span class="badge-new">🆕 NEW</span>' : ''}
        </div>

        <!-- Player -->
        <div class="track-player">
          <iframe
            width="100%"
            height="166"
            scrolling="no"
            frameborder="no"
            allow="autoplay"
            src="${track.embedUrl}">
          </iframe>
        </div>

        <!-- Info -->
        <div class="track-info">
          <h3 class="track-title">${escapeHtml(track.title)}</h3>
          <p class="track-desc">${escapeHtml(track.description)}</p>

          <!-- Genres -->
          <div class="track-genres">
            ${track.genres
              .map((g) => `<span class="genre-tag">${escapeHtml(g)}</span>`)
              .join('')}
          </div>

          <!-- Stats -->
          <div class="track-stats">
            <div class="stat">
              <span class="stat-icon">🎧</span>
              <span class="stat-value">${formatNumber(track.plays)}</span>
              <span class="stat-label">Plays</span>
            </div>
            <div class="stat">
              <span class="stat-icon">❤️</span>
              <span class="stat-value">${track.likes}</span>
              <span class="stat-label">Likes</span>
            </div>
            <div class="stat">
              <span class="stat-icon">💬</span>
              <span class="stat-value">${track.comments}</span>
              <span class="stat-label">Comments</span>
            </div>
            <div class="stat">
              <span class="stat-icon">⏱️</span>
              <span class="stat-value">${track.duration}</span>
              <span class="stat-label">Duration</span>
            </div>
          </div>

          <!-- Meta -->
          <div class="track-meta">
            <small>📅 ${formatDate(track.date)}</small>
            <small>🔗 ${track.type === 'couple_set' ? '👥 Couple Set' : track.type === 'drgray_set' ? '🎧 Dr. Gray' : '👩‍🎤 Mrs. Dr. Gray'}</small>
          </div>

          <!-- CTA -->
          <a href="${track.url}" target="_blank" rel="noopener" class="btn btn-primary">
            Auf SoundCloud ansehen
          </a>
        </div>
      </article>
    `)
      .join('');

    // Load SoundCloud embed script
    loadSoundCloudScript();
  }

  /**
   * Display top tracks list
   */
  function displayTopTracks(tracks) {
    const container = document.querySelector('[data-soundcloud-top-tracks]');
    if (!container || !tracks) return;

    const topTracks = tracks.slice(0, 10);

    container.innerHTML = topTracks
      .map(
        (track) => `
      <div class="top-track-item">
        <img src="${track.cover}" alt="${escapeHtml(track.title)}" class="top-track-cover">
        <div class="top-track-details">
          <h4>${escapeHtml(track.title)}</h4>
          <div class="top-track-stats">
            <span>🎧 ${formatNumber(track.plays)}</span>
            <span>❤️ ${track.likes}</span>
            <span>💬 ${track.comments}</span>
          </div>
        </div>
        <a href="${track.url}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary">
          Play
        </a>
      </div>
    `
      )
      .join('');
  }

  /**
   * Load SoundCloud embed script
   */
  function loadSoundCloudScript() {
    if (window.SC && window.SC.Widget) {
      console.log('✅ SoundCloud script already loaded');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://w.soundcloud.com/player/api.js';
    script.async = true;
    script.onload = function () {
      console.log('✅ SoundCloud API loaded');
      if (window.SC && window.SC.Widget) {
        // Process iframes
        const iframes = document.querySelectorAll('.track-player iframe');
        console.log(`🎵 Processing ${iframes.length} embedded players`);
      }
    };
    document.body.appendChild(script);
  }

  /**
   * Update meta descriptions
   */
  function updateMetaDescriptions(tracks) {
    if (!tracks || tracks.length === 0) return;

    const latest = tracks[0];
    const metas = document.querySelectorAll('meta[name="description"]');

    metas.forEach((meta) => {
      const current = meta.getAttribute('content');
      const baseDesc = current.split('|')[0].trim();
      const updated = `${baseDesc} | Neuester: ${latest.title} (${formatNumber(latest.plays)} plays)`;
      meta.setAttribute('content', updated);
    });
  }

  /**
   * Update page heading
   */
  function updatePageHeading(tracks) {
    const heading = document.querySelector('[data-soundcloud-feed] .section-title');
    if (heading) {
      const newCount = tracks.filter((t) => t.isNew).length;
      heading.innerHTML = `Zuletzt hochgeladen auf <span>SoundCloud</span>`;

      const subText = document.querySelector('[data-soundcloud-feed] .lead');
      if (subText) {
        subText.innerHTML = `
          🔄 <strong>Live synchronized:</strong> ${tracks.length} Tracks | ${newCount} neu hinzugefügt<br>
          Die eingebetteten Player laden automatisch - kein Extra-Click nötig!
        `;
      }
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
    console.log('🎵 Starting SoundCloud Pro Loader...');

    const tracks = await loadTracks();
    if (tracks && tracks.length > 0) {
      displayTrackCards(tracks);
      displayTopTracks(tracks);
      updateMetaDescriptions(tracks);
      updatePageHeading(tracks);
      console.log('✅ SoundCloud Pro Loader complete');
    } else {
      console.log('⚠️ No tracks available');
    }

    // Reload every hour
    setInterval(async () => {
      console.log('🔄 Refreshing track data...');
      localStorage.removeItem(CACHE_KEY);
      const newTracks = await loadTracks();
      if (newTracks) {
        displayTrackCards(newTracks);
        displayTopTracks(newTracks);
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
  window.soundcloudLoaderPro = {
    loadTracks,
    reload: () => {
      localStorage.removeItem(CACHE_KEY);
      init();
    }
  };
})();
