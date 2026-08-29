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

      return {
        ...image,
        src,
        alt
      };
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

  function safeId(value, fallback) {
    const id = String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return id || fallback;
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
  const progressBar = document.querySelector("[data-event-progress]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const attireStatus = document.querySelector("[data-attire-status]");

  const lightbox = document.querySelector("[data-lightbox]");
  const lightboxImage = document.querySelector("[data-lightbox-image]");
  const lightboxCaption = document.querySelector("[data-lightbox-caption]");
  const lightboxCounter = document.querySelector("[data-lightbox-counter]");
  const lightboxPrevious = document.querySelector("[data-lightbox-previous]");
  const lightboxNext = document.querySelector("[data-lightbox-next]");
  const lightboxClose = document.querySelector("[data-lightbox-close]");

  const attirePreferenceKey = "samarstory:attire-preference:v1";
  const attireKeys = ["women", "men"];
  const attireSwitchers = [];
  const motionViewportState = new Map();
  const motionTargets = new Set();

  let selectedAttire = readSession(attirePreferenceKey) === "men" ? "men" : "women";
  let lightboxState = null;
  let touchStartX = null;
  let activeEventId = "";
  let motionSequence = 0;

  const icons = {
    hanger:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5.5a2 2 0 1 1 3.6 1.2c-.6.8-1.6 1.1-1.6 2.3v.8l8 4.8a1.5 1.5 0 0 1-.8 2.8H4.8a1.5 1.5 0 0 1-.8-2.8l8-4.8"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
    gallery:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5-4 3 2 3-3 5 5"/></svg>',
    avoid:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m6 18 12-12"/></svg>',
    placeholder:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M4 12h16"/></svg>',
    arrow:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };

  function readSession(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function writeSession(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch (_error) {
      // The experience remains usable when storage is blocked.
    }
  }

  function element(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function dateTimeValue(dateLabel) {
    const parsed = new Date(dateLabel);
    if (Number.isNaN(parsed.getTime())) return "";
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function shortDate(event) {
    if (!event?.date) return "";
    const parsed = new Date(event.date);
    const dateCopy = Number.isNaN(parsed.getTime())
      ? event.date
      : `${parsed.toLocaleDateString("en-US", { month: "short" })} ${String(parsed.getDate()).padStart(2, "0")}`;
    return event.time ? `${dateCopy} · ${event.time}` : dateCopy;
  }

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node && typeof value === "string") node.textContent = value;
  }

  function audienceLabel(routeKey, site) {
    if (typeof site?.guideLabel === "string" && site.guideLabel.trim()) {
      return site.guideLabel.trim();
    }
    if (routeKey === "wardrobe") return "Friends' celebration guide";
    if (routeKey === "attire") return "Family celebration guide";
    return "Complete celebration guide";
  }

  function renderSiteCopy(routeView) {
    const copy = routeView.site && typeof routeView.site === "object" ? routeView.site : {};
    setText("[data-site-kicker]", copy.kicker);
    setText("[data-site-intro]", copy.intro);
    setText("[data-site-note]", copy.note);
    setText("[data-events-kicker]", eventCountLabel(routeView.events.length));
    setText("[data-footer-names]", copy.footerNames);
    setText("[data-footer-dates]", copy.footerDates);
    setText("[data-footer-message]", copy.footerMessage);
    setText("[data-audience-badge]", audienceLabel(routeView.key, copy));

    const canonical = document.querySelector("[data-site-canonical]");
    if (canonical && typeof copy.canonicalUrl === "string" && copy.canonicalUrl.trim()) {
      canonical.href = copy.canonicalUrl.trim();
    }

    const title = document.querySelector("[data-site-title]");
    if (title && (copy.titleLead || copy.title || copy.titleScript)) {
      const titleParts = [
        ["hero__title-lead", copy.titleLead],
        ["hero__title-main", copy.title],
        ["hero__title-script", copy.titleScript]
      ]
        .filter(([, value]) => typeof value === "string" && value.trim())
        .map(([className, value]) => element("span", className, value));
      title.replaceChildren(...titleParts);
    }

    const documentTitle = [copy.titleLead, copy.title, copy.titleScript]
      .filter((value) => typeof value === "string" && value.trim())
      .join(" ");
    if (documentTitle) document.title = documentTitle;
  }

  function normaliseMotionPack(value) {
    if (!value || typeof value !== "object" || typeof value.base !== "string") return null;
    const base = value.base.trim();
    if (!base) return null;

    const normalisePercent = (number, fallback = 0) =>
      Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : fallback;

    const layers = Array.isArray(value.layers)
      ? value.layers.flatMap((layer) => {
          if (!layer || typeof layer.src !== "string" || !layer.src.trim()) return [];
          const clip = Array.isArray(layer.clip) && layer.clip.length === 4
            ? layer.clip.map((part) => normalisePercent(part))
            : null;
          return [{
            src: layer.src.trim(),
            type: safeId(layer.type, "ambient"),
            x: Number.isFinite(layer.x) ? layer.x : 0,
            y: Number.isFinite(layer.y) ? layer.y : 0,
            width: Number.isFinite(layer.width) ? layer.width : 100,
            delay: Number.isFinite(layer.delay) ? layer.delay : 0,
            origin: typeof layer.origin === "string" ? layer.origin : "50% 50%",
            aboveEyes: layer.aboveEyes === true,
            clip
          }];
        })
      : [];
    const shimmers = Array.isArray(value.shimmers)
      ? value.shimmers.flatMap((polygon) => {
          if (!Array.isArray(polygon) || polygon.length < 3) return [];
          const points = polygon.flatMap((point) => {
            if (!Array.isArray(point) || point.length !== 2) return [];
            return [[normalisePercent(point[0]), normalisePercent(point[1])]];
          });
          return points.length >= 3 ? [points] : [];
        })
      : [];
    const eyeManifest = typeof value.eyeManifest === "string" && value.eyeManifest.trim()
      ? value.eyeManifest.trim()
      : null;
    const eyeDelay = Number.isFinite(value.eyeDelay) ? value.eyeDelay : 0;
    return { base, layers, shimmers, eyeManifest, eyeDelay };
  }

  function eyeLayersFromManifest(manifest, manifestUrl, delay = 0) {
    if (!manifest || typeof manifest !== "object") return [];
    const canvas = Array.isArray(manifest.canvas) ? manifest.canvas : [];
    const canvasWidth = Number(canvas[0]);
    const canvasHeight = Number(canvas[1]);
    if (!(canvasWidth > 0) || !(canvasHeight > 0) || !Array.isArray(manifest.eyes)) return [];

    const stageAspect = 4 / 5;
    const imageAspect = canvasWidth / canvasHeight;
    const renderedWidth = imageAspect < stageAspect ? (imageAspect / stageAspect) * 100 : 100;
    const renderedHeight = imageAspect > stageAspect ? (stageAspect / imageAspect) * 100 : 100;
    const offsetX = (100 - renderedWidth) / 2;
    const offsetY = (100 - renderedHeight) / 2;
    const type = manifest.mode === "open" ? "open-eye" : "blink";

    return manifest.eyes.flatMap((eye, index) => {
      if (!eye || typeof eye.file !== "string" || !Array.isArray(eye.cropPx)) return [];
      const [cropX, cropY, cropWidth, cropHeight] = eye.cropPx.map(Number);
      if (![cropX, cropY, cropWidth, cropHeight].every(Number.isFinite)) return [];
      if (!(cropWidth > 0) || !(cropHeight > 0)) return [];
      const x = offsetX + (cropX / canvasWidth) * renderedWidth;
      const y = offsetY + (cropY / canvasHeight) * renderedHeight;
      const width = (cropWidth / canvasWidth) * renderedWidth;
      const height = (cropHeight / canvasHeight) * renderedHeight;
      const phaseDelay = Math.min(1.6, Math.max(0, delay * 0.4 + index * 0.55));
      return [{
        src: new URL(eye.file, manifestUrl).href,
        type,
        x,
        y,
        width,
        height,
        delay: phaseDelay,
        origin: `${x + width / 2}% ${y + height / 2}%`,
        clip: null,
        cropped: true
      }];
    });
  }

  function createPlaceholder(context) {
    const placeholder = element("div", "gallery-placeholder");
    placeholder.setAttribute("role", "status");
    placeholder.innerHTML = icons.placeholder;
    placeholder.append(
      element("span", "", "Outfit inspiration coming soon"),
      element("small", "", `Artwork for ${context} will appear here once added`)
    );
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

    if (lightboxState?.group === group) {
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

  function loadDeferredImage(img) {
    if (!img || img.hasAttribute("src") || !img.dataset.src) return;
    img.src = img.dataset.src;
  }

  async function hydrateMotionPack(card) {
    if (!card || card.dataset.motionPack !== "pending") return;
    const pack = card._motionPack;
    const fallback = card.querySelector(".motion-art__fallback");
    const layerHost = card.querySelector(".motion-art__layers");
    if (!pack || !fallback || !layerHost) return;
    card.dataset.motionPack = "loading";

    try {
      let layers = [...pack.layers];
      if (pack.eyeManifest) {
        const manifestUrl = new URL(pack.eyeManifest, document.baseURI);
        const response = await fetch(manifestUrl, { cache: "force-cache" });
        if (!response.ok) throw new Error(`Motion manifest failed: ${response.status}`);
        const manifest = await response.json();
        const eyeLayers = eyeLayersFromManifest(manifest, manifestUrl, pack.eyeDelay);
        if (!eyeLayers.length) throw new Error("Motion manifest contains no eye layers");
        layers = [...eyeLayers, ...layers];
      }

      const sources = [...new Set([pack.base, ...layers.map((layer) => layer.src)])];
      const loadedEntries = await Promise.all(
        sources.map((src) => new Promise((resolve, reject) => {
          const image = new Image();
          image.decoding = "async";
          image.onload = () => resolve([src, image]);
          image.onerror = reject;
          image.src = src;
        }))
      );
      const loaded = new Map(loadedEntries);
      fallback.src = pack.base;
      layerHost.replaceChildren();
      layers.forEach((layer) => {
        const img = loaded.get(layer.src).cloneNode();
        img.alt = "";
        img.setAttribute("aria-hidden", "true");
        img.className = `motion-art__layer motion-art__layer--${layer.type}`;
        if (layer.cropped) img.classList.add("motion-art__layer--crop");
        if (layer.aboveEyes) img.classList.add("motion-art__layer--above-eyes");
        img.style.setProperty("--layer-x", `${layer.x}%`);
        img.style.setProperty("--layer-y", `${layer.y}%`);
        img.style.setProperty("--layer-width", `${layer.width}%`);
        if (Number.isFinite(layer.height)) {
          img.style.setProperty("--layer-height", `${layer.height}%`);
        }
        img.style.setProperty("--layer-delay", `${layer.delay}s`);
        img.style.setProperty("--layer-origin", layer.origin);
        if (layer.clip) {
          const [x, y, width, height] = layer.clip;
          const right = Math.max(0, 100 - x - width);
          const bottom = Math.max(0, 100 - y - height);
          img.style.setProperty(
            "--layer-clip",
            `inset(${y}% ${right}% ${bottom}% ${x}%)`
          );
        }
        layerHost.append(img);
      });
      pack.shimmers.forEach((polygon, index) => {
        const shimmer = element("span", "motion-art__shimmer");
        shimmer.style.setProperty(
          "--shimmer-clip",
          `polygon(${polygon.map(([x, y]) => `${x}% ${y}%`).join(",")})`
        );
        shimmer.style.setProperty("--shimmer-delay", `${1.1 + index * 1.37}s`);
        layerHost.append(shimmer);
      });
      layerHost.hidden = false;
      card.dataset.motionPack = "ready";
    } catch (_error) {
      card.dataset.motionPack = "fallback";
      loadDeferredImage(fallback);
    }
  }

  function renderGallery(images, context, initiallyActive) {
    const gallery = element("div", "outfit-gallery");
    gallery.setAttribute("aria-label", `${context} outfit inspiration`);
    const group = {
      context,
      element: gallery,
      images: normaliseImages(images, context),
      cards: new Map(),
      placeholder: null
    };

    if (group.images.length === 1) gallery.classList.add("outfit-gallery--single");

    group.images.slice().forEach((image) => {
      const card = element("button", "inspiration-card");
      card.type = "button";
      card.setAttribute("aria-label", `Open larger image: ${image.alt}`);
      card.dataset.motionArt = "";
      card.dataset.motionPack = "static";
      const sequenceIndex = motionSequence++;
      card.style.setProperty("--motion-delay", `${(sequenceIndex % 3) * 0.38}s`);
      card.style.setProperty("--glint-delay", `${1.2 + (sequenceIndex % 4) * 0.7}s`);

      const art = element("span", "inspiration-card__art motion-art");
      art.dataset.layeredArt = "";
      const img = document.createElement("img");
      img.className = "motion-art__fallback";
      img.alt = image.alt;
      img.width = Number.isFinite(image.width) ? image.width : 640;
      img.height = Number.isFinite(image.height) ? image.height : 800;
      img.loading = "lazy";
      img.decoding = "async";
      img.dataset.src = image.src;
      if (initiallyActive) loadDeferredImage(img);
      art.append(img);

      const motionPack = normaliseMotionPack(image.motion);
      if (motionPack) {
        const layers = element("span", "motion-art__layers");
        layers.hidden = true;
        layers.setAttribute("aria-hidden", "true");
        art.append(layers);
        card._motionPack = motionPack;
        card.dataset.motionPack = "pending";
      }

      card.append(art);
      group.cards.set(image, card);
      gallery.append(card);

      card.addEventListener("click", () => {
        const index = group.images.indexOf(image);
        if (index >= 0) openLightbox(group, index, card);
      });
      img.addEventListener("error", () => removeGalleryImage(group, image), { once: true });
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

  function renderAttirePanel(event, groupKey, groupLabel, sectionId, initiallyActive) {
    const data = event[groupKey] && typeof event[groupKey] === "object" ? event[groupKey] : {};
    const recommended = normaliseList(data.recommended);
    const avoid = normaliseList(data.avoid);
    const context = `${event.name || "Event"} ${groupLabel.toLowerCase()}`;
    const panel = element("section", "attire-panel");
    const panelId = `${sectionId}-${groupKey}-panel`;
    const tabId = `${sectionId}-${groupKey}-tab`;
    panel.id = panelId;
    panel.dataset.attirePanel = groupKey;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tabId);
    panel.tabIndex = 0;
    panel.hidden = !initiallyActive;

    const panelHeading = element("h3", "sr-only", `${groupLabel}'s wardrobe for ${event.name}`);
    const artBlock = element("div", "look-stage");
    const artTitle = element("p", "gallery-title");
    artTitle.innerHTML = `${icons.gallery}<span>Outfit inspiration</span>`;
    artBlock.append(artTitle, renderGallery(data.images, context, initiallyActive));

    const guidance = element("div", "guidance-card");
    const guidanceHeading = element("div", "guidance-card__heading");
    const hanger = element("span", "attire-card__icon");
    hanger.setAttribute("aria-hidden", "true");
    hanger.innerHTML = icons.hanger;
    const headingCopy = element("div");
    headingCopy.append(
      element("p", "attire-card__overline", "Wardrobe guide"),
      element("h3", "", groupLabel)
    );
    guidanceHeading.append(hanger, headingCopy);
    guidance.append(guidanceHeading);

    if (recommended.length) {
      const block = element("div", "guidance-block");
      const title = element("p", "guidance-title");
      title.innerHTML = `${icons.check}<span>Recommended</span>`;
      const list = element("ul", "suggestion-list");
      recommended.forEach((item) => list.append(element("li", "", item)));
      block.append(title, list);
      guidance.append(block);
    }

    const avoidPanel = renderAvoidList(avoid);
    if (avoidPanel) guidance.append(avoidPanel);
    panel.append(panelHeading, guidance, artBlock);
    return { panel, tabId, panelId };
  }

  function renderAttireSwitcher(event, sectionId) {
    const switcher = element("div", "attire-switcher");
    const tablist = element("div", "attire-tabs");
    tablist.setAttribute("role", "tablist");
    tablist.setAttribute("aria-label", `Choose a wardrobe for ${event.name}`);

    const panels = element("div", "attire-panels");
    const state = { eventName: event.name, tabs: new Map(), panels: new Map() };
    attireKeys.forEach((groupKey) => {
      const groupLabel = groupKey === "women" ? "Women" : "Men";
      const active = groupKey === selectedAttire;
      const rendered = renderAttirePanel(event, groupKey, groupLabel, sectionId, active);
      const tab = element("button", "attire-tab", groupLabel);
      tab.type = "button";
      tab.id = rendered.tabId;
      tab.dataset.attireTab = groupKey;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", rendered.panelId);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      tab.addEventListener("click", () => selectAttire(groupKey, { announce: true }));
      tab.addEventListener("keydown", (eventObject) => handleAttireTabKeydown(eventObject, groupKey));
      state.tabs.set(groupKey, tab);
      state.panels.set(groupKey, rendered.panel);
      tablist.append(tab);
      panels.append(rendered.panel);
    });

    switcher.append(tablist, panels);
    attireSwitchers.push(state);
    return switcher;
  }

  function renderEvent(event, index, allEvents) {
    const eventId = safeId(event.id, `event-${index + 1}`);
    const sectionId = `event-${eventId}`;
    const article = element("article", "event-card event-chapter");
    article.id = sectionId;
    article.dataset.eventId = eventId;
    article.dataset.theme = safeId(event.theme, "sacred");
    article.setAttribute("aria-labelledby", `${sectionId}-title`);

    const border = element("span", "event-card__draw-border");
    border.setAttribute("aria-hidden", "true");
    ["top", "right", "bottom", "left"].forEach((edge) => {
      border.append(element("span", `event-card__draw-border-${edge}`));
    });

    const header = element("header", "event-card__header");
    const feather = element("span", "event-card__feather");
    feather.setAttribute("aria-hidden", "true");
    const ornament = element("span", "event-card__ornament");
    ornament.setAttribute("aria-hidden", "true");
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
    header.append(feather, ornament, dateLine, title);
    if (event.tagline) header.append(element("p", "event-card__tagline", event.tagline));
    if (event.description) header.append(element("p", "event-card__description", event.description));

    article.append(border, header, renderAttireSwitcher(event, sectionId));

    const nextEvent = allEvents[index + 1];
    const nextNav = element("nav", "event-next");
    nextNav.setAttribute("aria-label", nextEvent ? "Next celebration" : "End of celebration guide");
    const nextLink = element("a", "event-next__link");
    if (nextEvent) {
      const nextId = `event-${safeId(nextEvent.id, `event-${index + 2}`)}`;
      nextLink.href = `#${nextId}`;
      nextLink.setAttribute("aria-label", `Next celebration: ${nextEvent.name}`);
      nextLink.append(
        element("span", "event-next__eyebrow", "Next celebration"),
        element("strong", "", nextEvent.name || "Next event"),
        element("span", "event-next__date", shortDate(nextEvent))
      );
    } else {
      nextLink.href = "#top";
      nextLink.setAttribute("aria-label", "Return to the top of the wardrobe guide");
      nextLink.append(
        element("span", "event-next__eyebrow", "Celebrations await"),
        element("strong", "", "Return to the invitation")
      );
    }
    const arrow = element("span", "event-next__arrow");
    arrow.setAttribute("aria-hidden", "true");
    arrow.innerHTML = icons.arrow;
    nextLink.append(arrow);
    nextNav.append(nextLink);
    article.append(nextNav);
    return { article, eventId, sectionId, event };
  }

  function renderNavigation(renderedEvents) {
    navRoot.replaceChildren();
    renderedEvents.forEach(({ event, eventId, sectionId }, index) => {
      const link = element("a", "event-nav__link");
      link.href = `#${sectionId}`;
      link.dataset.navEvent = eventId;
      link.dataset.navIndex = String(index);
      link.setAttribute("aria-label", `${event.name}, ${shortDate(event)}`);
      link.append(
        element("span", "event-nav__date", shortDate(event)),
        element("span", "event-nav__name", event.name || `Event ${index + 1}`)
      );
      if (index === 0) {
        link.classList.add("is-active");
        link.setAttribute("aria-current", "true");
      }
      navRoot.append(link);
    });
    setProgress(0, renderedEvents.length);
  }

  function setProgress(index, count) {
    const progress = count > 0 ? (index + 1) / count : 0;
    document.documentElement.style.setProperty("--event-progress", String(progress));
    if (progressBar) progressBar.style.transform = `scaleX(${progress})`;
  }

  function setActiveNavigation(eventId) {
    if (!eventId || activeEventId === eventId) return;
    activeEventId = eventId;
    document.documentElement.dataset.activeEvent = eventId;
    const links = [...navRoot.querySelectorAll("[data-nav-event]")];
    links.forEach((link, index) => {
      const active = link.dataset.navEvent === eventId;
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "true");
        setProgress(index, links.length);
        const targetLeft = link.offsetLeft + link.offsetWidth / 2 - navRoot.parentElement.clientWidth / 2;
        navRoot.parentElement.scrollTo({
          left: Math.max(0, targetLeft),
          behavior: motionIsAllowed() ? "smooth" : "auto"
        });
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function loadPanelImages(panel) {
    panel.querySelectorAll("img[data-src]").forEach(loadDeferredImage);
  }

  function selectAttire(groupKey, { announce = false, focusSwitcher = null } = {}) {
    if (!attireKeys.includes(groupKey)) return;
    selectedAttire = groupKey;
    writeSession(attirePreferenceKey, groupKey);
    attireSwitchers.forEach((switcher) => {
      switcher.tabs.forEach((tab, key) => {
        const active = key === groupKey;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      switcher.panels.forEach((panel, key) => {
        const active = key === groupKey;
        panel.hidden = !active;
        if (active) loadPanelImages(panel);
      });
    });
    focusSwitcher?.tabs.get(groupKey)?.focus();
    if (announce && attireStatus) {
      attireStatus.textContent = `Showing ${groupKey === "women" ? "women's" : "men's"} wardrobe guidance for every celebration.`;
    }
    refreshMotionState();
  }

  function handleAttireTabKeydown(eventObject, currentKey) {
    const currentIndex = attireKeys.indexOf(currentKey);
    let nextIndex = currentIndex;
    if (["ArrowRight", "ArrowDown"].includes(eventObject.key)) nextIndex = (currentIndex + 1) % attireKeys.length;
    if (["ArrowLeft", "ArrowUp"].includes(eventObject.key)) nextIndex = (currentIndex - 1 + attireKeys.length) % attireKeys.length;
    if (eventObject.key === "Home") nextIndex = 0;
    if (eventObject.key === "End") nextIndex = attireKeys.length - 1;
    if (nextIndex === currentIndex && !["Home", "End"].includes(eventObject.key)) return;
    eventObject.preventDefault();
    const focusSwitcher = attireSwitchers.find(
      (switcher) => switcher.tabs.get(currentKey) === eventObject.currentTarget
    );
    selectAttire(attireKeys[nextIndex], { announce: true, focusSwitcher });
  }

  function motionIsAllowed() {
    const invitationState = document.documentElement.dataset.invitationState;
    return (
      !reducedMotion.matches &&
      !document.hidden &&
      (invitationState === "opened" || !invitationState)
    );
  }

  function updateMotionPreference() {
    document.documentElement.dataset.motionPreference = reducedMotion.matches
      ? "reduced"
      : "playing";
    refreshMotionState();
  }

  function refreshMotionState() {
    const allowed = motionIsAllowed();
    motionTargets.forEach((target) => {
      const visible = motionViewportState.get(target) === true;
      const inHiddenPanel = Boolean(target.closest("[hidden]"));
      const active = allowed && visible && !inHiddenPanel;
      target.classList.toggle("is-motion-active", active);
      if (active && target.matches("[data-motion-art]")) hydrateMotionPack(target);
    });
  }

  function initialiseMotionSystem() {
    updateMotionPreference();
    reducedMotion.addEventListener?.("change", updateMotionPreference);
    document.addEventListener("visibilitychange", refreshMotionState);
    document.addEventListener("wardrobe:invitation-state", refreshMotionState);
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
        { rootMargin: "0px 0px -8%", threshold: 0.06 }
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
      { rootMargin: "-24% 0px -62%", threshold: [0, 0.06, 0.18] }
    );
    articles.forEach((article) => navigationObserver.observe(article));
  }

  function initialiseAmbientMotion(articles) {
    const targets = [
      document.querySelector(".hero"),
      document.querySelector(".event-nav"),
      ...articles,
      ...document.querySelectorAll("[data-motion-art]")
    ].filter(Boolean);
    targets.forEach((target) => motionTargets.add(target));

    if (!("IntersectionObserver" in window)) {
      targets.forEach((target) => motionViewportState.set(target, true));
      refreshMotionState();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          motionViewportState.set(entry.target, entry.isIntersecting && entry.intersectionRatio >= 0.08);
        });
        refreshMotionState();
      },
      { rootMargin: "10% 0px 10%", threshold: [0, 0.08] }
    );
    targets.forEach((target) => observer.observe(target));
  }

  function isLightboxOpen() {
    return Boolean(lightboxState);
  }

  function openLightbox(group, index, trigger) {
    if (!group.images.length || !lightbox) return;
    lightboxState = { group, index, currentImage: group.images[index], trigger };
    updateLightbox();
    if (typeof lightbox.showModal === "function") {
      if (!lightbox.open) lightbox.showModal();
    } else {
      lightbox.setAttribute("open", "");
    }
    document.body.classList.add("is-lightbox-open");
    lightboxClose?.focus();
  }

  function updateLightboxControls() {
    if (!lightboxState) return;
    const total = lightboxState.group.images.length;
    if (lightboxCounter) lightboxCounter.textContent = total ? `${lightboxState.index + 1} / ${total}` : "";
    if (lightboxPrevious) lightboxPrevious.disabled = total <= 1;
    if (lightboxNext) lightboxNext.disabled = total <= 1;
  }

  function updateLightbox() {
    if (!lightboxState || !lightboxImage) return;
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
    if (lightboxCaption) lightboxCaption.textContent = image.alt;
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
    lightboxImage?.removeAttribute("src");
    lightboxImage?.removeAttribute("data-gallery-src");
    if (typeof lightbox?.close === "function" && lightbox.open) {
      lightbox.close();
    } else {
      lightbox?.removeAttribute("open");
    }
    if (trigger?.isConnected) trigger.focus();
  }

  function initialiseLightbox() {
    if (!lightbox || !lightboxImage || !lightboxClose) return;
    lightboxClose.addEventListener("click", closeLightbox);
    lightboxPrevious?.addEventListener("click", () => moveLightbox(-1));
    lightboxNext?.addEventListener("click", () => moveLightbox(1));
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
    lightbox.addEventListener("touchstart", (event) => {
      touchStartX = event.changedTouches[0]?.clientX ?? null;
    }, { passive: true });
    lightbox.addEventListener("touchend", (event) => {
      if (touchStartX === null) return;
      const touchEndX = event.changedTouches[0]?.clientX;
      if (typeof touchEndX !== "number") return;
      const distance = touchEndX - touchStartX;
      touchStartX = null;
      if (Math.abs(distance) >= 48) moveLightbox(distance > 0 ? -1 : 1);
    }, { passive: true });
  }

  function showConfigurationError(message) {
    if (!eventsRoot) return;
    eventsRoot.replaceChildren(element("p", "empty-state", message));
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
      showConfigurationError("The wardrobe guide could not be loaded. Please check js/events.js.");
      return;
    }

    const routeView = resolveRouteView(config, window.location.pathname);
    document.documentElement.dataset.guideRoute = routeView.key || "all";
    renderSiteCopy(routeView);
    eventsRoot.replaceChildren();

    if (!routeView.events.length) {
      showConfigurationError("Wardrobe details are coming soon.");
      return;
    }

    const renderedEvents = routeView.events.map((event, index) => {
      const rendered = renderEvent(event, index, routeView.events);
      eventsRoot.append(rendered.article);
      return rendered;
    });

    renderNavigation(renderedEvents);
    initialiseLightbox();
    initialiseMotionSystem();
    requestAnimationFrame(() => {
      const articles = renderedEvents.map(({ article }) => article);
      activeEventId = "";
      setActiveNavigation(renderedEvents[0].eventId);
      initialiseObservers(articles);
      initialiseAmbientMotion(articles);
      honourInitialHash();
    });
  }

  initialise();
})();
