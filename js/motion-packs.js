(function () {
  "use strict";

  const config = window.WEDDING_WARDROBE;
  if (!config || !Array.isArray(config.events)) return;

  const stageAspect = 4 / 5;

  function mapper(canvas) {
    const [width, height] = canvas;
    const imageAspect = width / height;
    let renderedWidth = 100;
    let renderedHeight = 100;
    let offsetX = 0;
    let offsetY = 0;

    if (imageAspect < stageAspect) {
      renderedWidth = (imageAspect / stageAspect) * 100;
      offsetX = (100 - renderedWidth) / 2;
    } else if (imageAspect > stageAspect) {
      renderedHeight = (stageAspect / imageAspect) * 100;
      offsetY = (100 - renderedHeight) / 2;
    }

    return {
      box([x, y, boxWidth, boxHeight]) {
        return [
          offsetX + (x / 100) * renderedWidth,
          offsetY + (y / 100) * renderedHeight,
          (boxWidth / 100) * renderedWidth,
          (boxHeight / 100) * renderedHeight
        ];
      },
      point([x, y]) {
        return [
          offsetX + (x / 100) * renderedWidth,
          offsetY + (y / 100) * renderedHeight
        ];
      }
    };
  }

  function buildPack(source, spec) {
    const map = mapper(spec.canvas);
    const layers = [];

    (spec.accessories || []).forEach((accessory, index) => {
      const clip = map.box(accessory.box);
      const [x, y, width, height] = clip;
      const origin = `${x + width / 2}% ${y + Math.min(height * 0.18, 3)}%`;
      layers.push({
        src: spec.cleanFrame,
        type: "clean-patch",
        clip,
        delay: 0,
        origin
      });
      layers.push({
        src: source,
        type: accessory.type,
        clip,
        delay: (accessory.delay || 0) + index * 0.31,
        origin
      });
    });

    return {
      base: source,
      canvas: spec.canvas,
      eyeManifest: spec.eyeManifest,
      eyeDelay: spec.eyeDelay || 0,
      layers,
      shimmers: (spec.garments || []).map((polygon) => polygon.map(map.point))
    };
  }

  const specs = {
    "assets/sagai/women/outfit-caricature-02.webp": {
      canvas: [1024, 1536],
      eyeManifest: "assets/motion/sagai/women/v1/eyes.json",
      eyeMode: "blink",
      eyeDelay: 0.4,
      eyes: [[21, 16, 11, 4], [43, 16, 12, 4], [70, 16, 13, 4]],
      cleanFrame: "assets/motion/sagai/women/v1/clean-frame.webp",
      accessories: [
        { type: "earrings", box: [18, 18, 5, 6], delay: 0.2 },
        { type: "earrings", box: [43, 18.5, 4, 5.5], delay: 1.1 },
        { type: "earrings", box: [52, 18, 6, 7], delay: 1.5 },
        { type: "earrings", box: [78, 18, 5, 7], delay: 2.1 }
      ],
      garments: [
        [[12,25],[20,23],[31,23],[35,28],[39,48],[37,94],[4,94],[7,58],[10,36]],
        [[38,25],[44,23],[56,23],[62,30],[68,53],[63,95],[34,95],[35,58],[38,34]],
        [[67,27],[72,24],[83,24],[88,29],[98,57],[98,95],[57,95],[60,55],[65,34]]
      ]
    },
    "assets/sagai/men/outfit-caricature-02.webp": {
      canvas: [1024, 1536],
      eyeManifest: "assets/motion/sagai/men/v1/eyes.json",
      eyeMode: "blink",
      eyeDelay: 1.2,
      eyes: [[32, 14, 11, 4], [62, 14, 12, 4]],
      cleanFrame: "assets/motion/sagai/men/v1/clean-frame.webp",
      accessories: [
        { type: "hair", box: [28, 6, 17, 8], delay: 0.4 },
        { type: "hair", box: [60, 7, 18, 8], delay: 1.3 }
      ],
      garments: [
        [[18,25],[27,22],[40,22],[47,29],[49,55],[43,92],[17,92],[13,55],[14,34]],
        [[51,27],[59,23],[74,23],[83,30],[87,57],[82,92],[54,92],[48,57],[49,34]]
      ]
    },
    "assets/mandap/women/outfit-caricature-01.webp": {
      canvas: [1122, 1402],
      eyeManifest: "assets/motion/mandap/women/v1/eyes.json",
      eyeMode: "open",
      eyeDelay: 0.9,
      eyes: [[30, 13, 11, 4], [61, 13, 11, 4]],
      cleanFrame: "assets/motion/mandap/women/v1/clean-frame.webp",
      accessories: [
        { type: "earrings", box: [26, 15, 5, 6], delay: 0.2 },
        { type: "earrings", box: [35, 16, 5, 6], delay: 0.6 },
        { type: "earrings", box: [57, 17, 4, 5], delay: 1.2 },
        { type: "earrings", box: [64, 15, 5, 7], delay: 1.7 }
      ],
      garments: [
        [[20,23],[27,21],[41,21],[47,28],[50,51],[48,91],[14,91],[16,54],[18,31]],
        [[54,24],[60,22],[75,22],[82,29],[91,56],[91,90],[49,90],[50,55],[52,32]]
      ]
    },
    "assets/mandap/men/outfit-caricature-01.webp": {
      canvas: [1122, 1402],
      eyeManifest: "assets/motion/mandap/men/v1/eyes.json",
      eyeMode: "blink",
      eyeDelay: 1.8,
      eyes: [[32, 14, 10, 4], [64, 15, 10, 4]],
      cleanFrame: "assets/motion/mandap/men/v1/clean-frame.webp",
      accessories: [
        { type: "hair", box: [28, 6, 17, 8], delay: 0.3 },
        { type: "hair", box: [61, 7, 18, 8], delay: 1.1 }
      ],
      garments: [
        [[20,23],[27,20],[40,20],[47,26],[50,49],[45,92],[18,92],[15,50],[16,31]],
        [[56,23],[62,21],[75,21],[83,27],[88,50],[84,92],[55,92],[52,50],[53,31]]
      ]
    },
    "assets/carnival/women/outfit-caricature-01.webp": {
      canvas: [971, 1619],
      eyeManifest: "assets/motion/carnival/women/v1/eyes.json",
      eyeMode: "blink",
      eyeDelay: 2.2,
      eyes: [[27, 21, 11, 4], [61, 21, 11, 4]],
      cleanFrame: "assets/motion/carnival/women/v1/clean-frame.webp",
      accessories: [
        { type: "earrings", box: [24, 22, 6, 7], delay: 0.2 },
        { type: "earrings", box: [36, 22, 5, 6], delay: 0.7 },
        { type: "earrings", box: [60, 22, 5, 7], delay: 1.2 },
        { type: "earrings", box: [71, 22, 6, 7], delay: 1.7 }
      ],
      garments: [
        [[21,31],[26,29],[35,29],[40,33],[48,55],[50,85],[4,85],[10,57],[17,37]],
        [[56,31],[62,29],[72,29],[79,34],[91,55],[95,86],[44,86],[49,55],[53,37]]
      ]
    },
    "assets/carnival/men/outfit-caricature-01.webp": {
      canvas: [1122, 1402],
      eyeManifest: "assets/motion/carnival/men/v1/eyes.json",
      eyeMode: "blink",
      eyeDelay: 0.6,
      eyes: [[32, 13, 10, 4], [63, 14, 11, 4]],
      cleanFrame: "assets/motion/carnival/men/v1/clean-frame.webp",
      accessories: [
        { type: "hair", box: [27, 5, 17, 8], delay: 0.5 },
        { type: "hair", box: [60, 5, 18, 8], delay: 1.5 }
      ],
      garments: [
        [[19,22],[27,20],[42,20],[48,27],[50,48],[45,88],[19,88],[16,49],[17,30]],
        [[53,23],[61,20],[75,20],[83,26],[86,49],[82,88],[52,88],[49,49],[50,30]]
      ]
    },
    "assets/garba/women/outfit-caricature-02.webp": {
      canvas: [1023, 1537],
      eyeManifest: "assets/motion/garba/women/v1/eyes.json",
      eyeMode: "blink",
      eyeDelay: 1.4,
      eyes: [[29, 20, 13, 4], [62, 20, 12, 4]],
      cleanFrame: "assets/motion/garba/women/v1/clean-frame.webp",
      accessories: [
        { type: "earrings", box: [26, 23, 4, 6], delay: 0.2 },
        { type: "earrings", box: [41, 23, 4, 6], delay: 0.7 },
        { type: "earrings", box: [59, 23, 4, 6], delay: 1.2 },
        { type: "earrings", box: [75, 23, 4, 6], delay: 1.8 },
        { type: "dupatta", box: [77, 27, 23, 64], delay: 1.1 }
      ],
      garments: [
        [[19,27],[25,25],[43,25],[48,32],[55,55],[55,92],[0,92],[3,57],[13,33]],
        [[56,28],[62,26],[76,26],[84,32],[100,56],[100,92],[48,92],[49,57],[53,34]]
      ]
    },
    "assets/garba/men/outfit-caricature-03.jpeg": {
      canvas: [1023, 1537],
      eyeManifest: "assets/motion/garba/men/v1/eyes.json",
      eyeMode: "blink",
      eyeDelay: 2.5,
      eyes: [[31, 14, 11, 4], [63, 14, 11, 4]],
      cleanFrame: "assets/motion/garba/men/v1/clean-frame.webp",
      accessories: [
        { type: "hair", box: [27, 5, 17, 7], delay: 0.4 },
        { type: "hair", box: [61, 6, 18, 7], delay: 1.3 },
        { type: "dupatta", box: [8, 65, 22, 10], delay: 0.8 }
      ],
      garments: [
        [[18,21],[26,19],[41,19],[47,26],[51,50],[46,89],[15,89],[11,51],[12,29]],
        [[53,22],[60,20],[75,20],[83,27],[89,51],[84,90],[54,90],[49,51],[50,29]]
      ]
    },
    "assets/wedding/women/outfit-caricature-01.webp": {
      canvas: [1122, 1402],
      eyeManifest: "assets/motion/wedding/women/v1/eyes.json",
      eyeMode: "open",
      eyeDelay: 1.1,
      eyes: [[30, 13, 10, 4], [62, 13, 11, 4]],
      cleanFrame: "assets/motion/wedding/women/v1/clean-frame.webp",
      accessories: [
        { type: "earrings", box: [26, 13, 6, 7], delay: 0.2 },
        { type: "earrings", box: [35, 13, 5, 7], delay: 0.7 },
        { type: "earrings", box: [59, 14, 5, 7], delay: 1.2 },
        { type: "earrings", box: [67, 13, 6, 7], delay: 1.7 }
      ],
      garments: [
        [[20,22],[27,20],[42,20],[47,27],[52,51],[50,90],[5,90],[10,53],[16,30]],
        [[55,23],[61,21],[76,21],[83,27],[94,52],[94,90],[50,90],[51,53],[53,31]]
      ]
    },
    "assets/wedding/men/outfit-caricature-03.jpeg": {
      canvas: [1122, 1402],
      eyeManifest: "assets/motion/wedding/men/v1/eyes.json",
      eyeMode: "blink",
      eyeDelay: 2,
      eyes: [[32, 14, 10, 4], [65, 15, 10, 4]],
      cleanFrame: "assets/motion/wedding/men/v1/clean-frame.webp",
      accessories: [
        { type: "hair", box: [29, 6, 16, 7], delay: 0.4 },
        { type: "hair", box: [62, 7, 17, 7], delay: 1.2 }
      ],
      garments: [
        [[20,22],[28,20],[42,20],[48,27],[51,49],[45,91],[20,91],[17,49],[18,29]],
        [[55,23],[62,21],[76,21],[84,28],[88,50],[84,91],[55,91],[52,50],[53,29]]
      ]
    }
  };

  const registry = new Map(
    Object.entries(specs).map(([source, spec]) => [source, buildPack(source, spec)])
  );

  config.events.forEach((event) => {
    ["women", "men"].forEach((groupKey) => {
      const images = event?.[groupKey]?.images;
      if (!Array.isArray(images)) return;
      images.forEach((image) => {
        if (!image || typeof image !== "object") return;
        const pack = registry.get(image.src);
        if (pack) image.motion = pack;
      });
    });
  });
})();
