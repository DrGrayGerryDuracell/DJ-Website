/**
 * ═══════════════════════════════════════════════════════════════
 * SOUNDCLOUD SYNC SYSTEM
 * Auto-fetches latest tracks from SoundCloud API
 * Updates website with newest sets & metadata
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const SOUNDCLOUD_USERNAME = 'drgray_sic';
  const SOUNDCLOUD_CLIENT_ID = 'YOUR_CLIENT_ID'; // Set in env
  const CACHE_DURATION = 3600000; // 1 hour
  const STORAGE_KEY = 'drgray_soundcloud_cache';

  /**
   * Fetch latest tracks from SoundCloud
   */
  async function fetchSoundCloudTracks() {
    try {
      // Check cache first
      const cached = getCachedData();
      if (cached) {
        console.log('📦 Using cached SoundCloud data');
        return cached;
      }

      // Fetch from SoundCloud API
      const response = await fetch(
        `https://api-v2.soundcloud.com/users/lookup?handle=${SOUNDCLOUD_USERNAME}&client_id=${SOUNDCLOUD_CLIENT_ID}`
      );

      if (!response.ok) throw new Error('SoundCloud API error');

      const user = await response.json();
      const tracksResponse = await fetch(
        `https://api-v2.soundcloud.com/users/${user.id}/tracks?limit=10&client_id=${SOUNDCLOUD_CLIENT_ID}`
      );

      const tracks = await tracksResponse.json();

      // Cache the data
      setCachedData(tracks);

      console.log('✨ Fetched latest SoundCloud tracks:', tracks.length);
      return tracks;
    } catch (error) {
      console.error('❌ SoundCloud fetch error:', error);
      return null;
    }
  }

  /**
   * Cache management
   */
  function getCachedData() {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return data;
  }

  function setCachedData(data) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  }

  /**
   * Update HTML elements with track data
   */
  function updateTrackElements(tracks) {
    if (!tracks || !tracks.length) return;

    const container = document.querySelector('[data-soundcloud-tracks]');
    if (!container) return;

    // Get top 3 tracks
    const topTracks = tracks.slice(0, 3);

    topTracks.forEach((track, index) => {
      const element = container.querySelector(
        `[data-track-slot="${index}"]`
      );
      if (!element) return;

      element.innerHTML = `
        <article class="track-card scroll-fade-in">
          <h3 class="card-title">${escapeHtml(track.title)}</h3>
          <p class="card-copy">${getTrackDescription(track)}</p>
          <a href="${track.permalink_url}" target="_blank" rel="noopener" class="btn btn-secondary">
            SoundCloud hören
          </a>
        </article>
      `;
    });
  }

  /**
   * Generate track description
   */
  function getTrackDescription(track) {
    const date = new Date(track.created_at);
    const duration = Math.floor(track.duration / 1000 / 60);
    const plays = track.playback_count || 0;

    return `
      Hochgeladen: ${formatDate(date)} |
      ${duration}min |
      ${plays} Plays
    `;
  }

  /**
   * Helper: Format date
   */
  function formatDate(date) {
    return new Intl.DateTimeFormat('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  /**
   * Helper: Escape HTML
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Sync all data across pages
   */
  async function syncAllData() {
    console.log('🔄 Starting SoundCloud sync...');

    const tracks = await fetchSoundCloudTracks();
    if (tracks) {
      updateTrackElements(tracks);
      updatePageMetadata(tracks);
      updateBioSection(tracks);
    }

    console.log('✅ SoundCloud sync complete');
  }

  /**
   * Update meta descriptions with latest track
   */
  function updatePageMetadata(tracks) {
    if (!tracks || !tracks.length) return;

    const latestTrack = tracks[0];
    const metaDescription = document.querySelector(
      'meta[name="description"]'
    );

    if (metaDescription) {
      const currentDesc = metaDescription.getAttribute('content');
      const newDesc = `${currentDesc} Neuester Track: ${latestTrack.title}`;
      metaDescription.setAttribute('content', newDesc);
    }
  }

  /**
   * Update bio section with latest activity
   */
  function updateBioSection(tracks) {
    const bioSection = document.querySelector('[data-bio-section]');
    if (!bioSection || !tracks || !tracks.length) return;

    const latestTrack = tracks[0];
    const html = `
      <div class="bio-update scroll-fade-in">
        <p class="lead">
          🎵 <strong>Neuester Release:</strong> "${latestTrack.title}" auf SoundCloud.
          Wir teilen regelmäßig unsere neuesten Sets und Soundscapes - dein Zugang zu unserer
          aktuellen Soundwelt.
        </p>
      </div>
    `;

    const existing = bioSection.querySelector('.bio-update');
    if (existing) {
      existing.replaceWith(html);
    } else {
      bioSection.insertAdjacentHTML('afterbegin', html);
    }
  }

  /**
   * Auto-sync on page load & periodic updates
   */
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', syncAllData);
    } else {
      syncAllData();
    }

    // Sync every hour
    setInterval(syncAllData, CACHE_DURATION);
  }

  init();
  window.soundcloudSync = { syncAllData, fetchSoundCloudTracks };
})();
