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
  const INTEREST_LAYOUT = Object.freeze({ portraitGapRem: 0.4, minimumVisibleFraction: 0.75, roundingMargin: 1 });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const forceAnimation = document.documentElement.classList.contains("force-animation");
  const motionIsReduced = () => reducedMotion.matches && !forceAnimation;
  const field = document.querySelector(".field-drawing");
  const textContext = document.createElement("canvas").getContext("2d");
  const people = Array.from(document.querySelectorAll(".person"), (element) => ({
    element,
    portrait: element.querySelector(".portrait img"),
    portraitWindow: element.querySelector(".portrait-window"),
    interests: Array.from(element.querySelectorAll(".interest"), (word, index) => ({
      element: word,
      baseline: word.querySelector(".interest-baseline"),
      preferredPeak: Number(word.dataset.peak),
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

  const translateBox = (box, x, y) => ({
    left: box.left + x, right: box.right + x,
    top: box.top + y, bottom: box.bottom + y,
    width: box.width, height: box.height,
  });
  const overlaps = (a, b, gap) => a.left < b.right + gap && a.right > b.left - gap && a.top < b.bottom + gap && a.bottom > b.top - gap;
  const visiblePixels = (start, end, clipStart, clipEnd) => Math.max(0, Math.min(end, clipEnd) - Math.max(start, clipStart));

  function inkBounds(interest, box, style) {
    if (!textContext || !interest.baseline) return box;
    textContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    textContext.textAlign = style.direction === "rtl" ? "right" : "left";
    textContext.textBaseline = "alphabetic";
    textContext.direction = style.direction;
    for (const property of ["fontKerning", "fontStretch", "fontVariantCaps", "textRendering"]) {
      if (property in textContext) textContext[property] = style[property];
    }
    if ("letterSpacing" in textContext) textContext.letterSpacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
    if ("wordSpacing" in textContext) textContext.wordSpacing = style.wordSpacing === "normal" ? "0px" : style.wordSpacing;
    const language = interest.element.closest("[lang]")?.lang || undefined;
    let text = interest.element.textContent.trim().replace(/\s+/g, " ");
    if (style.textTransform.includes("uppercase")) text = text.toLocaleUpperCase(language);
    if (style.textTransform.includes("lowercase")) text = text.toLocaleLowerCase(language);
    const metrics = textContext.measureText(text);
    if (!Number.isFinite(metrics.actualBoundingBoxAscent) || !Number.isFinite(metrics.actualBoundingBoxDescent)) return box;
    const anchor = interest.baseline.getBoundingClientRect();
    const matchesWidth = Math.abs(metrics.width - box.width) < INTEREST_LAYOUT.roundingMargin;
    const left = matchesWidth ? anchor.left - metrics.actualBoundingBoxLeft : box.left;
    const right = matchesWidth ? anchor.left + metrics.actualBoundingBoxRight : box.right;
    const top = anchor.top + window.scrollY - metrics.actualBoundingBoxAscent;
    const bottom = anchor.top + window.scrollY + metrics.actualBoundingBoxDescent;
    return right > left && bottom > top ? { left, right, top, bottom, width: right - left, height: bottom - top } : box;
  }

  function interestPlacement(interest, person, portraits, gap) {
    const radius = MOTION.interestWindow / 2;
    const horizontalTravel = radius * MOTION.interestTravel;
    const verticalTravel = radius * MOTION.interestRise;
    const peakY = (MOTION.midpoint - interest.peak) * MOTION.interestRise;
    const swept = {
      left: interest.bounds.left - horizontalTravel,
      right: interest.bounds.right + horizontalTravel,
      top: interest.bounds.top + peakY - verticalTravel,
      bottom: interest.bounds.bottom + peakY + verticalTravel,
    };
    const framesForPeak = (peak) => [peak - radius, peak + radius].map((progress) => {
      const motionX = (progress - peak) * MOTION.interestTravel * interest.direction * interest.layoutDirection;
      const motionY = (MOTION.midpoint - progress) * MOTION.interestRise;
      const viewportTop = person.top - viewportHeight + progress * (person.height + viewportHeight);
      return {
        box: translateBox(interest.bounds, motionX, motionY),
        left: Math.max(0, person.layerBounds.left), right: Math.min(innerWidth, person.layerBounds.right),
        top: Math.max(viewportTop, person.layerBounds.top - person.wordSize),
        bottom: Math.min(viewportTop + viewportHeight, person.layerBounds.bottom + person.wordSize),
      };
    });
    const frames = framesForPeak(interest.peak);
    const fits = ({ x, y, peak = interest.peak }) => (peak === interest.peak ? frames : framesForPeak(peak)).every(({ box, left, right, top, bottom }) =>
      visiblePixels(box.left + x, box.right + x, left, right) >= Math.min(box.width, box.width * INTEREST_LAYOUT.minimumVisibleFraction + INTEREST_LAYOUT.roundingMargin)
      && visiblePixels(box.top + y, box.bottom + y, top, bottom) >= Math.min(box.height, box.height * INTEREST_LAYOUT.minimumVisibleFraction + INTEREST_LAYOUT.roundingMargin));
    if (fits({ x: 0, y: 0 }) && !portraits.some((portrait) => overlaps(swept, portrait, gap))) return { x: 0, y: 0, peak: interest.peak };

    const minimumWidth = interest.bounds.width * INTEREST_LAYOUT.minimumVisibleFraction;
    const minimumHeight = interest.bounds.height * INTEREST_LAYOUT.minimumVisibleFraction;
    const margin = INTEREST_LAYOUT.roundingMargin;
    const xs = [0, ...frames.flatMap(({ box, left, right }) => [left + minimumWidth - box.right + margin * 2, right - minimumWidth - box.left - margin * 2])];
    const ys = [0, ...frames.flatMap(({ box, top, bottom }) => [top + minimumHeight - box.bottom + margin * 2, bottom - minimumHeight - box.top - margin * 2])];
    for (const portrait of portraits) {
      xs.push(portrait.left - gap - swept.right, portrait.right + gap - swept.left);
      ys.push(portrait.top - gap - swept.bottom, portrait.bottom + gap - swept.top);
    }
    const candidates = xs.flatMap((x) => ys.map((y) => ({ x, y })))
      .filter(({ x, y }) => !portraits.some((portrait) => overlaps(translateBox(swept, x, y), portrait, gap)))
      .sort((a, b) => a.x * a.x + a.y * a.y - b.x * b.x - b.y * b.y);

    const preferred = candidates.find(fits);
    if (preferred) return { ...preferred, peak: interest.peak };

    // Preserve the clear swept box while recentering its brightness window
    const centered = candidates.map(({ x, y }) => {
      const center = (interest.bounds.top + interest.bounds.bottom) / 2 + y + peakY;
      const peak = Math.max(radius, Math.min(1 - radius, (center - person.top + viewportHeight / 2) / (person.height + viewportHeight)));
      return { x, y: y + (peak - interest.peak) * MOTION.interestRise, peak };
    }).sort((a, b) => a.x * a.x + a.y * a.y - b.x * b.x - b.y * b.y);
    return centered.find(fits) || { ...(candidates[0] || { x: 0, y: 0 }), peak: interest.peak };
  }

  function measure() {
    viewportHeight = window.innerHeight;
    pageTravel = Math.max(1, document.documentElement.scrollHeight - viewportHeight);
    people.forEach((person) => person.interests.forEach(({ element }) => {
      for (const property of ["--interest-x", "--interest-y", "--interest-clear-x", "--interest-clear-y"]) element.style.setProperty(property, "0px");
    }));
    const documentBox = (element) => {
      const bounds = element.getBoundingClientRect();
      return translateBox(bounds, 0, window.scrollY);
    };
    people.forEach((person) => {
      const bounds = documentBox(person.element);
      person.top = bounds.top;
      person.height = bounds.height;
      person.portraitBounds = documentBox(person.portraitWindow);
      const layer = person.element.querySelector(".interest-background");
      person.layerBounds = documentBox(layer);
      person.wordSize = Number.parseFloat(getComputedStyle(layer).fontSize);
      person.interests.forEach((interest) => {
        interest.peak = interest.preferredPeak;
        const style = getComputedStyle(interest.element);
        interest.bounds = inkBounds(interest, documentBox(interest.element), style);
        interest.layoutDirection = Number.parseFloat(style.getPropertyValue("--interest-direction")) || 1;
      });
    });
    if (!motionIsReduced()) {
      const portraits = people.map((person) => person.portraitBounds);
      const gap = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) * INTEREST_LAYOUT.portraitGapRem;
      people.forEach((person) => person.interests.forEach((interest) => {
        const correction = interestPlacement(interest, person, portraits, gap);
        interest.element.style.setProperty("--interest-clear-x", `${correction.x}px`);
        interest.element.style.setProperty("--interest-clear-y", `${correction.y}px`);
        interest.peak = correction.peak;
        interest.element.dataset.peak = String(correction.peak);
      }));
    }
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
  reducedMotion.addEventListener("change", scheduleMeasurement);
  document.fonts.ready.then(scheduleMeasurement);
  document.fonts.addEventListener("loadingdone", scheduleMeasurement);
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
    people.forEach((person) => {
      observer.observe(person.element);
      observer.observe(person.portraitWindow);
      person.interests.forEach(({ element }) => observer.observe(element));
    });
  }

  scheduleRender();
})();
