/**
 * In-page measurement functions.
 *
 * Each exported function is serialised by Playwright and executed in the page, so
 * it must be fully self-contained (no imports, no closure over module scope).
 *
 * DEV-ONLY: nothing here ships.
 */

/** Installed once per context as an init script: gives CDP calls a selector builder. */
export function installDescribe() {
  const hashed = /^_?[0-9a-z]{5,}(-\d+)+$|^css-|^sc-/i;
  window.__pvsDescribe = (el) => {
    const parts = [];
    let node = el;
    let depth = 0;
    while (node && node.nodeType === 1 && node !== document.body && depth < 5) {
      let part = node.tagName.toLowerCase();
      if (node.id && !node.id.includes('«') && !node.id.startsWith(':r')) {
        parts.unshift(`${part}#${CSS.escape(node.id)}`);
        break;
      }
      const testid = node.getAttribute('data-testid');
      const component = node.getAttribute('data-dt-component');
      if (testid) part += `[data-testid="${testid}"]`;
      else if (component) part += `[data-dt-component="${component}"]`;
      else {
        const classes = [...node.classList].filter((c) => !hashed.test(c)).slice(0, 2);
        if (classes.length > 0) part += `.${classes.map((c) => CSS.escape(c)).join('.')}`;
      }
      const parent = node.parentElement;
      if (parent) {
        const same = [...parent.children].filter((c) => c.tagName === node.tagName);
        if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = node.parentElement;
      depth += 1;
    }
    const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 50);
    return { selector: parts.join(' > '), text };
  };
}

