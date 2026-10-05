# Changelog

All notable changes to this extension are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0]

### Added

- `RevealAnime.reversible(build)`: wraps the "timeline library" stop-and-retarget pattern for anime.js. Builds an animation instance once, lazily, and has every later `forward()`/`backward()` call reverse or replay that same instance in place, so interrupting a fragment's animation mid-flight redirects smoothly from its live position instead of finishing or snapping to a fixed rest value.
- `RevealAnime.unstickAfterReverse(instance)`: a small counter-fix for an anime.js quirk where `.reverse()` marks an instance `completed` the moment it flips back to the forward direction, causing the next `.play()` to reset it to time 0 instead of continuing. `reversible()` applies this internally; exported so a combined play/pause/reverse wrapper over several instances can apply it to each one.

### Fixed

- The example deck's "Reviewer 2", "Typewriter", and "Just one more feature" slides previously snapped to a fixed rest state when a fragment's animation was interrupted mid-flight by back-navigation (or a subsequent redo). All three now retarget from the live position via `reversible()` (or, for the typewriter, a freshly measured live typed length).

## [0.1.0]

Initial release.

### Added

- `RevealAnime.defineSlide(slideClass, hooks)`: binds `enter` / `leave` runners and per-fragment `show` / `hide` runners to a slide, tracking each returned stop function and calling it on slide leave, fragment hide, and fragment re-show.
- `RevealAnime.slideCoordsOf(section, el)`: converts screen-space `getBoundingClientRect` values into RevealJS slide-internal coordinates.
- `RevealAnime.SLIDE_W` / `RevealAnime.SLIDE_H`: the internal slide dimensions.
- A structural stylesheet providing `.invisible-fragment`, for fragments that exist only to gate an animation phase.
- A starter template (`quarto use template`) and a six-slide example deck covering ambient loops and multi-phase punchlines.
