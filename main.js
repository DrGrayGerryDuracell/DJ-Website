/**
 * Dr. Gray & Mrs. Dr. Gray - Optimized Main JavaScript
 * Features: Intersection Observer for lazy loading, scroll header hide/show
 */

(function() {
  'use strict';

  // ========== Header Hide/Show on Scroll ==========
  const header = document.querySelector('.main-header');
  let lastScrollTop = 0;
  let ticking = false;

  function updateHeader() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > lastScrollTop && scrollTop > 100) {
      header.classList.add('hide');
    } else {
      header.classList.remove('hide');
    }
    
    lastScrollTop = scrollTop;
    ticking = false;
  }

  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }, { passive: true });

  // ========== Dynamic Header/Banner Height ==========
  function setDynamicHeights() {
    const headerEl = document.querySelector('.main-header');
    const bannerEl = document.querySelector('.live-banner');
    
    if (headerEl) {
      document.documentElement.style.setProperty('--h-head', headerEl.offsetHeight + 'px');
    }
    if (bannerEl) {
      document.documentElement.style.setProperty('--h-banner', bannerEl.offsetHeight + 'px');
    }
  }

  window.addEventListener('load', setDynamicHeights);
  window.addEventListener('resize', setDynamicHeights);

  // ========== Intersection Observer for Lazy SoundCloud Embeds ==========
  const soundcloudObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const container = entry.target;
        const trackId = container.dataset.track;
        
        if (trackId && !container.querySelector('iframe')) {
          const iframe = document.createElement('iframe');
          iframe.className = 'soundcloud-lazy';
          iframe.src = `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&color=%23ffd700&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true`;
          iframe.setAttribute('loading', 'lazy');
          iframe.setAttribute('title', 'SoundCloud Player');
          iframe.setAttribute('allow', 'autoplay');
          
          // Replace skeleton with iframe
          container.innerHTML = '';
          container.appendChild(iframe);
        }
        
        soundcloudObserver.unobserve(container);
      }
    });
  }, {
    rootMargin: '100px 0px',
    threshold: 0.01
  });

  // Observe all SoundCloud containers
  document.querySelectorAll('[data-track]').forEach(el => {
    soundcloudObserver.observe(el);
  });

  // ========== Fade-in animations on scroll ==========
  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  // Add fade-in class to sections and observe
  document.querySelectorAll('section, .bio-container, .soundcloud-item').forEach(el => {
    el.classList.add('fade-in');
    fadeObserver.observe(el);
  });

  // ========== Image lazy loading enhancement ==========
  const imgObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        imgObserver.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px 0px'
  });

  document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    imgObserver.observe(img);
  });

})();