/** Everything that can be measured from the DOM alone, in one pass. */
export function domChecks() {
  const describe = (el) => window.__pvsDescribe(el);
  const vw = document.documentElement.clientWidth;
  const all = [...document.querySelectorAll('*')];

  const isHidden = (el) => {
    if (el.closest('[aria-hidden="true"], [inert]')) return true;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return true;
    return false;
  };
  const rectOf = (el) => el.getBoundingClientRect();
  const visible = (el) => {
    const r = rectOf(el);
    return r.width > 0 && r.height > 0 && !isHidden(el);
  };

  // ---- scrollers: the app scrolls inside PageLayout.Content, not the document.
  const scrollables = all.filter((el) => {
    const cs = getComputedStyle(el);
    return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 4 && el.clientHeight > 200;
  });
  const wide = scrollables.filter((el) => el.clientWidth > 300);
  wide.sort((a, b) => b.scrollHeight - a.scrollHeight);
  const scroller = wide[0] ?? null;

  // ---- horizontal overflow
  const clippedBetween = (el, root) => {
    let node = el.parentElement;
    while (node && node !== root) {
      const cs = getComputedStyle(node);
      if (cs.overflowX !== 'visible') return true;
      node = node.parentElement;
    }
    return false;
  };
  const offenders = (root, limit) => {
    const found = [];
    for (const el of all) {
      if (el === root || !root.contains(el)) continue;
      const r = rectOf(el);
      if (r.width === 0 || r.height === 0) continue;
      const excess = Math.max(r.right - limit, 0 - r.left > 1 && root === document.documentElement ? -r.left : 0);
      if (excess > 1 && !clippedBetween(el, root) && !isHidden(el)) {
        found.push({ ...describe(el), excess: Math.round(excess), width: Math.round(r.width) });
      }
    }
    return found.sort((a, b) => b.excess - a.excess).slice(0, 8);
  };

  const docOverflow = document.documentElement.scrollWidth > vw + 1;
  const scrollerOverflow = scroller !== null && scroller.scrollWidth > scroller.clientWidth + 1;
  const innerScrollers = all
    .filter((el) => {
      if (el === scroller || el === document.documentElement || el === document.body) return false;
      const cs = getComputedStyle(el);
      return (cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0;
    })
    .slice(0, 6)
    .map((el) => ({ ...describe(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));

  const overflow = {
    viewportWidth: vw,
    document: { overflowing: docOverflow, scrollWidth: document.documentElement.scrollWidth, clientWidth: vw },
    scroller:
      scroller === null
        ? null
        : { ...describe(scroller), overflowing: scrollerOverflow, scrollWidth: scroller.scrollWidth, clientWidth: scroller.clientWidth, scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight },
    offenders: docOverflow ? offenders(document.documentElement, vw) : scrollerOverflow ? offenders(scroller, scroller.getBoundingClientRect().right) : [],
    innerScrollers,
  };

  // ---- interactive controls that cannot be reached because they sit outside the viewport
  const interactiveSel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=switch], [role=tab], [role=menuitem], [role=combobox]';
  const hasScrollAncestor = (el) => {
    let node = el.parentElement;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && node.scrollWidth > node.clientWidth + 1) return true;
      node = node.parentElement;
    }
    return false;
  };
  const offscreenControls = [];
  for (const el of document.querySelectorAll(interactiveSel)) {
    const r = rectOf(el);
    if (r.width < 2 || r.height < 2 || isHidden(el)) continue;
    if (r.bottom <= 0 || r.top >= window.innerHeight * 50) continue; // skip links parked above the page; far below the fold is scroll, not clipping
    if (el.closest('.pvs-skip') || el.classList.contains('pvs-skip')) continue;
    if (r.left >= vw - 1 || r.right <= 1 || (r.right > vw + 1 && r.left < vw)) {
      if (!hasScrollAncestor(el)) offscreenControls.push({ ...describe(el), left: Math.round(r.left), right: Math.round(r.right), viewportWidth: vw });
    }
  }

  // ---- duplicate ids
  // 3.4.18: Strato 3.18's charts write a few fixed ids inside every instance (the GaugeChart's labels, the chart
  // toolbar), so two charts on a page repeat them. Those are the platform's, not the app's: they are left out only
  // when they sit inside one of the app's chart wrappers (`[data-pvs-chart]`, engine/strato), so an app id still counts.
  const STRATO_CHART_IDS = new Set(['chart-toolbar', 'internal-labels', 'value-label', 'min-max-labels']);
  const counts = new Map();
  for (const el of document.querySelectorAll('[id]')) {
    if (STRATO_CHART_IDS.has(el.id) && el.closest('[data-pvs-chart]') !== null) continue;
    if (el.id !== '') counts.set(el.id, [...(counts.get(el.id) ?? []), el]);
  }
  const duplicateIds = [...counts.entries()]
    .filter(([, els]) => els.length > 1)
    .slice(0, 20)
    .map(([id, els]) => ({ id, count: els.length, first: describe(els[0]).selector, second: describe(els[1]).selector }));

  // ---- images
  const imagesMissingAlt = [...document.querySelectorAll('img:not([alt]), input[type=image]:not([alt])')]
    .slice(0, 20)
    .map((el) => ({ ...describe(el), src: (el.getAttribute('src') ?? '').slice(0, 60) }));
  const imageCount = document.querySelectorAll('img').length;

  // ---- headings
  const headings = [];
  for (const el of document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role=heading]')) {
    if (!visible(el)) continue;
    const level = el.getAttribute('aria-level') ? Number(el.getAttribute('aria-level')) : /^H[1-6]$/.test(el.tagName) ? Number(el.tagName[1]) : 2;
    headings.push({ level, text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 60) });
  }
  const skips = [];
  let previous = 0;
  for (const heading of headings) {
    if (previous > 0 && heading.level - previous > 1) skips.push({ from: previous, to: heading.level, text: heading.text });
    if (previous === 0 && heading.level > 1) skips.push({ from: 0, to: heading.level, text: heading.text });
    previous = heading.level;
  }
  const headingInfo = {
    h1Count: headings.filter((h) => h.level === 1).length,
    total: headings.length,
    skips: skips.slice(0, 10),
    outline: headings.slice(0, 40).map((h) => `${'  '.repeat(Math.max(h.level - 1, 0))}h${h.level} ${h.text}`),
  };

  // ---- landmarks
  const mains = [...document.querySelectorAll('main, [role=main]')].filter((el) => !isHidden(el));
  const landmarks = {
    main: mains.length,
    mainSelectors: mains.slice(0, 3).map((el) => describe(el).selector),
    nav: document.querySelectorAll('nav, [role=navigation]').length,
    banner: [...document.querySelectorAll('header, [role=banner]')].filter((el) => el.getAttribute('role') === 'banner' || !el.parentElement?.closest('main, article, section, aside, nav, [role=main]')).length,
    lang: document.documentElement.getAttribute('lang'),
  };

  // ---- target size (WCAG 2.2 AA 2.5.8: 24x24 CSS px)
  const targetSel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=checkbox], [role=radio], [role=switch], [role=tab], [role=menuitem], [role=combobox], [role=textbox], [role=slider]';
  const seen = new Set();
  const smallTargets = [];
  let targetCount = 0;
  // 3.6.5: the whole criterion, its spacing exception included — an undersized target passes when a 24 px circle
  // centred on it touches no other target (nor another undersized target's circle). The hit area of a native input is
  // its label's box when the label is larger.
  const allTargets = [];
  const undersized = [];
  for (const el of document.querySelectorAll(targetSel)) {
    if (!visible(el)) continue;
    let r = rectOf(el);
    if (r.bottom <= 0 || el.closest('.pvs-skip')) continue;
    if (r.width < 1 || r.height < 1) continue; // visually-hidden native input behind a styled control
    targetCount += 1;
    if (el.tagName === 'INPUT') {
      const label = el.closest('label') || el.labels?.[0];
      if (label) {
        const lr = rectOf(label);
        if (lr.width * lr.height > r.width * r.height) r = lr;
      }
    }
    allTargets.push({ el, r });
    if (r.width >= 24 && r.height >= 24) continue;
    undersized.push({ el, r });
  }
  const centre = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  const circleHitsRect = (c, r) => {
    const dx = Math.max(r.left - c.x, 0, c.x - r.right);
    const dy = Math.max(r.top - c.y, 0, c.y - r.bottom);
    return dx * dx + dy * dy < 12 * 12;
  };
  const sameTarget = (a, b) => a === b || a.contains(b) || b.contains(a);
  for (const { el, r } of undersized) {
    const c = centre(r);
    const crowded =
      allTargets.some((other) => !sameTarget(other.el, el) && circleHitsRect(c, other.r)) ||
      undersized.some((other) => {
        if (sameTarget(other.el, el)) return false;
        const o = centre(other.r);
        return (o.x - c.x) ** 2 + (o.y - c.y) ** 2 < 24 * 24;
      });
    if (!crowded) continue;
    const cs = getComputedStyle(el);
    const parentText = [...(el.parentElement?.childNodes ?? [])].some((n) => n.nodeType === 3 && n.textContent.trim() !== '');
    const inline = el.tagName === 'A' && cs.display === 'inline' && parentText;
    const info = { ...describe(el), width: Math.round(r.width * 10) / 10, height: Math.round(r.height * 10) / 10, inline };
    const key = `${info.selector}|${info.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    smallTargets.push(info);
  }

  // ---- text contrast (WCAG 1.4.3). Skips text over gradients/images: their real contrast is unknowable here.
  const parseColor = (value) => {
    let m = value.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    m = value.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/);
    if (m) return { r: Number(m[1]) * 255, g: Number(m[2]) * 255, b: Number(m[3]) * 255, a: m[4] === undefined ? 1 : Number(m[4]) };
    return null;
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const over = (top, bottom) => {
    const a = top.a + bottom.a * (1 - top.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    return {
      r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a,
      g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a,
      b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a,
      a,
    };
  };
  const canvas = parseColor(getComputedStyle(document.documentElement).backgroundColor);
  const darkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const canvasColor = canvas && canvas.a > 0 ? canvas : darkScheme ? { r: 0, g: 0, b: 0, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
  const contrastSeen = new Set();
  const contrastIssues = [];
  let contrastChecked = 0;
  let contrastSkipped = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.textContent ?? '').trim();
    const el = node.parentElement;
    if (text.length < 2 || !el || el.closest('script, style, noscript, svg')) continue;
    if (el.closest('[disabled], [aria-disabled="true"]')) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const box = range.getBoundingClientRect();
    if (box.width < 2 || box.height < 2 || isHidden(el)) continue;
    const cs = getComputedStyle(el);
    let fg = parseColor(cs.color);
    if (!fg) {
      contrastSkipped += 1;
      continue;
    }
    let opacity = 1;
    let unknown = false;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const ns = getComputedStyle(n);
      opacity *= Number(ns.opacity);
      if (ns.backgroundImage !== 'none' || (parseColor(ns.backgroundColor) === null && ns.backgroundColor !== 'transparent')) {
        unknown = true; // gradient, image or a colour space we do not parse
        break;
      }
      const layer = parseColor(ns.backgroundColor);
      if (layer && layer.a >= 0.999) break;
    }
    if (unknown) {
      contrastSkipped += 1;
      continue;
    }
    const layers = [];
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const layer = parseColor(getComputedStyle(n).backgroundColor);
      if (layer && layer.a > 0) layers.push(layer);
      if (layer && layer.a >= 0.999) break;
    }
    let base = canvasColor;
    for (let i = layers.length - 1; i >= 0; i -= 1) base = over(layers[i], base);
    fg = over({ ...fg, a: fg.a * opacity }, base);
    const l1 = lum(fg);
    const l2 = lum(base);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const px = parseFloat(cs.fontSize);
    const large = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700);
    contrastChecked += 1;
    const need = large ? 3 : 4.5;
    if (ratio < need) {
      const info = describe(el);
      const key = `${info.selector}|${text.slice(0, 20)}`;
      if (contrastSeen.has(key)) continue;
      contrastSeen.add(key);
      const hex = (c) => `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
      contrastIssues.push({ selector: info.selector, text: text.slice(0, 50), ratio: Math.round(ratio * 100) / 100, need, fg: hex(fg), bg: hex(base), fontSize: px });
    }
  }
  contrastIssues.sort((a, b) => a.ratio - b.ratio);

  // ---- fit (3.5.3, the owner's request "every page with its components resized and well fitted, as Coverage"): cards
  // side by side whose heights differ a lot leave a hole beside the shorter one, and a card whose content fills little
  // of its height reads empty. Reported as a warning with the row's selector and the heights, for review.
  const mainEl = document.querySelector('main#pvs-main') ?? document.querySelector('main') ?? document.body;
  const hasSurface = (el) => {
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor;
    const painted = bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(bg);
    const bordered = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none';
    return painted || bordered;
  };
  const cardOf = (el) => {
    let node = el;
    for (let depth = 0; depth < 3 && node; depth += 1) {
      if (hasSurface(node)) return node;
      const kids = [...node.children].filter(visible);
      if (kids.length !== 1) return null;
      node = kids[0];
    }
    return null;
  };
  const contentBottom = (card) => {
    let bottom = card.getBoundingClientRect().top;
    for (const el of card.querySelectorAll('svg, canvas, img, table, input, button, p, span, h1, h2, h3, h4, h5, h6, li, dd, dt, td, th, text')) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.height > 0 && r.bottom > bottom) bottom = r.bottom;
    }
    return bottom;
  };
  const unbalanced = [];
  const hollow = [];
  const seenCards = new Set();
  for (const parent of mainEl.querySelectorAll('*')) {
    if (!visible(parent)) continue;
    const cs = getComputedStyle(parent);
    if (!(cs.display.includes('grid') || (cs.display.includes('flex') && !cs.flexDirection.startsWith('column')))) continue;
    const cards = [...parent.children].filter(visible).map((child) => cardOf(child)).filter((card) => card !== null);
    if (cards.length < 2) continue;
    const byTop = new Map();
    for (const card of cards) {
      const r = card.getBoundingClientRect();
      if (r.width < 160) continue;
      const key = Math.round(r.top / 6);
      const list = byTop.get(key) ?? [];
      list.push({ card, r });
      byTop.set(key, list);
    }
    for (const row of byTop.values()) {
      if (row.length < 2) continue;
      const heights = row.map((item) => item.r.height);
      const max = Math.max(...heights);
      const min = Math.min(...heights);
      if (max - min > 120 && min / max < 0.6) {
        unbalanced.push({ ...describe(parent), heights: heights.map(Math.round), widths: row.map((item) => Math.round(item.r.width)) });
      }
      for (const { card, r } of row) {
        if (seenCards.has(card) || r.height < 260) continue;
        seenCards.add(card);
        const used = contentBottom(card) - r.top;
        if (r.height - used > 160 && used / r.height < 0.6) hollow.push({ ...describe(card), height: Math.round(r.height), used: Math.round(used) });
      }
    }
  }
  const fit = { unbalanced: unbalanced.slice(0, 12), unbalancedCount: unbalanced.length, hollow: hollow.slice(0, 12), hollowCount: hollow.length };

  // ---- render sanity
  const main = document.querySelector('main#pvs-main') ?? document.querySelector('main');
  const mainText = (main?.innerText ?? '').trim();
  const animations = document.getAnimations();
  const render = {
    mainTextLength: mainText.length,
    title: document.title,
    h1: document.querySelector('h1')?.textContent?.trim().slice(0, 80) ?? null,
    spinnersVisible: [...document.querySelectorAll('[role=progressbar], [data-dt-component="ProgressCircle"]')].filter(visible).length,
    runningAnimations: animations.filter((a) => a.playState === 'running').length,
    infiniteAnimations: animations.filter((a) => a.playState === 'running' && a.effect?.getComputedTiming?.().iterations === Infinity).length,
    domNodes: all.length,
  };

  return {
    overflow,
    offscreenControls: offscreenControls.slice(0, 12),
    duplicateIds,
    images: { count: imageCount, missingAlt: imagesMissingAlt },
    headings: headingInfo,
    landmarks,
    targets: { checked: targetCount, small: smallTargets.slice(0, 40), smallCount: smallTargets.length },
    contrast: { checked: contrastChecked, skippedUnknownBackground: contrastSkipped, failing: contrastIssues.length, worst: contrastIssues.slice(0, 15) },
    render,
    fit,
    pvs: { queries: window.__PVS__?.queries ?? {}, unmatched: window.__PVS__?.unmatched ?? [], pending: window.__PVS__?.pending ?? 0, hung: window.__PVS__?.hung ?? 0 },
  };
}

