(function () {
  "use strict";

  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const dialog = document.querySelector("[data-invitation]");
  const siteShell = document.querySelector("[data-site-shell]");
  const openButton = document.querySelector("[data-invitation-open]");
  const skipButton = document.querySelector("[data-invitation-skip]");
  const replayButton = document.querySelector("[data-invitation-replay]");
  const heroTitle = document.querySelector("[data-site-title]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const storageKey = "samarstory:kankotri:v2";
  const openingDuration = 3700;

  if (!dialog || !siteShell || !openButton || !skipButton) return;

  let state = "opened";
  let completionTimer = null;

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

  function focusHero() {
    if (!heroTitle) return;
    try {
      heroTitle.focus({ preventScroll: true });
    } catch (_error) {
      heroTitle.focus();
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

  function finishOpening({ focus = true } = {}) {
    if (completionTimer) {
      window.clearTimeout(completionTimer);
      completionTimer = null;
    }

    rememberOpenedState();
    setState("opened");
    document.body.classList.remove("is-invitation-open");
    siteShell.inert = false;
    openButton.disabled = false;
    skipButton.disabled = false;
    closeDialog();
    if (focus) focusHero();
  }

  function beginOpening() {
    if (state !== "closed") return;

    openButton.disabled = true;
    setState("opening");
    rememberOpenedState();

    if (reducedMotion.matches) {
      requestAnimationFrame(() => finishOpening());
      return;
    }

    completionTimer = window.setTimeout(() => finishOpening(), openingDuration);
  }

  function skipOpening() {
    if (state === "opened") return;
    finishOpening();
  }

  function showInvitation({ replay = false } = {}) {
    if (completionTimer) {
      window.clearTimeout(completionTimer);
      completionTimer = null;
    }

    if (replay) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    dialog.hidden = false;
    siteShell.inert = true;
    document.body.classList.add("is-invitation-open");
    setState("closed");
    openButton.disabled = false;
    skipButton.disabled = false;

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

    requestAnimationFrame(() => openButton.focus());
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
  skipButton.addEventListener("click", skipOpening);
  replayButton?.addEventListener("click", () => showInvitation({ replay: true }));

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    skipOpening();
  });

  dialog.addEventListener("animationend", (event) => {
    if (
      state === "opening" &&
      event.target === dialog &&
      event.animationName === "invitation-reveal-hero"
    ) {
      finishOpening();
    }
  });

  reducedMotion.addEventListener?.("change", (event) => {
    if (event.matches && state === "opening") finishOpening();
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
