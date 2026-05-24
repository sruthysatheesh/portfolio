/* =========================================================
   MAIN.JS — Interactions: cursor, magnetic, reveal,
             text scramble, reel word cycle, scroll nav
   ========================================================= */
'use strict';

/* ── Cursor ── */
const cursorRing = document.getElementById('cursorRing');
const cursorDot  = document.getElementById('cursorDot');
let mx = 0, my = 0;
let rx = 0, ry = 0; /* ring smoothed position */
const RING_LERP = 0.10;

function lerp(a, b, t) { return a + (b - a) * t; }

document.addEventListener('mousemove', (e) => {
  mx = e.clientX;
  my = e.clientY;
  cursorDot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
});

document.addEventListener('mousedown', () => document.body.classList.add('cursor-click'));
document.addEventListener('mouseup',   () => document.body.classList.remove('cursor-click'));

function animateCursor() {
  rx = lerp(rx, mx, RING_LERP);
  ry = lerp(ry, my, RING_LERP);
  cursorRing.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
  requestAnimationFrame(animateCursor);
}
animateCursor();

/* Hover state for interactive elements */
document.querySelectorAll('a, button, .magnetic, .pill, .project-item').forEach(el => {
  el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
});

/* ── Nav scroll effect ── */
const nav = document.getElementById('nav');
function onScroll() {
  if (window.scrollY > 60) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
}
window.addEventListener('scroll', onScroll, { passive: true });

/* ── Reveal on scroll (IntersectionObserver) ── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      /* Stagger children */
      const delay = parseFloat(e.target.dataset.delay || 0);
      setTimeout(() => {
        e.target.classList.add('visible');
      }, delay);
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.reveal').forEach((el, i) => {
  /* Stagger siblings within same parent */
  const siblings = Array.from(el.parentElement.querySelectorAll('.reveal'));
  const idx = siblings.indexOf(el);
  el.dataset.delay = idx * 90;
  revealObserver.observe(el);
});

/* ── Magnetic buttons ── */
const MAGNETIC_STRENGTH = 0.32;
document.querySelectorAll('.magnetic').forEach(el => {
  let animId;
  let elX = 0, elY = 0;

  el.addEventListener('mousemove', (e) => {
    cancelAnimationFrame(animId);
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const targetX = dx * MAGNETIC_STRENGTH;
    const targetY = dy * MAGNETIC_STRENGTH;

    function step() {
      elX = lerp(elX, targetX, 0.15);
      elY = lerp(elY, targetY, 0.15);
      el.style.transform = `translate(${elX.toFixed(2)}px, ${elY.toFixed(2)}px)`;
      animId = requestAnimationFrame(step);
    }
    step();
  });

  el.addEventListener('mouseleave', () => {
    cancelAnimationFrame(animId);
    function release() {
      elX = lerp(elX, 0, 0.12);
      elY = lerp(elY, 0, 0.12);
      el.style.transform = `translate(${elX.toFixed(2)}px, ${elY.toFixed(2)}px)`;
      if (Math.abs(elX) > 0.05 || Math.abs(elY) > 0.05) {
        animId = requestAnimationFrame(release);
      } else {
        el.style.transform = '';
      }
    }
    animId = requestAnimationFrame(release);
  });
});

/* ── Text scramble on project titles ── */
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&';

function scramble(el, originalText, duration = 600) {
  let start = null;
  const chars = originalText.split('');

  function step(ts) {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    const resolved = Math.floor(progress * chars.length);

    el.textContent = chars.map((c, i) => {
      if (c === ' ' || c === '\n') return c;
      if (i < resolved) return c;
      return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    }).join('');

    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = originalText;
  }
  requestAnimationFrame(step);
}

document.querySelectorAll('.project-title').forEach(el => {
  /* Grab only text content (no inner HTML changes) */
  const originalHTML = el.innerHTML;
  el.closest('.project-item').addEventListener('mouseenter', () => {
    /* Scramble first text node only */
    const textNodes = Array.from(el.childNodes).filter(n => n.nodeType === 3);
    textNodes.forEach(node => {
      const orig = node.textContent;
      let start = null;
      const chars = orig.split('');
      function step(ts) {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 550, 1);
        const resolved = Math.floor(p * chars.length);
        node.textContent = chars.map((c, i) => {
          if (c === ' ' || c === '\n') return c;
          if (i < resolved) return c;
          return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }).join('');
        if (p < 1) requestAnimationFrame(step);
        else node.textContent = orig;
      }
      requestAnimationFrame(step);
    });
  });
});

/* ── Reel word cycling ── */
const words = document.querySelectorAll('.reel-word');
let current = 0;

function cycleWords() {
  const prev = current;
  current = (current + 1) % words.length;
  words[prev].classList.remove('active');
  words[prev].classList.add('out');
  setTimeout(() => words[prev].classList.remove('out'), 700);
  words[current].classList.add('active');
}

setInterval(cycleWords, 2200);

/* ── Smooth scroll for all anchor links ── */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ── Project item: animated accent line on hover ── */
document.querySelectorAll('.project-item').forEach((item, i) => {
  item.style.transitionDelay = `${i * 0.04}s`;
});

/* ── Counter animation for reel stats ── */
function animateCounter(el, target, suffix = '', duration = 1200) {
  const isFloat = !Number.isInteger(target);
  let start = null;
  function step(ts) {
    if (!start) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3); /* ease-out cubic */
    const val = eased * target;
    el.textContent = isFloat ? val.toFixed(2) : Math.floor(val) + suffix;
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = isFloat ? target.toFixed(2) : target + suffix;
  }
  requestAnimationFrame(step);
}

/* Trigger counters when reel section enters view */
const reelSection = document.getElementById('reel');
const statVals = document.querySelectorAll('.stat-val');
const statsData = [8.75, 8, 2, 4];
const statSuffix = ['', '+', '', ''];
let statsAnimated = false;

const reelObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && !statsAnimated) {
    statsAnimated = true;
    statVals.forEach((el, i) => {
      animateCounter(el, statsData[i], statSuffix[i]);
    });
  }
}, { threshold: 0.3 });

if (reelSection) reelObserver.observe(reelSection);

/* ── Horizontal scroll hint on project items ── */
document.querySelectorAll('.project-item').forEach(item => {
  item.addEventListener('mouseenter', () => {
    item.style.paddingLeft = '1rem';
    item.style.transition = 'padding-left 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
  });
  item.addEventListener('mouseleave', () => {
    item.style.paddingLeft = '0';
  });
});
