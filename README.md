# Margee & Sahil's Wedding Wardrobe

A framework-free wedding website. The home page (`index.html`) asks whose
guest the visitor is, with links to each family's relatives invitation.
The wardrobe template lives in `wardrobe.html`; the deployment workflow
publishes it at the four wardrobe guide URLs.

## Shareable guides

The separate family invitation is hosted at <https://thesamarstory.com/margee/>.
Its HTML, scripts and artwork live in `margee/`, imported from the supplied
`margee-sahil-version1-final` folder. Its additional `css/responsive.css` fixes
full-width backgrounds and responsive layouts, and uses the wardrobe feather
artwork with gentle motion that respects reduced-motion preferences.

The groom's family invitation is hosted at <https://thesamarstory.com/sahil/>.
Its own Version 2 content and assets come from `margee-sahil-version2-final`
and live in `sahil/`, with the same responsive layout and feather motion fixes.

The relatives' invitation is at <https://thesamarstory.com/margee/relatives/>.
Its Version 4 content and assets come from `Margee_Sahil_Wedding_Version4_FINAL`
and live in `margee/relatives/`. It includes Mandap, Grand Garba and Wedding,
with the responsive layout and feather backdrop. The existing deployment step
copies this nested route along with the rest of `margee/`.

Sahil's relatives invitation is at <https://thesamarstory.com/sahil/relatives/>.
It retains the Gami family content from `/sahil/`, shares its assets, and
includes Mandap, Grand Garba and Wedding without Carnival.

The Gujarati invitation is at <https://thesamarstory.com/margee/gujarati/>.
Its own content, artwork and local Gujarati fonts (including licenses) come
from `Margee_Sahil_Gujarati_Wedding_Version3_FINAL` and live in `margee/gujarati/`,
with the same responsive feather backdrop.

- Wedding guide: <https://thesamarstory.com/wardrobe/> (Sagai is omitted.)
- Family: <https://thesamarstory.com/attire/> (Sagai and Carnival are omitted.)
- Engagement: <https://thesamarstory.com/wardrobe/engagement/> (Only Sagai.)
- Garba: <https://thesamarstory.com/wardrobe/garba/> (Only Garba.)

All four guides open directly without the invitation animation, including on
a first visit. The home page at <https://thesamarstory.com/> offers Margee and
Sahil guest choices. Both relatives invitations begin with the invitation
opening animation. The footer replay button remains available.

Every invitation page under `/margee` and `/sahil` shows the envelope on page
load, including nested and language-specific invitations. They share
`js/invitation-entry.js`, `js/invitation.js` and `css/invitation-entry.css`.
Wardrobe and attire routes always bypass the envelope.

The views are configured in the `routes` object in `js/events.js`. Routes can
list event IDs in `includeEvents` or `excludeEvents`, while event content still
lives in one shared `events` array. The GitHub Pages workflow generates each
route directory with its HTML and assets, so direct links and refreshes work.

Run the route and invitation regression checks with
`node --test tests/routes.test.cjs` (Node.js 18 or newer). The deployment workflow
also runs these checks before preparing the site.

These are tailored public views, not password-protected pages. Because GitHub
Pages and this repository are public, someone who knows another URL can still
open it.

## Edit event content

All event copy, recommendations, restrictions, and image paths live in
`js/events.js`. The page navigation and event sections are generated from that
file, so ordinary content updates never require editing HTML.

Each attire group has three independent lists:

```js
women: {
  recommended: ["Bandhani", "Silk Saree", "Choli"],
  avoid: ["Patola", "Paithani"],
  images: [
    {
      src: "assets/mandap/women/outfit-caricature-01.webp",
      alt: "Illustrated red Bandhani and mustard silk saree inspiration for the Mandap"
    }
  ]
}
```

The image list does not correspond position-by-position with the dress-code
list. Three recommendations can have two images, five images, or no images.

## Replace or add an image

1. Put the image in the matching folder, for example
   `assets/mandap/women/outfit-caricature-02.webp`.
2. In `js/events.js`, update that image object's `src`.
3. Update `alt` with a short description of what the image shows.

To add another image, add another object to the relevant `images` array:

```js
{
  src: "assets/mandap/women/outfit-caricature-02.webp",
  alt: "Traditional Gujarati choli inspiration"
}
```

Use compressed `.webp` or `.avif` photographs where possible. Portrait photos
work especially well, but the gallery uses `object-fit: contain`, so landscape,
transparent, and white-background images are all supported.

If a configured file is absent or cannot load, its card is removed gracefully.
When no usable photos remain, the gallery shows “Outfit inspiration coming
soon.” Recommendations and restrictions are not affected.

## Change a restriction

Edit the relevant `avoid` array in `js/events.js`:

```js
avoid: ["Patola", "Paithani"]
```

Use `avoid: []` when there is no restriction. The “Please avoid” panel is then
omitted automatically.

## Project structure

```text
.
├── index.html
├── README.md
├── css/
│   └── styles.css
├── js/
│   ├── events.js
│   └── app.js
└── assets/
    ├── logo/
    ├── florals/
    ├── sagai/{women,men}/
    ├── mandap/{women,men}/
    ├── carnival/{women,men}/
    ├── garba/{women,men}/
    └── wedding/{women,men}/
```

## Browser behavior

- Mobile galleries swipe horizontally; larger screens use two-column grids.
- Tapping an image opens the lightbox. Use its buttons, arrow keys, a swipe, or
  Escape to navigate and close it.
- The current event is reflected in the sticky navigation.
- Motion is reduced automatically when the visitor requests reduced motion.
