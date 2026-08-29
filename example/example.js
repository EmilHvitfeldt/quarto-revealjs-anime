// Demo of revealjs-anime using anime.js as the animation library.
//
// The extension ships lifecycle glue only, no animation primitives, so the
// handful of helpers several slides share live here at deck level.

// Type `text` into `el` by animating a plain {n} object and rewriting
// textContent on update — never by animating the DOM node's text directly.
// Options: from (start index, for appending to existing text), reverse
// (backspace), caret (append a trailing '|' while running), speed (ms/char).
function typewriter(el, text, opts = {}) {
  const from = opts.from || 0;
  const speed = opts.speed || 70;
  const reverse = !!opts.reverse;
  const caret = opts.caret !== false;
  const start = reverse ? text.length : from;
  const end = reverse ? from : text.length;
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

RevealAnime.defineSlide('typewriter-slide', {
  fragments: {
    'tw-go'(section) {
      const el = section.querySelector('#tw');
      if (!el) return () => {};
      const inst = typewriter(el, 'Hello from revealjs-anime!');
      return () => {
        inst.pause();
        el.textContent = '';
      };
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

RevealAnime.defineSlide('formula-slide', {
  enter(section) {
    const el = section.querySelector('.formula-target');
    if (el) {
      el.textContent = FORMULA_START;
      anime.set(el, { scale: 1, opacity: 1 });
    }
    return () => {};
  },
  fragments: {
    'formula-grow': {
      show(section) {
        const el = section.querySelector('.formula-target');
        if (!el) return () => {};
        const state = { n: 1 };
        const text = anime({
          targets: state,
          n: FORMULA_TERMS + 1,
          duration: FORMULA_TERMS * 400,
          easing: 'linear',
          update: () => { el.textContent = formulaAt(Math.floor(state.n)); },
        });
        // A slight shrink as it grows, to suggest the panic of a model that
        // keeps acquiring predictors.
        const shrink = anime({
          targets: el,
          scale: 0.78,
          duration: FORMULA_TERMS * 400,
          easing: 'linear',
        });
        return () => {
          text.pause();
          shrink.pause();
        };
      },
      hide(section) {
        const el = section.querySelector('.formula-target');
        if (el) {
          anime.remove(el);
          el.textContent = FORMULA_START;
          anime.set(el, { scale: 1, opacity: 1 });
        }
      },
    },
    'formula-deflate': {
      show(section) {
        const el = section.querySelector('.formula-target');
        if (!el) return () => {};
        anime.remove(el);
        const inst = anime({
          targets: el,
          scale: 0.3,
          opacity: 0,
          duration: 350,
          easing: 'easeInQuad',
          complete: () => {
            el.textContent = 'y ~ .';
            anime({
              targets: el,
              scale: [0.3, 1],
              opacity: [0, 1],
              duration: 700,
              easing: 'easeOutBack',
            });
          },
        });
        return () => {
          anime.remove(el);
          inst.pause();
        };
      },
      hide(section) {
        const el = section.querySelector('.formula-target');
        if (el) {
          anime.remove(el);
          el.textContent = FORMULA_FULL;
          anime.set(el, { scale: 0.78, opacity: 1 });
        }
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
    return () => {
      anime.remove(cursor);
      cursor.remove();
      section.__cursor = null;
      if (strike) anime.set(strike, { width: 0 });
      if (comment) {
        cleanTrailingCaret(comment);
        comment.textContent = '';
      }
      if (quote) anime.set(quote, { opacity: 1 });
    };
  },
  fragments: {
    'rev-enter': {
      show(section) {
        const quote = section.querySelector('.reviewer-quote');
        const cursor = section.__cursor;
        if (!quote || !cursor) return () => {};
        // Measure at fire time, not at slide entry: the fragment may have
        // shifted layout, and a cached rect would be stale.
        const box = RevealAnime.slideCoordsOf(section, quote);
        const inst = anime({
          targets: cursor,
          translateX: box.x - 10,
          translateY: box.y + box.height * 0.5,
          duration: 900,
          easing: 'easeOutBack',
        });
        return () => inst.pause();
      },
      hide(section) {
        const cursor = section.__cursor;
        if (cursor) {
          anime.remove(cursor);
          anime.set(cursor, { translateX: -250, translateY: 200 });
        }
      },
    },
    'rev-strike': {
      show(section) {
        const quote = section.querySelector('.reviewer-quote');
        const strike = section.querySelector('.reviewer-strike');
        const cursor = section.__cursor;
        if (!quote || !strike) return () => {};
        const box = RevealAnime.slideCoordsOf(section, quote);
        anime.set(strike, {
          left: box.x + 'px',
          top: box.y + box.height * 0.55 + 'px',
          width: 0,
        });
        // CSS owns how the strike looks; anime.js owns only its width, and
        // the cursor rides along at the leading edge.
        const line = anime({
          targets: strike,
          width: box.width,
          duration: 1100,
          easing: 'easeInOutQuad',
        });
        const drag = cursor && anime({
          targets: cursor,
          translateX: box.x + box.width - 10,
          translateY: box.y + box.height * 0.55,
          duration: 1100,
          easing: 'easeInOutQuad',
        });
        return () => {
          line.pause();
          if (drag) drag.pause();
        };
      },
      hide(section) {
        const strike = section.querySelector('.reviewer-strike');
        if (strike) {
          anime.remove(strike);
          anime.set(strike, { width: 0 });
        }
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
