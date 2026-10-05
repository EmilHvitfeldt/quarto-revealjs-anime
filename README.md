# quarto-revealjs-anime

A tiny Quarto extension that handles the messy parts of binding animations to RevealJS slide and fragment lifecycle events. Bring your own animation library — anime.js, GSAP, Motion One, vanilla CSS — and just promise to return a cleanup function.

This package is ~150 lines of glue. It does **not** ship animation primitives. It encodes the RevealJS-specific gotchas (lifecycle event timing, fragment back-navigation, the CSS scale transform) so you don't have to re-learn them per slide.

## Install

```bash
quarto add ehvitfeldt/quarto-revealjs-anime
```

Or start from the bundled template, which scaffolds a deck with two working animated slides:

```bash
quarto use template ehvitfeldt/quarto-revealjs-anime
```

Then enable in your deck's YAML:

```yaml
format:
  revealjs:
    revealjs-plugins:
      - revealjs-anime
```

You also need to load whatever animation library you intend to use. For anime.js:

```yaml
format:
  revealjs:
    revealjs-plugins:
      - revealjs-anime
    include-in-header:
      - text: |
          <script src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"></script>
```

## Minimal example

```yaml
---
format: revealjs
revealjs-plugins:
  - revealjs-anime
include-in-header:
  - text: <script src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"></script>
include-after-body:
  - text: <script src="my-slides.js"></script>
---

## Pulsing title { .pulse-slide }

[Look at me]{.target}
```

`my-slides.js`:

```js
RevealAnime.defineSlide('pulse-slide', {
  enter(section) {
    const el = section.querySelector('.target');
    anime({ targets: el, scale: [1, 1.1, 1], duration: 1200, loop: true });
    return () => {
      anime.remove(el);
      anime.set(el, { scale: 1 });
    };
  },
});
```

That's it. The cleanup function you return is called automatically when the user navigates away.

## API

### `RevealAnime.defineSlide(slideClass, hooks)`

Binds animation lifecycle to a slide identified by a class on the `<section>`.

```js
RevealAnime.defineSlide('my-slide-class', {
  enter:  (section) => stopFn,   // optional — runs on slide entry
  leave:  (section) => void,     // optional — extra cleanup on departure
  fragments: {
    'frag-id': (section) => stopFn,                              // implicit hide
    'frag-id': { show: (section) => stopFn, hide: (section) => stopFn }, // custom restore
  },
});
```

**Slide class convention.** Apply the marker class directly to the `<section>`. In Quarto:

```markdown
## My title { .my-slide-class }
```

