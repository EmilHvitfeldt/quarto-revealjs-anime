// revealjs-anime — RevealJS lifecycle adapter for any animation library.
//
// Exposes a single API, RevealAnime.defineSlide(slideClass, hooks), that
// handles the messy parts of binding animations to slide and fragment
// lifecycle events. Bring your own animation library (anime.js, GSAP, ...).
//
// Quarto loads this as a RevealJS plugin via _extension.yml. The plugin's
// init() is a no-op — we hook Reveal events ourselves so user calls to
// defineSlide can happen any time after the script loads.

window.RevealAnime = (function () {
  const SLIDE_W = 1280;
  const SLIDE_H = 720;

  function isSlide(section, slideClass) {
    return !!section && section.classList && section.classList.contains(slideClass);
  }

  // Wait for Reveal to exist, then run cb once. Listeners registered inside
  // cb fire on all future Reveal events regardless of whether the 'ready'
  // event already passed — that event does not replay.
  function onReveal(cb) {
    function go() {
      if (typeof Reveal === 'undefined' || !Reveal.on) {
        setTimeout(go, 50);
        return;
      }
      cb();
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', go);
    } else {
      go();
    }
  }

  // Internal: register low-level Reveal hooks for a slide identified by a
  // marker class applied directly to the <section>.
  function registerSlide(slideClass, hooks) {
    onReveal(() => {
      if (hooks.fragments) {
        Reveal.on('fragmentshown', (e) => {
          const section = e.fragment.closest('section');
          if (!isSlide(section, slideClass)) return;
          const h = hooks.fragments[e.fragment.id];
          if (h && h.show) h.show(section);
        });
        Reveal.on('fragmenthidden', (e) => {
          const section = e.fragment.closest('section');
          if (!isSlide(section, slideClass)) return;
          const h = hooks.fragments[e.fragment.id];
          if (h && h.hide) h.hide(section);
        });
      }
      Reveal.on('slidechanged', (e) => {
        if (isSlide(e.previousSlide, slideClass) && hooks.onLeave) {
          hooks.onLeave(e.previousSlide);
        }
        if (isSlide(e.currentSlide, slideClass)) {
          if (hooks.onEnter) hooks.onEnter(e.currentSlide);
          if (hooks.fragments) {
            Object.entries(hooks.fragments).forEach(([fid, h]) => {
              const f = e.currentSlide.querySelector('#' + fid);
              if (f && f.classList.contains('visible') && h.show) {
                h.show(e.currentSlide);
              }
            });
          }
        }
      });
      const current = Reveal.getCurrentSlide && Reveal.getCurrentSlide();
      if (isSlide(current, slideClass) && hooks.onEnter) {
        hooks.onEnter(current);
      }
    });
  }

  function normalizeFrag(spec) {
    return typeof spec === 'function' ? { show: spec } : spec;
  }

  // Public API.
  //
  // defineSlide(slideClass, {
  //   enter:    runner,                    // (section) => stopFn — on slide entry
  //   leave:    fn(section),               // optional extra cleanup on departure
  //   fragments: {
  //     'frag-id': runner,                 // implicit hide = stopFn from show
  //     'frag-id': { show: runner, hide: runner }, // custom restore on back-nav
  //   },
  // });
  //
  // A "runner" is a function (section) => stopFn. The stopFn is called
  // automatically on slide leave, on fragment hide, and when the same
  // fragment is re-shown.
  function defineSlide(slideClass, hooks) {
    let enterCleanup = null;
    const cleanups = {};
    const restoreCleanups = {};

    registerSlide(slideClass, {
      onEnter: (section) => {
        if (enterCleanup) enterCleanup();
        enterCleanup = hooks.enter ? hooks.enter(section) : null;
      },
      onLeave: (section) => {
        if (enterCleanup) { enterCleanup(); enterCleanup = null; }
        Object.keys(cleanups).forEach((k) => {
          if (cleanups[k]) cleanups[k]();
          delete cleanups[k];
        });
        Object.keys(restoreCleanups).forEach((k) => {
          if (restoreCleanups[k]) restoreCleanups[k]();
          delete restoreCleanups[k];
        });
        if (hooks.leave) hooks.leave(section);
      },
      fragments: hooks.fragments
        ? Object.fromEntries(
            Object.entries(hooks.fragments).map(([id, raw]) => {
              const spec = normalizeFrag(raw);
              return [id, {
                show: (section) => {
                  if (restoreCleanups[id]) { restoreCleanups[id](); restoreCleanups[id] = null; }
                  if (cleanups[id]) cleanups[id]();
                  cleanups[id] = spec.show ? spec.show(section) : null;
                },
                hide: (section) => {
                  if (cleanups[id]) { cleanups[id](); cleanups[id] = null; }
                  if (spec.hide) restoreCleanups[id] = spec.hide(section);
                },
              }];
            })
          )
        : undefined,
    });
  }

  // Convert an element's screen coordinates to RevealJS slide-internal
  // coordinates. RevealJS scales the whole slide with a CSS transform, so
  // getBoundingClientRect() values are in screen pixels and must be scaled
  // to match anime.js translate values applied to slide children.
  function slideCoordsOf(section, el) {
    const sect = section.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const scale = SLIDE_W / sect.width;
    return {
      x: (rect.left - sect.left) * scale,
      y: (rect.top - sect.top) * scale,
      right: (rect.right - sect.left) * scale,
      bottom: (rect.bottom - sect.top) * scale,
      width: rect.width * scale,
      height: rect.height * scale,
    };
  }

  return {
    id: 'reveal-anime',
    init() { /* no-op: lifecycle hooks register lazily via defineSlide */ },
    defineSlide,
    slideCoordsOf,
    SLIDE_W,
    SLIDE_H,
  };
})();
