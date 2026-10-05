// Demo of revealjs-anime using anime.js as the animation library.
//
// The extension ships lifecycle glue only, no animation primitives, so the
// handful of helpers several slides share live here at deck level.

// Type `text` into `el` by animating a plain {n} object and rewriting
// textContent on update — never by animating the DOM node's text directly.
// Options: from/to (start/end index — default to a full forward or, with
// reverse, a full backward pass; pass both explicitly to retarget from a
// live in-progress position), reverse (sugar for "defaults run backward"),
// caret (append a trailing '|' while running), speed (ms/char).
function typewriter(el, text, opts = {}) {
  const speed = opts.speed || 70;
  const reverse = !!opts.reverse;
  const caret = opts.caret !== false;
  const defaultFrom = reverse ? text.length : 0;
  const defaultTo = reverse ? 0 : text.length;
  const start = opts.from !== undefined ? opts.from : defaultFrom;
  const end = opts.to !== undefined ? opts.to : defaultTo;
  const state = { n: start };
  return anime({
    targets: state,
    n: end,
    duration: Math.abs(end - start) * speed,
    easing: 'linear',
    update: () => {
      el.textContent = text.slice(0, Math.round(state.n)) + (caret ? '|' : '');
    },
    complete: () => {
      el.textContent = text.slice(0, end);
      if (opts.complete) opts.complete();
    },
  });
}

// Strip the trailing caret a paused typewriter may have left behind.
function cleanTrailingCaret(el) {
  if (el && el.textContent.endsWith('|')) {
    el.textContent = el.textContent.slice(0, -1);
  }
}

// Live typed-position read, for retargeting a typewriter mid-flight: counts
// how much of `text` is already committed to `el`, stripping the trailing
// caret a running/paused instance may have left — the typewriter analog of
// `getComputedStyle` for a CSS transition. Treats anything that isn't a
// strict prefix of `text` (e.g. stale content from a different string) as
// "nothing typed yet", rather than retargeting from a nonsensical position.
function currentTypedLength(el, text) {
  let content = el.textContent;
  if (content.endsWith('|')) content = content.slice(0, -1);
  return text.startsWith(content) ? content.length : 0;
}

// A timer bag: schedule chained steps and cancel them all in one call. Every
// self-cancelling loop needs this, otherwise a pending setTimeout resumes the
// animation after the slide is gone.
function makeTimers() {
  let ids = [];
  let cancelled = false;
  return {
    after(ms, fn) {
      if (cancelled) return;
      ids.push(setTimeout(() => { if (!cancelled) fn(); }, ms));
    },
    get cancelled() { return cancelled; },
    cancel() {
      cancelled = true;
      ids.forEach(clearTimeout);
      ids = [];
    },
  };
}

RevealAnime.defineSlide('pulse-slide', {
  enter(section) {
    const el = section.querySelector('.pulse-target');
    if (!el) return () => {};
    anime({
      targets: el,
      scale: [1, 1.1, 1],
      duration: 1200,
      easing: 'easeInOutSine',
      loop: true,
    });
    return () => {
      anime.remove(el);
      anime.set(el, { scale: 1 });
    };
  },
});

// Ambient floating hex stickers.
//
// The hexes are created on slide entry and torn down on leave, so the slide
// markup stays empty. Each hex gets its own anime() call rather than a shared
// timeline — they are meant to drift independently, and per-element instances
// make the stop path a simple anime.remove() per node.

const HEXES = [
  // x/y are top-left in slide coordinates (1280x720); the deck's center is
  // left clear for the title. dx/dy/dur give each hex its own drift.
  { x:   60, y: 240, rotate:  -8, scale: 1.00, hue: 262, dx:  30, dy: -24, dur: 7000 },
  { x:  190, y: 430, rotate:   6, scale: 0.80, hue: 190, dx: -22, dy:  32, dur: 9000 },
  { x:  640, y:  80, rotate:  12, scale: 0.65, hue: 340, dx:  18, dy:  28, dur: 6000 },
  { x:  100, y: 560, rotate:  -4, scale: 0.90, hue:  20, dx:  34, dy: -18, dur: 8000 },
  { x: 1060, y:  70, rotate:   9, scale: 0.85, hue: 140, dx: -28, dy:  30, dur: 7500 },
  { x:  930, y: 350, rotate:  -7, scale: 0.70, hue: 220, dx:  24, dy:  26, dur: 10000 },
  { x: 1110, y: 480, rotate:   3, scale: 1.00, hue:  45, dx: -32, dy: -22, dur: 6500 },
  { x:  820, y: 610, rotate: -11, scale: 0.75, hue: 300, dx:  20, dy: -30, dur: 8500 },
];

