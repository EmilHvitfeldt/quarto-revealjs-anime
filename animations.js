// Animations for the starter deck. Each defineSlide runner returns a stop
// function; revealjs-anime calls it for you on slide leave, on fragment
// hide, and when the same fragment is shown again.

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

RevealAnime.defineSlide('typewriter-slide', {
  fragments: {
    'tw-go'(section) {
      const el = section.querySelector('#tw');
      if (!el) return () => {};
      const text = 'Hello from revealjs-anime!';
      const state = { n: 0 };
      const inst = anime({
        targets: state,
        n: text.length,
        duration: text.length * 70,
        easing: 'linear',
        update: () => {
          el.textContent = text.slice(0, Math.round(state.n)) + '|';
        },
        complete: () => { el.textContent = text; },
      });
      return () => {
        inst.pause();
        el.textContent = '';
      };
    },
  },
});
