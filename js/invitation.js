(function () {
  "use strict";

  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const dialog = document.querySelector("[data-invitation]");
  const siteShell = document.querySelector("[data-site-shell]");
  const openButton = document.querySelector("[data-invitation-open]");
  const replayButton = document.querySelector("[data-invitation-replay]");
  const invitationTitle = document.querySelector("#invitation-title");
  const heroTitle = document.querySelector("[data-site-title]");
  const kankotri = document.querySelector("[data-kankotri]");
  const envelopeBack = kankotri?.querySelector(".kankotri__back");
  const invitationCard = kankotri?.querySelector(".kankotri__card");
  const cardContents = invitationCard ? Array.from(invitationCard.children) : [];
  const envelopeFlap = kankotri?.querySelector(".kankotri__flap");
  const envelopePocket = kankotri?.querySelector(".kankotri__pocket");
  const invitationHint = dialog?.querySelector(".invitation__hint");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const storageKey = "samarstory:kankotri:v2";
  const timelineDuration = 3700;

  if (!dialog || !siteShell || !openButton || !kankotri) return;

  const cssControlledElements = [
    dialog,
    kankotri,
    envelopeBack,
    invitationCard,
    envelopeFlap,
    envelopePocket,
    openButton,
    invitationHint,
    ...cardContents
  ].filter(Boolean);

  const supportsWebAnimations =
    typeof Element !== "undefined" && typeof Element.prototype.animate === "function";

  let state = "opened";
  let activeTimeline = null;
  let inlineStyleSnapshot = null;

  function readSeenState() {
    try {
      return window.sessionStorage.getItem(storageKey) === "opened";
    } catch (_error) {
      return false;
    }
  }

  function rememberOpenedState() {
    try {
      window.sessionStorage.setItem(storageKey, "opened");
    } catch (_error) {
      // The invitation still works when storage is unavailable or blocked.
    }
  }

  function setState(nextState) {
    state = nextState;
    root.dataset.invitationState = nextState;
    document.dispatchEvent(
      new CustomEvent("wardrobe:invitation-state", { detail: { state: nextState } })
    );
  }

  function focusElement(element) {
    if (!element) return;

    try {
      element.focus({ preventScroll: true });
    } catch (_error) {
      element.focus();
    }
  }

  function closeDialog() {
    if (typeof dialog.close === "function" && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }

    dialog.hidden = true;
  }

  function snapshotInlineAnimationStyles() {
    if (inlineStyleSnapshot) return;

    inlineStyleSnapshot = new Map(
      cssControlledElements.map((element) => [
        element,
        {
          animation: element.style.animation,
          animationPlayState: element.style.animationPlayState
        }
      ])
    );
  }

  function suppressCssTimeline() {
    snapshotInlineAnimationStyles();
    cssControlledElements.forEach((element) => {
      element.style.animation = "none";
    });
  }

  function setFallbackPlayState(playState) {
    snapshotInlineAnimationStyles();
    cssControlledElements.forEach((element) => {
      element.style.animationPlayState = playState;
    });
  }

  function restoreInlineAnimationStyles() {
    if (!inlineStyleSnapshot) return;

    inlineStyleSnapshot.forEach((styles, element) => {
      element.style.animation = styles.animation;
      element.style.animationPlayState = styles.animationPlayState;
    });
    inlineStyleSnapshot = null;
  }

  function stopActiveTimeline({ restoreStyles = true } = {}) {
    if (activeTimeline) {
      activeTimeline.cancel();
      activeTimeline = null;
    }

    if (restoreStyles) restoreInlineAnimationStyles();
  }

  function finishOpening({ focus = true } = {}) {
    if (state === "opened") return;

    // Hide first so cancelling filled animations cannot flash the closed envelope.
    closeDialog();
    stopActiveTimeline({ restoreStyles: false });
    setState("opened");
    restoreInlineAnimationStyles();

    rememberOpenedState();
    dialog.removeAttribute("aria-busy");
    document.body.classList.remove("is-invitation-open");
    siteShell.inert = false;
    openButton.disabled = false;

    if (focus) focusElement(heroTitle);
  }

  function createFallbackTimeline() {
    let timer = null;
    let startedAt = performance.now();
    let remaining = timelineDuration;
    let paused = false;
    let cancelled = false;

    function schedule() {
      startedAt = performance.now();
      timer = window.setTimeout(() => {
        timer = null;
        if (!cancelled && state === "opening") finishOpening();
      }, remaining);
    }

    function pause() {
      if (paused || cancelled) return;
      paused = true;
      remaining = Math.max(0, remaining - (performance.now() - startedAt));
      if (timer) window.clearTimeout(timer);
      timer = null;
      setFallbackPlayState("paused");
    }

    function play() {
      if (!paused || cancelled) return;
      paused = false;
      setFallbackPlayState("running");
      schedule();
    }

    function cancel() {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      timer = null;
    }

    schedule();
    return { cancel, pause, play };
  }

  function createInstantTimeline() {
    let frame = requestAnimationFrame(() => {
      frame = null;
      if (state === "opening") finishOpening();
    });

    return {
      cancel() {
        if (frame != null) cancelAnimationFrame(frame);
        frame = null;
      },
      pause() {},
      play() {}
    };
  }

  function createWaapiTimeline() {
    const animations = [];

    function add(element, keyframes, timing) {
      if (!element) return null;

      const animation = element.animate(keyframes, {
        fill: "both",
        ...timing
      });
      animations.push(animation);
      return animation;
    }

    add(
      openButton,
      [
        { opacity: 1, transform: "translate(-50%, -50%) scale(1) rotate(0deg)" },
        {
          opacity: 1,
          offset: 0.42,
          transform: "translate(-50%, -56%) scale(1.09) rotate(-4deg)"
        },
        { opacity: 0, transform: "translate(-50%, -68%) scale(0.68) rotate(9deg)" }
      ],
      { duration: 480, easing: "cubic-bezier(0.22, 0.72, 0.2, 1)" }
    );

    add(
      invitationHint,
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(0.35rem)" }
      ],
      { duration: 240, easing: "ease-out" }
    );

    add(
      envelopeFlap,
      [
        { zIndex: 5, transform: "rotateX(0deg)" },
        { zIndex: 5, offset: 0.48, transform: "rotateX(88deg)" },
        { zIndex: 1, offset: 0.5, transform: "rotateX(94deg)" },
        { zIndex: 1, transform: "rotateX(178deg)" }
      ],
      {
        delay: 150,
        duration: 940,
        easing: "cubic-bezier(0.18, 0.74, 0.18, 1)"
      }
    );

    add(
      invitationCard,
      [
        { opacity: 1, transform: "translateY(0) scale(0.92)" },
        {
          opacity: 1,
          offset: 0.68,
          transform: "translateY(-49%) scale(1.005)"
        },
        {
          opacity: 1,
          offset: 0.84,
          transform: "translateY(-44%) scale(0.985)"
        },
        { opacity: 1, transform: "translateY(-46%) scale(0.995)" }
      ],
      {
        delay: 610,
        duration: 1570,
        easing: "cubic-bezier(0.16, 0.76, 0.18, 1)"
      }
    );

    cardContents.forEach((element, index) => {
      add(
        element,
        [
          { opacity: 0, transform: "translateY(0.4rem)" },
          { opacity: 1, transform: "translateY(0)" }
        ],
        {
          delay: 800 + index * 65,
          duration: 480,
          easing: "cubic-bezier(0.2, 0.72, 0.2, 1)"
        }
      );
    });

    [envelopeBack, envelopePocket].forEach((element) => {
      add(
        element,
        [
          { opacity: 1, transform: "translateY(0) scale(1)" },
          { opacity: 0.14, transform: "translateY(24%) scale(0.92)" }
        ],
        {
          delay: 1430,
          duration: 1120,
          easing: "cubic-bezier(0.22, 0.65, 0.28, 1)"
        }
      );
    });

    add(
      kankotri,
      [
        { opacity: 1, transform: "translateY(0) scale(1)" },
        { opacity: 0, transform: "translateY(-2.5vh) scale(1.018)" }
      ],
      {
        delay: 2880,
        duration: 700,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)"
      }
    );

    add(
      siteShell,
      [
        { opacity: 0.9, transform: "scale(1.008)" },
        { opacity: 1, transform: "scale(1)" }
      ],
      {
        delay: 2950,
        duration: 750,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)"
      }
    );

    const master = add(
      dialog,
      [
        { opacity: 1 },
        { opacity: 0 }
      ],
      {
        delay: 3000,
        duration: 700,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)"
      }
    );

    // Give every effect the same document-timeline origin instead of relying on
    // the tiny differences between successive animate() calls.
    const sharedStartTime = document.timeline?.currentTime;
    if (sharedStartTime != null) {
      animations.forEach((animation) => {
        try {
          animation.startTime = sharedStartTime;
        } catch (_error) {
          // Browsers that reject a manual startTime still start them in one frame.
        }
      });
    }

    let cancelled = false;
    const controller = {
      cancel() {
        cancelled = true;
        animations.forEach((animation) => animation.cancel());
      },
      pause() {
        animations.forEach((animation) => {
          if (animation.playState === "running" || animation.playState === "pending") {
            animation.pause();
          }
        });
      },
      play() {
        animations.forEach((animation) => {
          if (animation.playState === "paused") animation.play();
        });
      }
    };

    master?.finished
      .then(() => {
        if (!cancelled && state === "opening") finishOpening();
      })
      .catch(() => {
        // Cancellation is expected when the user skips or replays the sequence.
      });

    return controller;
  }

  function beginOpening() {
    if (state !== "closed") return;

    openButton.disabled = true;
    dialog.setAttribute("aria-busy", "true");
    rememberOpenedState();

    // Keep focus inside the modal while its only visible control animates away.
    focusElement(invitationTitle || dialog);

    if (reducedMotion.matches) {
      setState("opening");
      activeTimeline = createInstantTimeline();
      return;
    }

    if (supportsWebAnimations) {
      suppressCssTimeline();
      setState("opening");

      try {
        activeTimeline = createWaapiTimeline();
      } catch (_error) {
        // Restore the CSS sequence as a resilient fallback if WAAPI construction fails.
        [...cssControlledElements, siteShell].forEach((element) => {
          element.getAnimations?.().forEach((animation) => animation.cancel());
        });
        restoreInlineAnimationStyles();
        activeTimeline = createFallbackTimeline();
      }
    } else {
      setState("opening");
      activeTimeline = createFallbackTimeline();
    }

    if (document.hidden) activeTimeline?.pause();
  }

  function skipOpening() {
    if (state === "opened") return;
    finishOpening();
  }

  function showInvitation({ replay = false } = {}) {
    // Return to the closed state before restoring CSS animation declarations, so
    // an interrupted opening cannot restart for a frame during Replay.
    stopActiveTimeline({ restoreStyles: false });
    setState("closed");
    restoreInlineAnimationStyles();

    if (replay) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    dialog.hidden = false;
    dialog.removeAttribute("aria-busy");
    siteShell.inert = true;
    document.body.classList.add("is-invitation-open");
    openButton.disabled = false;

    if (typeof dialog.showModal === "function") {
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch (_error) {
          dialog.setAttribute("open", "");
        }
      }
    } else {
      dialog.setAttribute("open", "");
    }

    requestAnimationFrame(() => focusElement(openButton));
  }

  function isValidDirectHash() {
    if (!window.location.hash) return false;

    let targetId;
    try {
      targetId = decodeURIComponent(window.location.hash.slice(1));
    } catch (_error) {
      return false;
    }

    if (["top", "events", "event-navigation"].includes(targetId)) return true;
    if (!targetId.startsWith("event-")) return false;

    const eventId = targetId.slice("event-".length);
    const events = window.WEDDING_WARDROBE?.events;
    if (!Array.isArray(events) || !events.some((event) => event?.id === eventId)) {
      return false;
    }

    const route = window.location.pathname
      .replace(/\/index\.html$/i, "")
      .replace(/\/+$/, "")
      .split("/")
      .filter(Boolean)
      .at(-1);

    if (route === "wardrobe" && eventId === "sagai") return false;
    if (route === "attire" && eventId === "carnival") return false;
    return true;
  }

  function shouldBypassOpening() {
    return isValidDirectHash() || readSeenState();
  }

  openButton.addEventListener("click", beginOpening);
  replayButton?.addEventListener("click", () => showInvitation({ replay: true }));

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    skipOpening();
  });

  document.addEventListener("visibilitychange", () => {
    if (state !== "opening" || !activeTimeline) return;
    if (document.hidden) activeTimeline.pause();
    else activeTimeline.play();
  });

  reducedMotion.addEventListener?.("change", (event) => {
    if (event.matches && state === "opening") finishOpening();
  });

  window.addEventListener("pagehide", () => {
    if (state === "opening") finishOpening({ focus: false });
  });

  if (replayButton) replayButton.hidden = false;

  if (shouldBypassOpening()) {
    rememberOpenedState();
    setState("opened");
    dialog.hidden = true;
  } else {
    requestAnimationFrame(() => showInvitation());
  }

  window.WardrobeInvitation = Object.freeze({
    open: beginOpening,
    skip: skipOpening,
    replay: () => showInvitation({ replay: true }),
    getState: () => state,
    storageKey
  });
})();
