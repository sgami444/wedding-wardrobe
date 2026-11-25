const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const root = join(__dirname, "..");
const source = (name) => readFileSync(join(root, name), "utf8");

function loadGuide() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(source("js/events.js"), context);
  vm.runInContext(source("js/app.js"), context);
  return context;
}

const guides = [
  ["/wardrobe", ["mandap", "carnival", "garba", "wedding"]],
  ["/attire", ["mandap", "garba", "wedding"]],
  ["/wardrobe/engagement", ["sagai"]],
  ["/wardrobe/garba", ["garba"]]
];

function loadInvitation(pathname, { hash = "", search = "", referrer = "", seen = false, blockedStorage = false, standalone = false } = {}) {
  const context = loadGuide();
  const nodes = new Map();
  for (const selector of [
    "[data-invitation]", "[data-site-shell]", "[data-invitation-open]",
    "[data-invitation-replay]", "[data-kankotri]"
  ]) {
    nodes.set(selector, {
      hidden: true,
      addEventListener() {},
      querySelector() { return null; }
    });
  }
  const frames = [];
  const writes = [];
  const historyReplacements = [];
  const documentElement = { dataset: {} };
  Object.assign(context.window, {
    location: { pathname, hash, href: `https://thesamarstory.com${pathname}${search}${hash}`, origin: "https://thesamarstory.com" },
    history: { state: null, replaceState(_state, _title, url) { historyReplacements.push(url); } },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
    sessionStorage: {
      getItem() {
        if (blockedStorage) throw new Error("Storage blocked");
        return seen ? "opened" : null;
      },
      setItem(...args) {
        if (blockedStorage) throw new Error("Storage blocked");
        writes.push(args);
      }
    }
  });
  Object.assign(context, {
    document: {
      referrer,
      documentElement,
      querySelector: (selector) => nodes.get(selector) || null,
      addEventListener() {},
      dispatchEvent() {}
    },
    CustomEvent: function () {},
    URL,
    requestAnimationFrame: (callback) => frames.push(callback)
  });
  if (standalone) delete context.window.WardrobeApp;
  vm.runInContext(source("js/invitation.js"), context);
  return { context, nodes, frames, writes, documentElement, historyReplacements };
}

for (const [path, eventIds] of guides) {
  for (const suffix of ["", "/", "/index.html"]) {
    test(`${path}${suffix} shows the requested events and skips the initial invitation`, () => {
      const result = loadInvitation(path + suffix);
      const { WardrobeApp, WEDDING_WARDROBE } = result.context.window;
      const view = WardrobeApp.resolveRouteView(WEDDING_WARDROBE, path + suffix);
      assert.deepEqual(Array.from(view.events, (event) => event.id), eventIds);
      assert.equal(view.site.canonicalUrl, `https://thesamarstory.com${path}/`);
      assert.equal(result.documentElement.dataset.invitationState, "opened");
      assert.equal(result.nodes.get("[data-invitation]").hidden, true);
      assert.equal(result.frames.length, 0);
      assert.equal(result.writes.length, 0, "Direct entry does not mark the main invitation as seen");
    });
  }
}

test("direct guides still bypass the invitation with storage blocked and an irrelevant hash", () => {
  for (const [path] of guides) {
    const result = loadInvitation(path, { blockedStorage: true, hash: "#event-missing" });
    assert.equal(result.context.window.WardrobeInvitation.getState(), "opened");
    assert.equal(result.frames.length, 0);
  }
});

test("the preserved wardrobe template supports the original root invitation", () => {
  const result = loadInvitation("/");
  const { WardrobeApp, WEDDING_WARDROBE } = result.context.window;
  const view = WardrobeApp.resolveRouteView(WEDDING_WARDROBE, "/");
  assert.equal(view.events.length, 5);
  assert.equal(result.frames.length, 1);
  assert.equal(typeof result.context.window.WardrobeInvitation.replay, "function");
});

test("the preserved invitation controller retains its returning-visitor and hash bypass", () => {
  for (const options of [{ seen: true }, { hash: "#event-sagai" }]) {
    const result = loadInvitation("/", options);
    assert.equal(result.frames.length, 0);
    assert.equal(result.documentElement.dataset.invitationState, "opened");
  }
  assert.equal(loadInvitation("/", { hash: "#event-missing" }).frames.length, 1);
});

test("unrelated paths do not accidentally select a single-event guide", () => {
  const { window } = loadGuide();
  for (const path of ["/engagement", "/garba", "/other/wardrobe/garba"]) {
    const view = window.WardrobeApp.resolveRouteView(window.WEDDING_WARDROBE, path);
    assert.equal(view.key, "");
    assert.equal(view.events.length, 5);
  }
});

test("the shared routing API loads before the invitation script", () => {
  const html = source("wardrobe.html");
  assert.ok(html.indexOf('src="js/app.js"') < html.indexOf('src="js/invitation.js"'));
});

test("all invitation routes show the envelope on every load without wardrobe dependencies", () => {
  for (const path of ["/margee", "/sahil", "/margee/relatives/", "/margee/gujarati/", "/sahil/relatives/"]) {
    for (const options of [{}, { seen: true }, { hash: "#events" }, { blockedStorage: true }]) {
      const result = loadInvitation(path, { ...options, standalone: true });
      assert.equal(result.frames.length, 1, `${path} should schedule the envelope`);
    }
  }
});

test("wardrobe paths always skip the envelope, including nested guides", () => {
  for (const path of ["/wardrobe/", "/wardrobe/engagement", "/wardrobe/garba", "/wardrobe/future-guide", "/attire/"]) {
    const result = loadInvitation(path, { standalone: true });
    assert.equal(result.frames.length, 0);
    assert.equal(result.nodes.get("[data-invitation]").hidden, true);
  }
});

test("language toggles skip the envelope in both directions and clean the temporary marker", () => {
  for (const [from, to] of [["relatives", "gujarati"], ["gujarati", "relatives"]]) {
    const result = loadInvitation(`/margee/${to}/`, {
      standalone: true,
      search: "?language-switch=1&other=kept",
      hash: "#invitation",
      referrer: `https://thesamarstory.com/margee/${from}/`
    });
    assert.equal(result.frames.length, 0);
    assert.equal(result.context.window.WardrobeInvitation.getState(), "opened");
    assert.deepEqual(result.historyReplacements, [`/margee/${to}/?other=kept#invitation`]);
  }
});

test("direct or unrelated navigation still shows the envelope even with a copied switch marker", () => {
  for (const referrer of ["", "https://example.com/margee/relatives/", "https://thesamarstory.com/", "https://thesamarstory.com/margee/gujarati/"]) {
    const result = loadInvitation("/margee/gujarati/", { standalone: true, search: "?language-switch=1", referrer });
    assert.equal(result.frames.length, 1);
    assert.deepEqual(result.historyReplacements, ["/margee/gujarati/"]);
  }
  const cleanReload = loadInvitation("/margee/gujarati/", {
    standalone: true,
    referrer: "https://thesamarstory.com/margee/relatives/"
  });
  assert.equal(cleanReload.frames.length, 1);
});
