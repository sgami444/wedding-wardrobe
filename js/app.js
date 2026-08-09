(function () {
  "use strict";

  const appGlobal = typeof window !== "undefined" ? window : globalThis;

  function normaliseList(value) {
    return Array.isArray(value)
      ? value.filter((item) => typeof item === "string" && item.trim())
      : [];
  }

  function normaliseImages(value, context) {
    if (!Array.isArray(value)) return [];

    return value.flatMap((image) => {
      // String paths from early versions of the guide remain supported, but
      // object entries are preferred because they carry meaningful alt text.
      if (typeof image === "string" && image.trim()) {
        return [{ src: image.trim(), alt: `${context} outfit inspiration` }];
      }

      if (!image || typeof image !== "object" || typeof image.src !== "string") {
        return [];
      }

      const src = image.src.trim();
      if (!src) return [];

      const alt =
        typeof image.alt === "string" && image.alt.trim()
          ? image.alt.trim()
          : `${context} outfit inspiration`;

      return [{ src, alt }];
    });
  }

  function routeKeyFromPath(pathname) {
    const segments = String(pathname || "")
      .split("/")
      .filter(Boolean)
      .map((segment) => {
        try {
          return decodeURIComponent(segment);
        } catch (_error) {
          return segment;
        }
      });

    let routeKey = segments.pop() || "";
    if (/^index\.html?$/i.test(routeKey)) routeKey = segments.pop() || "";
    return routeKey.toLowerCase();
  }

  function resolveRouteView(value, pathname) {
    const source = value && typeof value === "object" ? value : {};
    const routes = source.routes && typeof source.routes === "object"
      ? source.routes
      : {};
    const candidateKey = routeKeyFromPath(pathname);
    const route =
      routes[candidateKey] && typeof routes[candidateKey] === "object"
        ? routes[candidateKey]
        : null;
    const excludedEventIds = new Set(
      normaliseList(route?.excludeEvents)
        .map((eventId) => safeId(eventId, ""))
        .filter(Boolean)
    );
    const site = {
      ...(source.site && typeof source.site === "object" ? source.site : {}),
      ...(route?.site && typeof route.site === "object" ? route.site : {})
    };
    const events = Array.isArray(source.events)
      ? source.events.filter((event) => {
          const eventId = safeId(event?.id, "");
          return !eventId || !excludedEventIds.has(eventId);
        })
      : [];

    return {
      key: route ? candidateKey : "",
      site,
      events
    };
  }

  function eventCountLabel(value) {
    const count = Number.isInteger(value) && value >= 0 ? value : 0;
    const words = [
      "No",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten"
    ];
    const countCopy = words[count] || String(count);
    return `${countCopy} ${count === 1 ? "celebration" : "celebrations"}`;
  }

  // Exposing these pure helpers keeps the data contract and audience routes
  // easy to verify without coupling the renderer to a particular test framework.
  appGlobal.WardrobeApp = Object.freeze({
    normaliseList,
    normaliseImages,
    routeKeyFromPath,
    resolveRouteView,
    eventCountLabel
  });

  if (typeof document === "undefined") return;

  const config = appGlobal.WEDDING_WARDROBE;
  const eventsRoot = document.querySelector("[data-events-root]");
  const navRoot = document.querySelector("[data-event-nav]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const lightbox = document.querySelector("[data-lightbox]");
  const lightboxImage = document.querySelector("[data-lightbox-image]");
  const lightboxCaption = document.querySelector("[data-lightbox-caption]");
  const lightboxCounter = document.querySelector("[data-lightbox-counter]");
  const lightboxPrevious = document.querySelector("[data-lightbox-previous]");
  const lightboxNext = document.querySelector("[data-lightbox-next]");
  const lightboxClose = document.querySelector("[data-lightbox-close]");

  let lightboxState = null;
  let touchStartX = null;

  const icons = {
    hanger:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5.5a2 2 0 1 1 2 2v2M12 9.5 3.5 16a1.5 1.5 0 0 0 .9 2.7h15.2a1.5 1.5 0 0 0 .9-2.7L12 9.5Z"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    gallery:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="m5.5 17 4.3-4.5 3.2 3 2.3-2.3 3.2 3.3M15.8 9h.01"/></svg>',
    avoid:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>',
    placeholder:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5.5a2 2 0 1 1 2 2v2M12 9.5 3.5 16a1.5 1.5 0 0 0 .9 2.7h15.2a1.5 1.5 0 0 0 .9-2.7L12 9.5Z"/><path d="M7 21h10"/></svg>'
  };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function safeId(value, fallback) {
    const id = String(value || fallback)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return id || fallback;
  }

  function dateTimeValue(dateLabel) {
    const parsed = new Date(dateLabel);
    if (Number.isNaN(parsed.getTime())) return "";

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node && typeof value === "string") node.textContent = value;
  }

  function renderSiteCopy(site, eventCount) {
    const copy = site && typeof site === "object" ? site : {};

    setText("[data-site-kicker]", copy.kicker);
    setText("[data-site-intro]", copy.intro);
    setText("[data-site-note]", copy.note);
    setText("[data-events-kicker]", eventCountLabel(eventCount));
    setText("[data-footer-names]", copy.footerNames);
    setText("[data-footer-dates]", copy.footerDates);
    setText("[data-footer-message]", copy.footerMessage);

    const canonical = document.querySelector("[data-site-canonical]");
    if (
      canonical &&
      typeof copy.canonicalUrl === "string" &&
      copy.canonicalUrl.trim()
    ) {
      canonical.href = copy.canonicalUrl.trim();
    }

    const title = document.querySelector("[data-site-title]");
    if (title && (copy.titleLead || copy.title || copy.titleScript)) {
      const titleParts = [
        ["hero__title-lead", copy.titleLead],
        ["hero__title-main", copy.title],
        ["hero__title-script", copy.titleScript]
      ]
        .filter(([, copy]) => typeof copy === "string" && copy.trim())
        .map(([className, copy]) => element("span", className, copy));

      title.replaceChildren(...titleParts);
    }

    const documentTitle = [copy.titleLead, copy.title, copy.titleScript]
      .filter((copy) => typeof copy === "string" && copy.trim())
      .join(" ");

    if (documentTitle) document.title = documentTitle;
  }

  function createPlaceholder(context) {
    const placeholder = element("div", "gallery-placeholder");
    placeholder.setAttribute("role", "status");
    placeholder.setAttribute("aria-live", "polite");
    placeholder.innerHTML = icons.placeholder;

    const copy = element("span", "", "Outfit inspiration coming soon");
    const detail = element(
      "small",
      "",
      `Photos for ${context} will appear here once added`
    );
    placeholder.append(copy, detail);
    return placeholder;
  }

  function ensureGalleryPlaceholder(group) {
    if (group.images.length || group.placeholder) return;
    group.placeholder = createPlaceholder(group.context);
    group.element.replaceChildren(group.placeholder);
  }

  function removeGalleryImage(group, image) {
    const removedIndex = group.images.indexOf(image);
    if (removedIndex === -1) return;

    group.images.splice(removedIndex, 1);
    const card = group.cards.get(image);
    if (card) card.remove();
    group.cards.delete(image);

    if (lightboxState && lightboxState.group === group) {
      const wasCurrent = lightboxState.currentImage === image;

      if (!group.images.length) {
        closeLightbox();
      } else if (wasCurrent) {
        lightboxState.index = Math.min(removedIndex, group.images.length - 1);
        updateLightbox();
      } else {
        if (removedIndex < lightboxState.index) lightboxState.index -= 1;
        updateLightboxControls();
      }
    }

    ensureGalleryPlaceholder(group);
  }

  function renderGallery(images, context) {
    const gallery = element("div", "outfit-gallery");
    gallery.setAttribute("aria-label", `${context} outfit inspiration`);

    // This group is built solely from `images`. It never reads or infers from
    // `recommended` or `avoid`, so gallery count and order remain independent.
    const group = {
      context,
      element: gallery,
      images: normaliseImages(images, context),
      cards: new Map(),
      placeholder: null
    };

    group.images.slice().forEach((image) => {
      const card = element("button", "inspiration-card");
      card.type = "button";
      card.setAttribute("aria-label", `Open larger image: ${image.alt}`);

      const img = document.createElement("img");
      img.alt = image.alt;
      img.width = 640;
      img.height = 800;
      img.loading = "lazy";
      img.decoding = "async";

      card.append(img);
      group.cards.set(image, card);
      gallery.append(card);

      card.addEventListener("click", () => {
        const index = group.images.indexOf(image);
        if (index >= 0) openLightbox(group, index, card);
      });

      img.addEventListener("error", () => removeGalleryImage(group, image), {
        once: true
      });
      img.src = image.src;
    });

    ensureGalleryPlaceholder(group);
    return gallery;
  }

  function renderAvoidList(items) {
    if (!items.length) return null;

    const panel = element("aside", "avoid-panel");
    const title = element("p", "avoid-panel__title");
    title.innerHTML = `${icons.avoid}<span>Please avoid</span>`;

    const list = element("ul", "avoid-list");
    items.forEach((item) => list.append(element("li", "", item)));
    panel.append(title, list);
    return panel;
  }

  function renderAttire(event, groupKey, groupLabel, sectionId) {
    const data = event[groupKey] && typeof event[groupKey] === "object"
      ? event[groupKey]
      : {};
    const recommended = normaliseList(data.recommended);
    const avoid = normaliseList(data.avoid);
    const context = `${event.name || "Event"} ${groupLabel.toLowerCase()}`;

    const card = element("section", "attire-card");
    const headingId = `${sectionId}-${groupKey}`;
    card.setAttribute("aria-labelledby", headingId);

    const header = element("div", "attire-card__header");
    const icon = element("span", "attire-card__icon");
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = icons.hanger;

    const headingCopy = element("div");
    headingCopy.append(
      element("p", "attire-card__overline", "Wardrobe guide"),
      element("h3", "", groupLabel)
    );
    headingCopy.querySelector("h3").id = headingId;
    header.append(icon, headingCopy);
    card.append(header);

    if (recommended.length) {
      const guidance = element("div", "guidance-block");
      const title = element("p", "guidance-title");
      title.innerHTML = `${icons.check}<span>Recommended</span>`;
      const list = element("ul", "suggestion-list");

      // Dress-code copy has its own rendering loop.
      recommended.forEach((item) => list.append(element("li", "", item)));
      guidance.append(title, list);
      card.append(guidance);
    }

    const galleryBlock = element("div", "gallery-block");
    const galleryTitle = element("p", "gallery-title");
    galleryTitle.innerHTML = `${icons.gallery}<span>Outfit inspiration</span>`;

    // The gallery receives only the image collection, never recommendations.
    galleryBlock.append(galleryTitle, renderGallery(data.images, context));
    card.append(galleryBlock);

    const avoidPanel = renderAvoidList(avoid);
    if (avoidPanel) card.append(avoidPanel);

    return card;
  }

  function renderEvent(event, index) {
    const eventId = safeId(event.id, `event-${index + 1}`);
    const sectionId = `event-${eventId}`;
    const article = element("article", "event-card");
    article.id = sectionId;
    article.dataset.eventId = eventId;
    article.dataset.theme = safeId(event.theme, "sacred");
    article.setAttribute("aria-labelledby", `${sectionId}-title`);

    const header = element("header", "event-card__header");

    const dateLine = element("p", "event-card__date");
    if (event.date) {
      const time = element("time", "", event.date);
      const machineDate = dateTimeValue(event.date);
      if (machineDate) time.dateTime = machineDate;
      dateLine.append(time);
    }
    if (event.time) dateLine.append(element("span", "event-card__time", event.time));

    const title = element("h2", "", event.name || `Event ${index + 1}`);
    title.id = `${sectionId}-title`;
    header.append(dateLine, title);

    if (event.tagline) {
      header.append(element("p", "event-card__tagline", event.tagline));
    }
    if (event.description) {
      header.append(element("p", "event-card__description", event.description));
    }

    const attireGrid = element("div", "attire-grid");
    attireGrid.append(
      renderAttire(event, "women", "Women", sectionId),
      renderAttire(event, "men", "Men", sectionId)
    );

    article.append(header, attireGrid);
    return { article, eventId, sectionId };
  }

  function renderNavigation(renderedEvents) {
    navRoot.replaceChildren();

    renderedEvents.forEach(({ event, eventId, sectionId }, index) => {
      const link = element("a", "event-nav__link", event.name || `Event ${index + 1}`);
      link.href = `#${sectionId}`;
      link.dataset.navEvent = eventId;
      if (index === 0) {
        link.classList.add("is-active");
        link.setAttribute("aria-current", "true");
      }
      navRoot.append(link);
    });
  }

  function setActiveNavigation(eventId) {
    const links = navRoot.querySelectorAll("[data-nav-event]");
    links.forEach((link) => {
      const active = link.dataset.navEvent === eventId;
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "true");
        const targetLeft =
          link.offsetLeft + link.offsetWidth / 2 - navRoot.clientWidth / 2;
        navRoot.scrollTo({
          left: Math.max(0, targetLeft),
          behavior: reducedMotion.matches ? "auto" : "smooth",
        });
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function initialiseObservers(articles) {
    if (!("IntersectionObserver" in window) || reducedMotion.matches) {
      articles.forEach((article) => article.classList.add("is-visible"));
    } else {
      document.documentElement.classList.add("reveal-ready");
      const revealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -8%", threshold: 0.08 }
      );
      articles.forEach((article) => revealObserver.observe(article));
    }

    if (!("IntersectionObserver" in window)) return;
    const navigationObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveNavigation(visible.target.dataset.eventId);
      },
      { rootMargin: "-28% 0px -58%", threshold: [0, 0.08, 0.2] }
    );
    articles.forEach((article) => navigationObserver.observe(article));
  }

  function isLightboxOpen() {
    return Boolean(lightboxState);
  }

  function openLightbox(group, index, trigger) {
    if (!group.images.length || !lightbox) return;

    lightboxState = {
      group,
      index,
      currentImage: group.images[index],
      trigger
    };
    updateLightbox();

    if (typeof lightbox.showModal === "function") {
      if (!lightbox.open) lightbox.showModal();
    } else {
      lightbox.setAttribute("open", "");
    }

    document.body.classList.add("is-lightbox-open");
    lightboxClose.focus();
  }

  function updateLightboxControls() {
    if (!lightboxState) return;
    const total = lightboxState.group.images.length;
    lightboxCounter.textContent = total
      ? `${lightboxState.index + 1} / ${total}`
      : "";
    lightboxPrevious.disabled = total <= 1;
    lightboxNext.disabled = total <= 1;
  }

  function updateLightbox() {
    if (!lightboxState) return;
    const images = lightboxState.group.images;
    if (!images.length) {
      closeLightbox();
      return;
    }

    lightboxState.index = ((lightboxState.index % images.length) + images.length) % images.length;
    const image = images[lightboxState.index];
    lightboxState.currentImage = image;
    lightboxImage.dataset.gallerySrc = image.src;
    lightboxImage.alt = image.alt;
    lightboxImage.src = image.src;
    lightboxCaption.textContent = image.alt;
    updateLightboxControls();
  }

  function moveLightbox(direction) {
    if (!lightboxState || lightboxState.group.images.length <= 1) return;
    lightboxState.index += direction;
    updateLightbox();
  }

  function closeLightbox() {
    if (!lightboxState) return;
    const trigger = lightboxState.trigger;
    lightboxState = null;
    document.body.classList.remove("is-lightbox-open");
    lightboxImage.removeAttribute("src");
    lightboxImage.removeAttribute("data-gallery-src");

    if (typeof lightbox.close === "function" && lightbox.open) {
      lightbox.close();
    } else {
      lightbox.removeAttribute("open");
    }

    if (trigger && trigger.isConnected) trigger.focus();
  }

  function initialiseLightbox() {
    lightboxClose.addEventListener("click", closeLightbox);
    lightboxPrevious.addEventListener("click", () => moveLightbox(-1));
    lightboxNext.addEventListener("click", () => moveLightbox(1));

    lightboxImage.addEventListener("error", () => {
      if (!lightboxState) return;
      const failedImage = lightboxState.currentImage;
      if (!failedImage || lightboxImage.dataset.gallerySrc !== failedImage.src) return;
      removeGalleryImage(lightboxState.group, failedImage);
    });

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });

    lightbox.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeLightbox();
    });

    document.addEventListener("keydown", (event) => {
      if (!isLightboxOpen()) return;
      if (event.key === "ArrowLeft") moveLightbox(-1);
      if (event.key === "ArrowRight") moveLightbox(1);
    });

    lightbox.addEventListener(
      "touchstart",
      (event) => {
        touchStartX = event.changedTouches[0]?.clientX ?? null;
      },
      { passive: true }
    );
    lightbox.addEventListener(
      "touchend",
      (event) => {
        if (touchStartX === null) return;
        const touchEndX = event.changedTouches[0]?.clientX;
        if (typeof touchEndX !== "number") return;
        const distance = touchEndX - touchStartX;
        touchStartX = null;
        if (Math.abs(distance) < 48) return;
        moveLightbox(distance > 0 ? -1 : 1);
      },
      { passive: true }
    );
  }

  function showConfigurationError(message) {
    if (!eventsRoot) return;
    const error = element("p", "empty-state", message);
    eventsRoot.replaceChildren(error);
  }

  function honourInitialHash() {
    if (!window.location.hash) return;

    let targetId;
    try {
      targetId = decodeURIComponent(window.location.hash.slice(1));
    } catch (_error) {
      return;
    }

    const target = document.getElementById(targetId);
    if (!target) return;

    // Jump immediately for an initial fragment. A smooth trip through several
    // lazy galleries can otherwise overshoot if missing images collapse into
    // fallbacks while the animation is still calculating its destination.
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    target.scrollIntoView({ block: "start", behavior: "auto" });
    requestAnimationFrame(() => {
      root.style.scrollBehavior = previousScrollBehavior;
    });
  }

  function initialise() {
    if (!eventsRoot || !navRoot) return;
    if (!config || !Array.isArray(config.events)) {
      showConfigurationError(
        "The wardrobe guide could not be loaded. Please check js/events.js."
      );
      return;
    }

    const routeView = resolveRouteView(config, window.location.pathname);
    document.documentElement.dataset.guideRoute = routeView.key || "all";

    renderSiteCopy(routeView.site, routeView.events.length);
    eventsRoot.replaceChildren();

    if (!routeView.events.length) {
      showConfigurationError("Wardrobe details are coming soon.");
      return;
    }

    const renderedEvents = routeView.events.map((event, index) => {
      const rendered = renderEvent(event, index);
      eventsRoot.append(rendered.article);
      return { ...rendered, event };
    });

    renderNavigation(renderedEvents);
    initialiseLightbox();
    requestAnimationFrame(() => {
      initialiseObservers(renderedEvents.map(({ article }) => article));
      honourInitialHash();
    });
  }

  initialise();
})();