const HEX_W = 110;
const SVG_NS = 'http://www.w3.org/2000/svg';

// Pointy-top hexagon, the R sticker proportions (taller than wide).
function makeHex(spec) {
  const h = HEX_W * 1.1547;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'hex-sticker');
  svg.setAttribute('width', HEX_W);
  svg.setAttribute('height', h);
  svg.setAttribute('viewBox', `0 0 ${HEX_W} ${h}`);
  svg.style.left = spec.x + 'px';
  svg.style.top = spec.y + 'px';

  const poly = document.createElementNS(SVG_NS, 'polygon');
  const w = HEX_W;
  poly.setAttribute('points',
    `${w / 2},0 ${w},${h * 0.25} ${w},${h * 0.75} ${w / 2},${h} 0,${h * 0.75} 0,${h * 0.25}`);
  poly.setAttribute('fill', `hsl(${spec.hue} 55% 62%)`);
  poly.setAttribute('stroke', `hsl(${spec.hue} 55% 38%)`);
  poly.setAttribute('stroke-width', '4');
  svg.appendChild(poly);
  return svg;
}

RevealAnime.defineSlide('hexes-slide', {
  enter(section) {
    // anime.remove() detaches targets but still runs an in-flight instance's
    // complete callback, so leaving mid-entry would start a drift loop on a
    // node we already tore down. The flag makes the stop path authoritative.
    let stopped = false;
    const nodes = HEXES.map((spec) => {
      const el = makeHex(spec);
      section.appendChild(el);
      return { el, spec };
    });

    nodes.forEach(({ el, spec }, i) => {
      anime({
        targets: el,
        opacity: [0, 1],
        scale: [0.6, spec.scale],
        rotate: spec.rotate,
        duration: 600,
        delay: i * 80,
        easing: 'easeOutQuad',
        complete: () => {
          if (stopped) return;
          // Drift only translate + rotate; scale is left where the entry
          // animation parked it so the two never fight over one property.
          anime({
            targets: el,
            translateX: spec.dx,
            translateY: spec.dy,
            rotate: spec.rotate + (spec.dx > 0 ? 8 : -8),
            duration: spec.dur,
            easing: 'easeInOutSine',
            direction: 'alternate',
            loop: true,
          });
        },
      });
    });

    return () => {
      stopped = true;
      nodes.forEach(({ el }) => {
        anime.remove(el);
        el.remove();
      });
    };
  },
});

// Typing is itself the animation here, so there's no "rest value" to snap
// to on back-navigation that wouldn't look like a bug — reversing mid-type
// must backspace from the live position, not clear instantly. Both show and
// hide read the live typed length off the DOM (currentTypedLength) and
// retarget a fresh typewriter instance from there, rather than assuming a
// fixed start — the same stop-and-retarget principle as the reviewer-slide
// fragments below, applied to a text-driven rather than property-driven
// animation.
const TW_TEXT = 'Hello from revealjs-anime!';

RevealAnime.defineSlide('typewriter-slide', {
  fragments: {
    'tw-go': {
      show(section) {
        const el = section.querySelector('#tw');
        if (!el) return () => {};
        const inst = typewriter(el, TW_TEXT, { from: currentTypedLength(el, TW_TEXT), to: TW_TEXT.length });
        return () => inst.pause();
      },
      hide(section) {
        const el = section.querySelector('#tw');
        if (!el) return () => {};
        const inst = typewriter(el, TW_TEXT, { from: currentTypedLength(el, TW_TEXT), to: 0 });
        return () => inst.pause();
      },
    },
  },
});

// Ambient slide — idle terminal.
//
// A self-cancelling loop: type a command, hold, backspace, pause, repeat. The
// caret blink is a pure CSS animation on its own span, so anime.js owns only
// the command text and the two never contend for the same property.

const TERM_CMD = 'library(tidymodels)';

RevealAnime.defineSlide('terminal-slide', {
  enter(section) {
    const el = section.querySelector('.term-cmd');
    if (!el) return () => {};
    const timers = makeTimers();
    let inst = null;

    function cycle() {
      if (timers.cancelled) return;
      inst = typewriter(el, TERM_CMD, { caret: false, speed: 80 });
      timers.after(1500 + 1500, () => {
        if (timers.cancelled) return;
        inst = typewriter(el, TERM_CMD, { reverse: true, caret: false, speed: 40 });
        timers.after(800 + 3000, cycle);
      });
    }

    timers.after(1000, cycle);

    return () => {
      timers.cancel();
      if (inst) inst.pause();
      cleanTrailingCaret(el);
      el.textContent = '';
    };
  },
});

