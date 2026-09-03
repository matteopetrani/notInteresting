// notInteresting - one-click "Not interested" on LinkedIn and X feed posts.
// Drives each site's own control menu, so the action is byte-for-byte the native one
// (same optimistic UI, same undo) instead of a guessed API call.
// Both sites' CSS classes are build-hashed, so every hook here is semantic:
// aria-label, data-testid, role, svg id. Those survive redesigns; class names don't.

const SVG_NS = 'http://www.w3.org/2000/svg';
// Material thumb_down, Apache-2.0, on a 24 grid - LinkedIn's own icon for this action.
const THUMBS_DOWN = [
  ['path', { d: 'M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z' }],
];
// Frowning face, to match X's own icon for this action.
const stroke = { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round' };
const FROWN = [
  ['circle', { cx: 12, cy: 12, r: 9.6, ...stroke }],
  ['circle', { cx: 8.8, cy: 9.6, r: 1.3, fill: 'currentColor' }],
  ['circle', { cx: 15.2, cy: 9.6, r: 1.3, fill: 'currentColor' }],
  ['path', { d: 'M8.1 16.6c.9-1.4 2.3-2.2 3.9-2.2s3 .8 3.9 2.2', ...stroke }],
];

// Per site: which button opens the post menu, where ours goes beside it, which icon.
const SITES = {
  linkedin: {
    find: 'button:has(svg[id*="overflow"]), button[aria-label*="control menu" i], button[aria-label*="menu di controllo" i]',
    place: (trigger, btn) => trigger.after(btn), // between the ... and the X
    icon: THUMBS_DOWN,
    cls: 'ni-li',
  },
  x: {
    // article scopes it to posts: the sidebar trends carry the same testid.
    find: 'article button[data-testid="caret"]',
    place: (trigger, btn) => group(trigger).before(btn), // between Grok and the ...
    icon: FROWN,
    cls: 'ni-x',
  },
};

function resolveSite(host = location.hostname) {
  if (SITES[host]) return SITES[host];
  if (host.endsWith('linkedin.com')) return SITES.linkedin;
  if (host.endsWith('x.com') || host.endsWith('twitter.com')) return SITES.x;
  return null;
}
let site = resolveSite();

// ponytail: the row matcher needs no per-site config - LinkedIn's icon carries an
// svg id, X's doesn't, so X just falls through to the text match.
const NOT_INTERESTED = ['not interested', 'non mi interessa']; // add locales as they show up
const LABEL = 'Not interested';

// The button each site paints its icon into is wrapped in a chain of only-child
// divs; the whole chain is the thing to insert next to.
function group(el) {
  while (el.parentElement && el.parentElement.children.length === 1) el = el.parentElement;
  return el;
}

// Built with DOM calls, never innerHTML: LinkedIn enforces Trusted Types, which makes
// an innerHTML assignment silently do nothing (a button with no icon in it).
function makeIcon(trigger) {
  const proto = trigger.querySelector('svg');
  // Wear their icon's own attributes (size, fill, hashed classes) - dark mode included.
  const icon = proto ? proto.cloneNode(false) : document.createElementNS(SVG_NS, 'svg');
  icon.removeAttribute('id');
  icon.setAttribute('viewBox', '0 0 24 24'); // ours is drawn on a 24 grid
  icon.setAttribute('aria-hidden', 'true');
  if (!proto) {
    icon.setAttribute('width', '16');
    icon.setAttribute('height', '16');
    icon.setAttribute('fill', 'currentColor');
  }
  // Match whatever size their icon actually renders at, rather than hardcoding it.
  const size = proto && getComputedStyle(proto).width;
  if (parseFloat(size) > 0) icon.style.width = icon.style.height = size;
  for (const [tag, attrs] of site.icon) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    icon.append(el);
  }
  return icon;
}

// Hide the synthetic menu open. Counted, so overlapping clicks can't unhide early.
let busy = 0;
function setBusy(n) {
  busy += n;
  document.documentElement.classList.toggle('ni-busy', busy > 0);
}

function waitFor(fn, timeout = 1500, step = 50) {
  const start = Date.now();
  return new Promise((resolve) => {
    (function poll() {
      const v = fn();
      if (v || Date.now() - start > timeout) return resolve(v || null);
      setTimeout(poll, step);
    })();
  });
}

function findNotInterested() {
  // The menu is portalled out of the post, so search every open one. Visible only:
  // a leftover hidden menu would belong to a different post.
  const menus = [...document.querySelectorAll('[role="menu"]')].filter((m) => m.checkVisibility());
  const rows = menus.flatMap((m) => [...m.querySelectorAll('[role="menuitem"]')]);
  // Locale-proof where it can be: LinkedIn's is the only thumbs-down in that menu
  // (AI slop uses a caution signal, the feed's thumbs-UP Like button is outside it).
  return (
    rows.find((r) => r.querySelector('svg[id*="thumbs-down"]')) ||
    rows.find((r) => NOT_INTERESTED.some((s) => r.textContent.trim().toLowerCase().includes(s))) ||
    null
  );
}

async function notInterested(trigger, btn) {
  if (btn) {
    btn.disabled = true;
    btn.classList.add('ni-loading');
  }
  setBusy(1);
  let item = null;
  try {
    trigger.click();
    item = await waitFor(findNotInterested);
    if (item) item.click();
    // Nothing to click on your own posts, and X only offers this in the timeline.
    // Leave that menu open and visible: the user can finish the job by hand.
    else console.warn('[notInteresting] no "Not interested" row here - leaving the menu open', trigger);
  } finally {
    setTimeout(() => {
      setBusy(-1);
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('ni-loading');
      }
    }, item ? 300 : 0); // let the site finish closing the menu
  }
}

function makeButton(trigger) {
  const btn = document.createElement('button');
  btn.type = 'button';
  // Wear the ... button's own (hashed) classes: identical size, shape and hover for
  // free, and it keeps matching whatever the site restyles next.
  btn.className = `${trigger.className} ni-btn`;
  btn.setAttribute('aria-label', LABEL);
  btn.title = LABEL;
  btn.append(makeIcon(trigger));
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (btn.classList.contains('ni-loading')) return;
    notInterested(trigger, btn);
  });
  return btn;
}

const placed = new WeakMap(); // trigger -> our button
function inject() {
  if (!site) return;
  document.documentElement.classList.add(site.cls); // lets content.css tell the sites apart
  for (const trigger of document.querySelectorAll(site.find)) {
    // Re-place it if a re-render dropped ours, rather than trusting a flag.
    if (placed.get(trigger)?.isConnected) continue;
    const btn = makeButton(trigger);
    placed.set(trigger, btn);
    site.place(trigger, btn);
  }
}

// Leading + trailing throttle: runs at most every 250ms during continuous scroll,
// preventing debounce starvation while ensuring new feed items get their buttons.
let scheduled = null;
let lastRun = 0;
const THROTTLE_MS = 250;

function scheduleInject() {
  const now = Date.now();
  const remaining = THROTTLE_MS - (now - lastRun);
  if (remaining <= 0) {
    if (scheduled) {
      clearTimeout(scheduled);
      scheduled = null;
    }
    lastRun = now;
    inject();
  } else if (!scheduled) {
    scheduled = setTimeout(() => {
      scheduled = null;
      lastRun = Date.now();
      inject();
    }, remaining);
  }
}

new MutationObserver(scheduleInject).observe(document.body, { childList: true, subtree: true });
inject();

// ponytail: test seam for selftest.html, invisible to the page (isolated world).
window.notInteresting = { inject, use: (host) => (site = resolveSite(host)) };
