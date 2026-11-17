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
  ["/wardrobe", ["sagai", "mandap", "carnival", "garba", "wedding"]],
  ["/attire", ["sagai", "mandap", "garba", "wedding"]],
  ["/wardrobe/engagement", ["sagai"]],
  ["/wardrobe/garba", ["garba"]]
];

function loadInvitation(pathname, { hash = "", seen = false, blockedStorage = false } = {}) {
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
  const documentElement = { dataset: {} };
  Object.assign(context.window, {
    location: { pathname, hash },
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
      documentElement,
      querySelector: (selector) => nodes.get(selector) || null,
      addEventListener() {},
      dispatchEvent() {}
    },
    CustomEvent: function () {},
    requestAnimationFrame: (callback) => frames.push(callback)
  });
  vm.runInContext(source("js/invitation.js"), context);
  return { context, nodes, frames, writes, documentElement };
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

test("the main page keeps every event and schedules the invitation for a new visitor", () => {
  const result = loadInvitation("/");
  const { WardrobeApp, WEDDING_WARDROBE } = result.context.window;
  const view = WardrobeApp.resolveRouteView(WEDDING_WARDROBE, "/");
  assert.equal(view.events.length, 5);
  assert.equal(result.frames.length, 1);
  assert.equal(typeof result.context.window.WardrobeInvitation.replay, "function");
});

test("the main page preserves its returning-visitor and direct-event hash bypass", () => {
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
  const html = source("index.html");
  assert.ok(html.indexOf('src="js/app.js"') < html.indexOf('src="js/invitation.js"'));
});