/** Records every element's focus-relevant style before the first Tab, to detect real changes. */
export function captureBaseline() {
  const signature = (el) => {
    const cs = getComputedStyle(el);
    return [cs.outlineStyle, cs.outlineWidth, cs.outlineColor, cs.boxShadow, cs.borderTopColor, cs.borderTopWidth, cs.backgroundColor, cs.textDecorationLine, cs.color].join('|');
  };
  window.__pvsBaseline = new WeakMap();
  for (const el of document.querySelectorAll('*')) window.__pvsBaseline.set(el, signature(el));
}

/** Describes the focused element after a Tab press. */
export function describeFocus() {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return { tag: 'BODY', role: null, name: '', focusLost: true };
  const labelledby = el.getAttribute('aria-labelledby');
  const labelText = labelledby
    ? labelledby.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim()
    : '';
  const name = (
    el.getAttribute('aria-label') ||
    labelText ||
    (el.labels && el.labels[0]?.textContent) ||
    el.innerText ||
    el.getAttribute('title') ||
    el.value ||
    el.getAttribute('placeholder') ||
    ''
  )
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 60);
  const cs = getComputedStyle(el);
  const outlineWidth = parseFloat(cs.outlineWidth) || 0;
  const outline = cs.outlineStyle !== 'none' && outlineWidth > 0;
  const shadow = cs.boxShadow !== 'none';
  // Strato wraps native inputs: the visible ring may live on the wrapper.
  const wrapper = el.closest('[data-dt-component], label, [role=group]');
  let wrapperIndicator = false;
  if (wrapper && wrapper !== el) {
    const ws = getComputedStyle(wrapper);
    wrapperIndicator = (ws.outlineStyle !== 'none' && parseFloat(ws.outlineWidth) > 0) || ws.boxShadow !== 'none';
  }
  // Did focusing change the look of the element or of a near ancestor (a wrapper that draws the ring)?
  let changedAt = -1;
  const signature = (node) => {
    const style = getComputedStyle(node);
    return [style.outlineStyle, style.outlineWidth, style.outlineColor, style.boxShadow, style.borderTopColor, style.borderTopWidth, style.backgroundColor, style.textDecorationLine, style.color].join('|');
  };
  let node = el;
  for (let level = 0; level <= 6 && node && node !== document.body; level += 1) {
    const before = window.__pvsBaseline?.get(node);
    if (before !== undefined && before !== signature(node)) {
      changedAt = level;
      break;
    }
    node = node.parentElement;
  }
  // 3.6.5: a platform select focuses an inner input; the control the user sees (and that draws the ring) is the select.
  const r = (el.closest('[data-dt-component="Select"]') ?? el).getBoundingClientRect();
  return {
    tag: el.tagName,
    role: el.getAttribute('role'),
    name,
    ...window.__pvsDescribe(el),
    outlineStyle: cs.outlineStyle,
    outlineWidth: cs.outlineWidth,
    boxShadow: cs.boxShadow === 'none' ? 'none' : cs.boxShadow.slice(0, 80),
    indicator: outline || shadow,
    indicatorOnWrapper: wrapperIndicator,
    changedAt,
    focusVisible: el.matches(':focus-visible'),
    inViewport: r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth,
    rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
  };
}

/** Resolves once the DOM has been quiet for `quietMs` (or `maxMs` elapsed). */
export function waitForQuiet({ quietMs, maxMs }) {
  return new Promise((resolve) => {
    let timer = setTimeout(done, quietMs);
    const cap = setTimeout(done, maxMs);
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(done, quietMs);
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    function done() {
      observer.disconnect();
      clearTimeout(timer);
      clearTimeout(cap);
      resolve(undefined);
    }
  });
}
