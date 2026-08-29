# Changelog

All notable changes to this extension are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0]

Initial release.

### Added

- `RevealAnime.defineSlide(slideClass, hooks)`: binds `enter` / `leave` runners and per-fragment `show` / `hide` runners to a slide, tracking each returned stop function and calling it on slide leave, fragment hide, and fragment re-show.
- `RevealAnime.slideCoordsOf(section, el)`: converts screen-space `getBoundingClientRect` values into RevealJS slide-internal coordinates.
- `RevealAnime.SLIDE_W` / `RevealAnime.SLIDE_H`: the internal slide dimensions.
- A structural stylesheet providing `.invisible-fragment`, for fragments that exist only to gate an animation phase.
- A starter template (`quarto use template`) and a six-slide example deck covering ambient loops and multi-phase punchlines.
