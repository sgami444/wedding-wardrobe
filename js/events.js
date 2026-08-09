/*
 * WEDDING WARDROBE CONTENT
 * ------------------------
 * This is the only file you need to edit when event details or outfit
 * inspiration changes.
 *
 * TEXT
 * - Change event names, dates, taglines, descriptions, recommendations, or
 *   restrictions directly below.
 *
 * IMAGES
 * - Every gallery item is an object with its own `src` and `alt` text.
 * - `recommended`, `avoid`, and `images` are three INDEPENDENT lists. They do
 *   not need the same number of items and their order does not need to match.
 * - To replace a photo, change only its `src` and `alt` values.
 * - To add a photo, copy one complete `{ src: "...", alt: "..." }` entry.
 * - Put photo files in the matching folder under `assets/<event>/<group>/`.
 * - If an image is not available yet, the site shows a graceful placeholder.
 *
 * EVENTS
 * - To add an event, copy one complete event object, give it a unique `id`,
 *   and update its content. Navigation and page sections are created for you.
 *
 * AUDIENCE ROUTES
 * - `/wardrobe/` is the friends guide and excludes Sagai.
 * - `/attire/` is the family guide and excludes Carnival.
 * - Add or remove event IDs in `excludeEvents` to adjust either guide.
 */

window.WEDDING_WARDROBE = {
  site: {
    canonicalUrl: "https://thesamarstory.com/",
    kicker: "What to Wear, Where to Shine",
    titleLead: "Margee & Sahil's",
    title: "Wedding",
    titleScript: "Wardrobe",
    intro:
      "We're so excited to celebrate with you. To make getting ready a little easier, we've put together a wardrobe guide for each celebration.",
    note: "Come dressed, celebrate, dance and make memories with us.",
    footerNames: "Margee & Sahil",
    footerDates: "January 21 & February 8–10, 2027",
    footerMessage: "Thank you for dressing up and celebrating with us."
  },

  routes: {
    wardrobe: {
      excludeEvents: ["sagai"],
      site: {
        canonicalUrl: "https://thesamarstory.com/wardrobe/",
        footerDates: "February 8–10, 2027"
      }
    },
    attire: {
      excludeEvents: ["carnival"],
      site: {
        canonicalUrl: "https://thesamarstory.com/attire/"
      }
    }
  },

  events: [
    {
      id: "sagai",
      name: "Sagai",
      date: "January 21, 2027",
      time: "",
      tagline: "A beautiful promise of forever, celebrated with love and blessings.",
      description: "Soft, refined pastels for a beautiful engagement celebration.",
      theme: "romantic",
      women: {
        recommended: [
          "Silk/Chiffon Saree", "Indo-Western", "Pastel colours only"
        ],
        avoid: ["Bright / Dark colours", "Heavy prints"],
        images: [
          {
            src: "assets/sagai/women/outfit-caricature-02.webp",
            alt: "Illustrated blush silk saree, mint chiffon saree and lavender Indo-Western Sagai outfit inspiration"
          }
        ]
      },
      men: {
        recommended: ["Suit", "Blazer", "Pastel colours only"],
        avoid: ["Heavy prints", "Jodhpuri"],
        images: [
          {
            src: "assets/sagai/men/outfit-caricature-02.webp",
            alt: "Illustrated ivory suit and pale sage blazer Sagai outfit inspiration"
          }
        ]
      }
    },
    {
      id: "mandap",
      name: "Mandap",
      date: "February 8, 2027",
      time: "",
      tagline: "A sacred beginning to our forever.",
      description: "Traditional, elegant Gujarati and Indian attire.",
      theme: "sacred",
      women: {
        recommended: ["Bandhani", "Silk Saree", "Choli"],
        avoid: ["Patola", "Pathani"],
        images: [
          {
            src: "assets/mandap/women/outfit-caricature-01.webp",
            alt: "Illustrated red Bandhani and mustard silk saree inspiration for the Mandap"
          }
        ]
      },
      men: {
        recommended: ["Plain Kurta", "Koti / traditional waistcoat"],
        avoid: ["Handwork Kurta", "Patola", "Dupatta"],
        images: [
          {
            src: "assets/mandap/men/outfit-caricature-01.webp",
            alt: "Illustrated white kurtas with red and cream traditional Koti inspiration"
          }
        ]
      }
    },
    {
      id: "carnival",
      name: "Carnival",
      date: "February 9, 2027",
      time: "Daytime",
      tagline: "A day of joy, laughter and celebration.",
      description: "Light, breezy, floral and festive.",
      theme: "daylight",
      women: {
        recommended: ["Floral / Flower print", "Chiffon gown", "Indo-Western outfit"],
        avoid: ["All shades of BLUE"],
        images: [
          {
            src: "assets/carnival/women/outfit-caricature-01.webp",
            alt: "Illustrated ivory floral chiffon gown and blush Indo-Western outfit inspiration"
          }
        ]
      },
      men: {
        recommended: [
          "Floral / Flower print", "Shirt / overshirt"
        ],
        avoid: ["All shades of BLUE", "Full Jacket"],
        images: [
          {
            src: "assets/carnival/men/outfit-caricature-01.webp",
            alt: "Illustrated floral shirt and overshirt looks with light neutral trousers"
          }
        ]
      }
    },
    {
      id: "garba",
      name: "Garba",
      date: "February 9, 2027",
      time: "Evening",
      tagline: "An evening filled with rhythm, tradition and vibrant energy.",
      description: "Colourful Gujarati attire made for a night of dancing.",
      theme: "festive",
      women: {
        recommended: [
          "Gujarati-style Chaniya Choli"
        ],
        avoid: ["Cocktail Style Outfits"],
        images: [
          {
            src: "assets/garba/women/outfit-caricature-02.webp",
            alt: "Illustrated green and orange Gujarati Chaniya Choli inspiration with mirror work"
          }
        ]
      },
      men: {
        recommended: [
          "Gujarati Kurta", "Koti / Dupatta"
        ],
        avoid: ["Jacket"],
        images: [
          {
            src: "assets/garba/men/outfit-caricature-02.webp",
            alt: "Illustrated white and mustard Gujarati kurtas with embroidered Koti inspiration"
          }
        ]
      }
    },
    {
      id: "wedding",
      name: "Wedding",
      date: "February 10, 2027",
      time: "",
      tagline: "A timeless union of love and tradition.",
      description: "Luxurious, sophisticated and ceremonial Indian attire.",
      theme: "ceremonial",
      women: {
        recommended: [
          "Patola",
          "Pathani",
          "Indo-Western",
          "Festive sarees",
          "Saree-style choli / traditional festive Indian attire"
        ],
        avoid: ["White"],
        images: [
          {
            src: "assets/wedding/women/outfit-caricature-01.webp",
            alt: "Illustrated Patola-style lehenga and rich green Paithani saree wedding inspiration"
          }
        ]
      },
      men: {
        recommended: ["Jodhpuri", "Bandhgala / Jodhpuri-style festive attire"],
        avoid: ["White"],
        images: [
          {
            src: "assets/wedding/men/outfit-caricature-03.jpeg",
            alt: "Illustrated navy-blue and burgundy Jodhpuri Bandhgala wedding inspiration"
          }
        ]
      }
    }
  ]
};