// Punchline — "just one more feature". The formula grows until it runs off the
// slide, then deflates to `y ~ .`.
//
// anime.js owns transform and the text content (via the update callback); no
// CSS transition touches this element, so there is nothing to fight over.

const FORMULA_START = 'y ~ x1';
const FORMULA_TERMS = 11;

function formulaAt(n) {
  let out = FORMULA_START;
  for (let i = 2; i <= n; i++) out += ` + x${i}`;
  return out;
}

const FORMULA_FULL = formulaAt(FORMULA_TERMS + 1);

// Both fragments below are driven entirely through a plain state object
// (never anime.js targeting `el` directly), wrapped in RevealAnime.reversible()
// so forward/backward always resume or reverse the *same* live instance —
// the "timeline library flavor" from the fragment-stop-and-retarget skill.
// `formula-deflate` additionally derives its displayed text from the live
// tweened scale rather than from a `complete` callback tied to one
// direction: that's what makes the collapse-text-swap-pop sequence reverse
// cleanly as a *single* instance instead of needing phase-tracking across
// two separately-chained anime() calls.

RevealAnime.defineSlide('formula-slide', {
  enter(section) {
    const el = section.querySelector('.formula-target');
    if (el) {
      el.textContent = FORMULA_START;
      el.style.transform = 'scale(1)';
      el.style.opacity = '1';
    }
    section.__revFx = {};
    return () => { section.__revFx = null; };
  },
  fragments: {
    'formula-grow': {
      show(section) {
        const el = section.querySelector('.formula-target');
        if (!el || !section.__revFx) return () => {};
        if (!section.__revFx.grow) {
          // A slight shrink as it grows, to suggest the panic of a model
          // that keeps acquiring predictors. `n` (term count) and `s`
          // (scale) tween together so one live instance drives both.
          const state = { n: 1, s: 1 };
          section.__revFx.grow = RevealAnime.reversible(() => anime({
            targets: state,
            n: FORMULA_TERMS + 1,
            s: 0.78,
            duration: FORMULA_TERMS * 400,
            easing: 'linear',
            autoplay: false,
            update: () => {
              el.textContent = formulaAt(Math.floor(state.n));
              el.style.transform = 'scale(' + state.s + ')';
            },
          }));
        }
        return section.__revFx.grow.forward();
      },
      hide(section) {
        const rev = section.__revFx && section.__revFx.grow;
        return rev ? rev.backward() : () => {};
      },
    },
    'formula-deflate': {
      show(section) {
        const el = section.querySelector('.formula-target');
        if (!el || !section.__revFx) return () => {};
        if (!section.__revFx.deflate) {
          // Starts from formula-grow's rest state (scale .78, opacity 1,
          // full formula) and keyframes down to a collapse (scale .3,
          // opacity 0) then back up past normal size (scale 1, opacity 1) —
          // the "just one more feature" punchline pop. The text swap to
          // 'y ~ .' must happen at the collapse/pop boundary regardless of
          // direction; it's keyed off `instance.currentTime` (the 350ms
          // collapse duration), not off the live scale value — `easeOutBack`
          // overshoots past 1 and back during the pop segment, so scale
          // isn't monotonic across the two segments and can't reliably tell
          // "before collapse" from "after pop" (both sit near/above the
          // threshold). Elapsed time has no such ambiguity in either
          // direction.
          const state = { s: 0.78, o: 1 };
          const COLLAPSE_MS = 350;
          section.__revFx.deflate = RevealAnime.reversible(() => anime({
            targets: state,
            keyframes: [
              { s: 0.3, o: 0, duration: COLLAPSE_MS, easing: 'easeInQuad' },
              { s: 1, o: 1, duration: 700, easing: 'easeOutBack' },
            ],
            autoplay: false,
            update: (anim) => {
              el.textContent = anim.currentTime >= COLLAPSE_MS ? 'y ~ .' : FORMULA_FULL;
              el.style.transform = 'scale(' + state.s + ')';
              el.style.opacity = state.o;
            },
          }));
        }
        return section.__revFx.deflate.forward();
      },
      hide(section) {
        const rev = section.__revFx && section.__revFx.deflate;
        return rev ? rev.backward() : () => {};
      },
    },
  },
});

