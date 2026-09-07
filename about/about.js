(() => {
  "use strict";

  const MOTION = Object.freeze({
    fieldTravel: 180,
    fieldRotation: 24,
    fieldDimming: 0.65,
    fieldFadeWindow: 0.65,
    portraitTravel: 26,
    interestTravel: 170,
    interestRise: 55,
    interestWindow: 0.16,
    interestRestOpacity: 0.018,
    interestPeakOpacity: 0.16,
    midpoint: 0.5,
  });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const forceAnimation = document.documentElement.classList.contains("force-animation");
  const motionIsReduced = () => reducedMotion.matches && !forceAnimation;
  const field = document.querySelector(".field-drawing");
  const people = Array.from(document.querySelectorAll(".person"), (element) => ({
    element,
    portrait: element.querySelector(".portrait img"),
    interests: Array.from(element.querySelectorAll(".interest"), (word, index) => ({
      element: word,
      peak: Number(word.dataset.peak),
      direction: index % 2 === 0 ? 1 : -1,
    })),
    link: document.querySelector(`.people-nav a[href="#${element.id}"]`),
    top: 0,
    height: 0,
  }));

  let viewportHeight = window.innerHeight;
  let pageTravel = 1;
  let frame = 0;
  let needsMeasurement = true;

  const clamp = (value) => Math.min(1, Math.max(0, value));
  const smoothstep = (value) => value * value * (3 - 2 * value);

  function measure() {
    viewportHeight = window.innerHeight;
    pageTravel = Math.max(1, document.documentElement.scrollHeight - viewportHeight);
    people.forEach((person) => {
      const bounds = person.element.getBoundingClientRect();
      person.top = bounds.top + window.scrollY;
      person.height = bounds.height;
    });
    needsMeasurement = false;
  }

  function render() {
    frame = 0;
    if (needsMeasurement) measure();

    const scroll = window.scrollY;
    const pageProgress = clamp(scroll / pageTravel);
    const center = scroll + viewportHeight * MOTION.midpoint;
    const fadeDistance = viewportHeight * MOTION.fieldFadeWindow;
    const peopleStart = people[0].top;
    const lastPerson = people[people.length - 1];
    const peopleEnd = lastPerson.top + lastPerson.height;
    const enteringPeople = clamp((scroll - peopleStart + fadeDistance) / fadeDistance);
    const leavingPeople = clamp((scroll - peopleEnd + fadeDistance) / fadeDistance);
    const fieldStrength = 1 - enteringPeople * (1 - leavingPeople) * MOTION.fieldDimming;

    field.parentElement.style.setProperty("--field-strength", fieldStrength.toFixed(3));

    if (!motionIsReduced()) {
      field.style.setProperty("--field-shift", `${-pageProgress * MOTION.fieldTravel}px`);
      field.style.setProperty("--field-turn", `${pageProgress * MOTION.fieldRotation}deg`);
    }

    people.forEach((person) => {
      const active = center >= person.top && center < person.top + person.height;
      if (active && !person.link.hasAttribute("aria-current")) {
        person.link.setAttribute("aria-current", "location");
      } else if (!active && person.link.hasAttribute("aria-current")) {
        person.link.removeAttribute("aria-current");
      }

      if (motionIsReduced()) return;
      const progress = clamp((scroll + viewportHeight - person.top) / (person.height + viewportHeight));
      if (progress <= 0 || progress >= 1) return;

      person.portrait.style.setProperty("--portrait-shift", `${(progress - MOTION.midpoint) * MOTION.portraitTravel}px`);
      person.interests.forEach((interest) => {
        const proximity = clamp(1 - Math.abs(progress - interest.peak) / MOTION.interestWindow);
        const opacity = MOTION.interestRestOpacity + smoothstep(proximity) * MOTION.interestPeakOpacity;
        interest.element.style.opacity = opacity.toFixed(3);
        interest.element.style.setProperty("--interest-x", `${(progress - interest.peak) * MOTION.interestTravel * interest.direction}px`);
        interest.element.style.setProperty("--interest-y", `${(MOTION.midpoint - progress) * MOTION.interestRise}px`);
      });
    });
  }

  function scheduleRender() {
    if (!frame && !document.hidden) frame = window.requestAnimationFrame(render);
  }

  function scheduleMeasurement() {
    needsMeasurement = true;
    scheduleRender();
  }

  window.addEventListener("scroll", scheduleRender, { passive: true });
  window.addEventListener("resize", scheduleMeasurement, { passive: true });
  window.addEventListener("pageshow", scheduleMeasurement);
  reducedMotion.addEventListener("change", scheduleRender);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    } else {
      scheduleMeasurement();
    }
  });

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(scheduleMeasurement);
    observer.observe(document.body);
  }

  scheduleRender();
})();
