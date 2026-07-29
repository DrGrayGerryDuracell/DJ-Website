/**
 * ═══════════════════════════════════════════════════════════════
 * ENHANCED ANIMATIONS & INTERACTIONS
 * Dr. Gray & Mrs. Dr. Gray - Interactive Experience
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /**
   * SCROLL TRIGGER ANIMATIONS
   * Adds in-view class when elements enter viewport
   */
  function initScrollTriggers() {
    const elements = document.querySelectorAll(
      '.scroll-fade-in, .scroll-slide-in-left, .scroll-slide-in-right, .scroll-scale-in'
    );

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    elements.forEach((el) => observer.observe(el));
  }

  /**
   * LIVE COUNTDOWN TIMER
   * Shows time until next TikTok live session (Friday 18:00)
   */
  function initLiveCountdown() {
    const countdownContainer = document.querySelector('.live-countdown');
    if (!countdownContainer) return;

    function updateCountdown() {
      const now = new Date();
      const nextFriday = new Date();

      // Calculate next Friday at 18:00
      const currentDay = now.getDay();
      const daysUntilFriday = currentDay === 5 ? 7 : (5 - currentDay + 7) % 7;

      nextFriday.setDate(now.getDate() + (daysUntilFriday || 7));
      nextFriday.setHours(18, 0, 0, 0);

      const timeDiff = nextFriday - now;
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      const countdownText = `🔴 LIVE in ${hours}h ${minutes}m ${seconds}s`;

      if (countdownContainer.textContent !== countdownText) {
        countdownContainer.textContent = countdownText;
      }
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  /**
   * PARALLAX EFFECT
   * Subtle parallax on hero image/video
   */
  function initParallax() {
    const heroVideoBg = document.querySelector('.hero-video-bg');
    if (!heroVideoBg) return;

    let ticking = false;

    function updateParallax() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const yPos = scrollTop * 0.5;

      heroVideoBg.style.transform = `translateY(${yPos}px)`;
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    });
  }

  /**
   * STAGGER ANIMATIONS FOR ARTICLE CARDS
   * Adds sequential delay to card animations
   */
  function initArticleStagger() {
    const articles = document.querySelectorAll('article');

    articles.forEach((article, index) => {
      article.classList.add('scroll-scale-in');
      article.style.setProperty('--anim-delay', `${index * 0.1}s`);

      // Create unique animation for each article
      const animationDelay = `${index * 100}ms`;
      article.style.animationDelay = animationDelay;
    });
  }

  /**
   * INTERACTIVE BUTTON EFFECTS
   * Adds click ripple and glow effects
   */
  function initButtonEffects() {
    const buttons = document.querySelectorAll('.btn, a.btn');

    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        // Create ripple effect
        const ripple = document.createElement('span');
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.cssText = `
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          left: ${x}px;
          top: ${y}px;
          pointer-events: none;
          animation: rippleEffect 0.6s ease-out;
        `;

        // Add animation keyframe if not exists
        if (!document.querySelector('style[data-ripple]')) {
          const style = document.createElement('style');
          style.setAttribute('data-ripple', 'true');
          style.textContent = `
            @keyframes rippleEffect {
              from {
                opacity: 1;
                transform: scale(0);
              }
              to {
                opacity: 0;
                transform: scale(1);
              }
            }
          `;
          document.head.appendChild(style);
        }

        btn.style.position = 'relative';
        btn.style.overflow = 'hidden';
        btn.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
      });
    });
  }

  /**
   * SOUNDCLOUD PLAYER LAZY LOAD
   * Loads SoundCloud embeds only when visible
   */
  function initSoundCloudLazyLoad() {
    const iframes = document.querySelectorAll('iframe[src*="soundcloud"]');

    if (!iframes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const iframe = entry.target;
            if (!iframe.src) return;

            iframe.style.opacity = '0';
            iframe.style.animation = 'fadeIn 0.8s var(--anim-ease-smooth) forwards';
            observer.unobserve(iframe);
          }
        });
      },
      { threshold: 0.1 }
    );

    iframes.forEach((iframe) => observer.observe(iframe));
  }

  /**
   * HEADER ANIMATION ON SCROLL
   * Show/hide header based on scroll direction
   */
  function initHeaderAnimation() {
    const header = document.querySelector('.main-header');
    if (!header) return;

    let lastScrollTop = 0;
    let ticking = false;

    function updateHeaderPosition() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      if (scrollTop > 200) {
        if (scrollTop > lastScrollTop) {
          header.style.transform = 'translateY(-100%)';
        } else {
          header.style.transform = 'translateY(0)';
        }
      }

      lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateHeaderPosition);
        ticking = true;
      }
    });

    header.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  }

  /**
   * LIVE STATUS INDICATOR
   * Pulsing indicator for live streams
   */
  function initLiveIndicator() {
    const liveDot = document.querySelector('.live-dot');
    if (!liveDot) return;

    liveDot.style.animation = 'livePulse 1.5s ease-in-out infinite';

    if (!document.querySelector('style[data-live]')) {
      const style = document.createElement('style');
      style.setAttribute('data-live', 'true');
      style.textContent = `
        @keyframes livePulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(0.8);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * MERCH CAROUSEL SMOOTH SCROLL
   * Enable smooth scrolling for merch items on mobile
   */
  function initMerchScroll() {
    const merchGrid = document.querySelector('.merch-grid');
    if (!merchGrid) return;

    const items = merchGrid.querySelectorAll('.merch-item, article');
    items.forEach((item) => {
      item.style.cursor = 'pointer';
      item.addEventListener('click', () => {
        item.style.animation = 'pulse 0.3s ease';
      });
    });
  }

  /**
   * ACCESSIBILITY: FOCUS VISIBLE ANIMATIONS
   */
  function initAccessibility() {
    const focusElements = document.querySelectorAll('a, button, [role="button"]');

    focusElements.forEach((el) => {
      el.addEventListener('focus', () => {
        el.style.boxShadow = '0 0 0 3px rgba(255, 0, 255, 0.3)';
      });

      el.addEventListener('blur', () => {
        el.style.boxShadow = 'none';
      });
    });
  }

  /**
   * PERFORMANCE: DEBOUNCE FUNCTION
   */
  function debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /**
   * INITIALIZATION
   * Run all animation setups when DOM is ready
   */
  function init() {
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAll);
    } else {
      initAll();
    }
  }

  function initAll() {
    initScrollTriggers();
    initLiveCountdown();
    initParallax();
    initArticleStagger();
    initButtonEffects();
    initSoundCloudLazyLoad();
    initHeaderAnimation();
    initLiveIndicator();
    initMerchScroll();
    initAccessibility();

    console.log('✨ Dr. Gray & Mrs. Dr. Gray - Animations initialized');
  }

  init();
})();