// Punchline — "I'll just use a for loop", collapsing to map().
//
// The stage strings are snapshotted here at module scope. Back-navigation
// restores from these constants, never by reading half-animated text out of
// the DOM.

const LOOP_STAGE1 = [
  'for (i in seq_along(x)) {',
  '  out[[i]] <- f(x[[i]])',
  '}',
].join('\n');

const LOOP_STAGE2 = [
  'out <- vector("list", length(x))',
  'names(out) <- names(x)',
  'for (i in seq_along(x)) {',
  '  res <- tryCatch(f(x[[i]]), error = function(e) NULL)',
  '  if (!is.null(res)) out[[i]] <- res',
  '}',
].join('\n');

RevealAnime.defineSlide('forloop-slide', {
  enter(section) {
    const el = section.querySelector('.loop-target');
    if (el) {
      el.textContent = '';
      anime.set(el, { scale: 1, opacity: 1 });
    }
    return () => {};
  },
  fragments: {
    'loop-grows': {
      show(section) {
        const el = section.querySelector('.loop-target');
        if (!el) return () => {};
        const inst = typewriter(el, LOOP_STAGE1, { speed: 18 });
        return () => {
          inst.pause();
          cleanTrailingCaret(el);
        };
      },
      hide(section) {
        const el = section.querySelector('.loop-target');
        if (el) el.textContent = '';
      },
    },
    'loop-grows-more': {
      show(section) {
        const el = section.querySelector('.loop-target');
        if (!el) return () => {};
        // Retype the whole block rather than appending: stage 2 rewrites the
        // earlier lines too, so an append would leave stale text on screen.
        const inst = typewriter(el, LOOP_STAGE2, { speed: 14 });
        return () => {
          inst.pause();
          cleanTrailingCaret(el);
        };
      },
      hide(section) {
        const el = section.querySelector('.loop-target');
        if (el) el.textContent = LOOP_STAGE1;
      },
    },
    'loop-collapse': {
      show(section) {
        const el = section.querySelector('.loop-target');
        if (!el) return () => {};
        anime.remove(el);
        let stopped = false;
        const inst = anime({
          targets: el,
          opacity: 0,
          scale: 0.9,
          duration: 400,
          easing: 'easeInQuad',
          complete: () => {
            if (stopped) return;
            el.textContent = 'map(x, f)';
            anime({
              targets: el,
              opacity: [0, 1],
              scale: [0.6, 1],
              duration: 800,
              easing: 'easeOutBack',
            });
          },
        });
        return () => {
          stopped = true;
          anime.remove(el);
          inst.pause();
        };
      },
      hide(section) {
        const el = section.querySelector('.loop-target');
        if (el) {
          anime.remove(el);
          el.textContent = LOOP_STAGE2;
          anime.set(el, { scale: 1, opacity: 1 });
        }
      },
    },
  },
});

// Punchline — Reviewer 2. The most integrated demo: a cursor flies in, drags a
// strikethrough across the quote, then types a comment underneath.
//
// The cursor is positioned with RevealAnime.slideCoordsOf(), which converts the
// screen-space getBoundingClientRect() values into the slide's internal 1280x720
// coordinate space that translateX/Y actually operate in.

const REVIEWER_COMMENT = '"Have you considered that this is wrong?" — R2';

function makeCursor(name, color) {
  const wrap = document.createElement('div');
  wrap.className = 'anime-cursor';
  wrap.innerHTML =
    '<svg width="20" height="24" viewBox="0 0 20 24">' +
    `<path d="M2,1 L2,19 L7,14 L10,22 L13,20.5 L10,13 L17,13 Z" fill="${color}" ` +
    'stroke="white" stroke-width="1.2"/></svg>' +
    `<span class="anime-cursor-label" style="background:${color}">${name}</span>`;
  return wrap;
}

