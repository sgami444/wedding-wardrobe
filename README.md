# Margee & Sahil's Wedding Wardrobe

A mobile-first, framework-free wedding wardrobe guide. Open `index.html`
directly in a browser or publish this folder to any static host.

Live site: <https://thesamarstory.com/wardrobe/>

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