**Runner contract.** Each `enter` / `show` / `hide` is a function `(section) => stopFn`. The `stopFn` is called automatically when:
- the slide is left (for `enter` and any active fragment `show`)
- the fragment is hidden via back-navigation (for `show`)
- the same fragment is re-shown (its previous `show`'s cleanup runs first)

**Fragment phases.** Use invisible fragment elements to gate phases:

```markdown
## Slide { .my-slide }

::: {.fragment .invisible-fragment #phase-1}
:::

::: {.fragment .invisible-fragment #phase-2}
:::
```

Then wire each phase:

```js
RevealAnime.defineSlide('my-slide', {
  fragments: {
    'phase-1': enterAnim,
    'phase-2': mainAnim,
  },
});
```

`.invisible-fragment` is styled by the extension's own stylesheet, so you do not need to define it. It is the one piece of CSS shipped here, and it is structural rather than decorative: the element exists only to fire a lifecycle event at a chosen step.

**Back-navigation restore.** If a later phase depends on state established by an earlier phase (e.g. a cursor needs to be at a particular position), provide an explicit `hide` that re-establishes the prior state:

```js
fragments: {
  'phase-2': {
    show: doMainThing,
    hide: phase1State,   // re-run when user backs out of phase-2
  },
}
```

### `RevealAnime.reversible(build)`

A `show`/`hide` pair built from two separate calls (one that tweens forward, one that snaps to a rest value) looks fine until a presenter navigates backward *while the forward tween is still playing*: the stop function pauses the live instance, then `hide` discards it and jumps straight to the rest value, so the element visibly teleports instead of reversing. `reversible()` fixes this by building the underlying animation once, lazily, and having every later call reverse or replay *that same instance* in place — never a fresh one, never a hard reset first — so an interrupt mid-flight redirects smoothly from wherever it currently sits.

```js
fragments: {
  'cursor-in': {
    show(section) {
      if (!section.__cursorFx) {
        section.__cursorFx = RevealAnime.reversible(() => anime({
          targets: cursor,
          translateX: targetX,
          translateY: targetY,
          duration: 900,
          easing: 'easeOutBack',
          autoplay: false,
        }));
      }
      return section.__cursorFx.forward();
    },
    hide(section) {
      return section.__cursorFx ? section.__cursorFx.backward() : () => {};
    },
  },
}
```

`build()` must return something exposing `.play()`, `.pause()`, and `.reverse()` — a single anime.js instance already qualifies (created with `autoplay: false` so `reversible` controls when it starts); to animate several properties as one unit, bundle them behind an object exposing those three methods (see `example/example.js`'s `rev-strike` fragment, which drives a strike-through width and a cursor drag together).

This only applies to plain property tweens. A fragment whose `show` does something irreversible by nature — typing text into `textContent`, say — needs its own reverse logic (the bundled example's `typewriter` helper has a `reverse: true` option for exactly this), not `reversible()`.

### `RevealAnime.slideCoordsOf(section, el)`

Convert an element's screen-space `getBoundingClientRect` values into RevealJS slide-internal coordinates. Useful when positioning new elements based on existing ones — RevealJS applies a CSS scale transform to the whole slide, so raw `getBoundingClientRect` is in screen pixels, not slide units.

```js
const { x, y, right, bottom, width, height } = RevealAnime.slideCoordsOf(section, target);
anime({ targets: cursor, translateX: x, translateY: y, duration: 500 });
```

### `RevealAnime.SLIDE_W`, `RevealAnime.SLIDE_H`

The internal slide dimensions (default `1280` × `720`). If you've changed `width`/`height` in your revealjs format config, these constants won't match — bypass `slideCoordsOf` and use your own scale factor.

## Example deck

`example/example.qmd` is a six-slide deck exercising the full API, and is the best place to read real choreography:

| Slide | Shows |
|---|---|
| Pulsing | An ambient `enter` loop with a clean stop path |
| Typewriter | A single gated fragment phase |
| Floating hexes | DOM created on entry, staggered entry, independent per-element loops |
| Idle terminal | A self-cancelling loop, with the caret blink left to CSS |
| Just one more feature | Text driven by a plain `{n}` object, then a deflate |
| I'll just use a for loop | Three phases with back-navigation restore |
| Reviewer 2 | `slideCoordsOf` positioning, a dragged strikethrough, a typed comment |

To render it locally, install the extension into the example directory first:

```bash
mkdir -p example/_extensions
cp -R _extensions/revealjs-anime example/_extensions/
quarto render example/example.qmd
```

The animation helpers those slides share (a typewriter, a caret cleaner, a cancellable timer bag) live in `example/example.js`, not in the extension. That split is deliberate: see below.

## What this package does not do

- It does not ship animation primitives (pulse, typewriter, etc.). Those are choreography; choreography is bespoke; you write them.
- It does not opinionate about your animation library. The runner contract is just "return a stop function."
- It does not pick your slide's DOM structure or marker convention. The only requirement is a class on the `<section>`.

## Lessons encoded

The following RevealJS-specific gotchas are handled internally:

- **`section.querySelector('.foo')` doesn't match the section itself.** Slide matching uses `classList.contains` via an internal `isSlide` helper.
- **`Reveal.on('ready', cb)` does not replay.** Listeners are registered unconditionally as soon as `Reveal` exists, so they catch all future `slidechanged` / `fragmentshown` / `fragmenthidden` events regardless of whether `ready` already passed.
- **Fragment cleanup must compose with back-navigation.** `defineSlide` tracks per-fragment cleanups so going back undoes the right phase, with an optional explicit `hide` runner to re-establish prior state.
- **RevealJS scales slides with CSS transform.** `slideCoordsOf` converts screen pixels to slide-internal coordinates so child translates land where you expect.

- **`anime.remove()` does not cancel a pending `complete` callback.** If you chain one animation off another's `complete`, guard it with a flag your stop function sets, or leaving mid-entry will start a loop on a torn-down element. (This one is on you, not the extension: it is a property of anime.js.)

## Contributing

Issues and pull requests are welcome. `.github/workflows/check.yml` syntax-checks the JavaScript and renders both the template and the example on every push and pull request; running those two renders locally is enough to reproduce CI.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT. See [LICENSE](LICENSE).