RevealAnime.defineSlide('reviewer-slide', {
  enter(section) {
    const quote = section.querySelector('.reviewer-quote');
    const strike = section.querySelector('.reviewer-strike');
    const comment = section.querySelector('.reviewer-comment');
    const cursor = makeCursor('Reviewer 2', '#c0392b');
    section.appendChild(cursor);
    anime.set(cursor, { translateX: -250, translateY: 200, opacity: 1 });
    if (strike) anime.set(strike, { width: 0 });
    if (comment) comment.textContent = '';
    section.__cursor = cursor;
    // Per-fragment reversible() instances, keyed by fragment id. Rebuilt
    // fresh every slide entry since they close over this entry's `cursor`
    // node.
    section.__revFx = {};
    return () => {
      anime.remove(cursor);
      cursor.remove();
      section.__cursor = null;
      section.__revFx = null;
      if (strike) anime.set(strike, { width: 0 });
      if (comment) {
        cleanTrailingCaret(comment);
        comment.textContent = '';
      }
      if (quote) anime.set(quote, { opacity: 1 });
    };
  },
  fragments: {
    // 'rev-enter' and 'rev-strike' are both plain property tweens (cursor
    // translate, strike width), so they go through RevealAnime.reversible():
    // interrupting the fly-in or the strike-draw mid-flight redirects the
    // *same* anime.js instance from its live position, rather than the old
    // anime.remove() + anime.set() pair that snapped straight to a fixed
    // rest value. See the fragment-stop-and-retarget skill's "Timeline
    // library flavor".
    'rev-enter': {
      show(section) {
        const quote = section.querySelector('.reviewer-quote');
        const cursor = section.__cursor;
        if (!quote || !cursor || !section.__revFx) return () => {};
        if (!section.__revFx.enter) {
          // Measure at fire time, not at slide entry: the fragment may have
          // shifted layout, and a cached rect would be stale. The instance
          // is built once and reused for every later forward()/backward(),
          // so this box is captured only on the very first show — matches
          // the old behavior, since the quote never moves after that.
          const box = RevealAnime.slideCoordsOf(section, quote);
          section.__revFx.enter = RevealAnime.reversible(() => anime({
            targets: cursor,
            translateX: box.x - 10,
            translateY: box.y + box.height * 0.5,
            duration: 900,
            easing: 'easeOutBack',
            autoplay: false,
          }));
        }
        return section.__revFx.enter.forward();
      },
      hide(section) {
        const rev = section.__revFx && section.__revFx.enter;
        return rev ? rev.backward() : () => {};
      },
    },
    'rev-strike': {
      show(section) {
        const quote = section.querySelector('.reviewer-quote');
        const strike = section.querySelector('.reviewer-strike');
        const cursor = section.__cursor;
        if (!quote || !strike || !section.__revFx) return () => {};
        if (!section.__revFx.strike) {
          const box = RevealAnime.slideCoordsOf(section, quote);
          anime.set(strike, {
            left: box.x + 'px',
            top: box.y + box.height * 0.55 + 'px',
            width: 0,
          });
          // CSS owns how the strike looks; anime.js owns only its width, and
          // the cursor rides along at the leading edge. Bundle both tweens
          // behind one play/pause/reverse surface so reversible() can treat
          // them as a single unit.
          section.__revFx.strike = RevealAnime.reversible(() => {
            const line = anime({
              targets: strike,
              width: box.width,
              duration: 1100,
              easing: 'easeInOutQuad',
              autoplay: false,
            });
            const drag = cursor && anime({
              targets: cursor,
              translateX: box.x + box.width - 10,
              translateY: box.y + box.height * 0.55,
              duration: 1100,
              easing: 'easeInOutQuad',
              autoplay: false,
            });
            return {
              play: () => { line.play(); if (drag) drag.play(); },
              pause: () => { line.pause(); if (drag) drag.pause(); },
              reverse: () => {
                line.reverse();
                RevealAnime.unstickAfterReverse(line);
                if (drag) { drag.reverse(); RevealAnime.unstickAfterReverse(drag); }
              },
            };
          });
        }
        return section.__revFx.strike.forward();
      },
      hide(section) {
        const rev = section.__revFx && section.__revFx.strike;
        return rev ? rev.backward() : () => {};
      },
    },
    'rev-comment': {
      show(section) {
        const comment = section.querySelector('.reviewer-comment');
        if (!comment) return () => {};
        // Leave the caret in place on completion — it keeps blinking via CSS
        // on the sibling span, which reads as Reviewer 2 still typing.
        const inst = typewriter(comment, REVIEWER_COMMENT, { speed: 45, caret: false });
        const caret = section.querySelector('.reviewer-caret');
        if (caret) caret.style.visibility = 'hidden';
        inst.finished.then(() => {
          if (caret) caret.style.visibility = 'visible';
        });
        return () => {
          inst.pause();
          cleanTrailingCaret(comment);
          comment.textContent = '';
          if (caret) caret.style.visibility = 'hidden';
        };
      },
      hide(section) {
        const comment = section.querySelector('.reviewer-comment');
        if (comment) comment.textContent = '';
      },
    },
  },
});
