/**
 * Pre-computed high-accuracy plant detections and identifications for the 3 sample yard photos.
 * Used for instant demo/testing, or when API keys are not provided.
 */

export const SAMPLE_DATA = {
  "front-yard": {
    name: "Suburban NJ Front Yard",
    filename: "/samples/front-yard.jpg",
    description: "Classic New Jersey front foundation planting with a mix of invasives, ornamentals, and native keystones.",
    plants: [
      {
        id: "fy-1",
        box: [415, 85, 650, 275], // [ymin, xmin, ymax, xmax] (0-1000)
        common: "Japanese Barberry",
        sci: "Berberis thunbergii",
        kind: "shrub",
        confidence: 0.96,
        source: "demo",
        organ: "leaf"
      },
      {
        id: "fy-2",
        box: [430, 255, 635, 410],
        common: "Burning Bush",
        sci: "Euonymus alatus",
        kind: "shrub",
        confidence: 0.94,
        source: "demo",
        organ: "leaf"
      },
      {
        id: "fy-3",
        box: [520, 355, 680, 520],
        common: "Hosta",
        sci: "Hosta plantaginea",
        kind: "perennial",
        confidence: 0.98,
        source: "demo",
        organ: "leaf"
      },
      {
        id: "fy-4",
        box: [480, 498, 660, 640],
        common: "Boxwood",
        sci: "Buxus sempervirens",
        kind: "shrub",
        confidence: 0.95,
        source: "demo",
        organ: "leaf"
      },
      {
        id: "fy-5",
        box: [515, 595, 715, 775],
        common: "Black-eyed Susan & Coneflowers",
        sci: "Rudbeckia hirta",
        kind: "perennial",
        confidence: 0.92,
        source: "demo",
        organ: "flower"
      },
      {
        id: "fy-6",
        box: [40, 670, 675, 955],
        common: "Northern Red Oak",
        sci: "Quercus rubra",
        kind: "tree",
        confidence: 0.97,
        source: "demo",
        organ: "leaf"
      }
    ]
  },

  "back-yard": {
    name: "Pollinator Friendly Backyard",
    filename: "/samples/back-yard.jpg",
    description: "Vibrant garden border along a wooden fence featuring keystone perennials, shrubs, and an ivy-covered fence.",
    plants: [
      {
        id: "by-1",
        box: [30, 120, 465, 500],
        common: "Japanese Maple",
        sci: "Acer palmatum",
        kind: "tree",
        confidence: 0.95,
        source: "demo",
        organ: "leaf"
      },
      {
        id: "by-2",
        box: [390, 130, 600, 270],
        common: "Bigleaf Hydrangea",
        sci: "Hydrangea macrophylla",
        kind: "shrub",
        confidence: 0.93,
        source: "demo",
        organ: "flower"
      },
      {
        id: "by-3",
        box: [240, 335, 915, 520],
        common: "Swamp Milkweed",
        sci: "Asclepias incarnata",
        kind: "perennial",
        confidence: 0.97,
        source: "demo",
        organ: "flower"
      },
      {
        id: "by-4",
        box: [405, 435, 620, 635],
        common: "Wrinkleleaf Goldenrod",
        sci: "Solidago rugosa",
        kind: "perennial",
        confidence: 0.96,
        source: "demo",
        organ: "flower"
      },
      {
        id: "by-5",
        box: [545, 520, 930, 770],
        common: "New England Aster",
        sci: "Symphyotrichum novae-angliae",
        kind: "perennial",
        confidence: 0.94,
        source: "demo",
        organ: "flower"
      },
      {
        id: "by-6",
        box: [250, 560, 670, 835],
        common: "Highbush Blueberry",
        sci: "Vaccinium corymbosum",
        kind: "shrub",
        confidence: 0.91,
        source: "demo",
        organ: "leaf"
      },
      {
        id: "by-7",
        box: [80, 825, 710, 1000],
        common: "English Ivy",
        sci: "Hedera helix",
        kind: "vine",
        confidence: 0.99,
        source: "demo",
        organ: "leaf"
      }
    ]
  },

  "side-yard": {
    name: "Woodland Edge Side Yard",
    filename: "/samples/side-yard.jpg",
    description: "Side property boundary with overgrown invasive hedgerows mixed with native understory trees.",
    plants: [
      {
        id: "sy-1",
        box: [100, 130, 535, 520],
        common: "Callery (Bradford) Pear",
        sci: "Pyrus calleryana",
        kind: "tree",
        confidence: 0.94,
        source: "demo",
        organ: "leaf"
      },
      {
        id: "sy-2",
        box: [510, 275, 785, 475],
        common: "Border Privet",
        sci: "Ligustrum obtusifolium",
        kind: "shrub",
        confidence: 0.92,
        source: "demo",
        organ: "leaf"
      },
      {
        id: "sy-3",
        box: [490, 420, 800, 595],
        common: "Multiflora Rose",
        sci: "Rosa multiflora",
        kind: "shrub",
        confidence: 0.95,
        source: "demo",
        organ: "flower"
      },
      {
        id: "sy-4",
        box: [560, 530, 920, 765],
        common: "Mountain Laurel",
        sci: "Kalmia latifolia",
        kind: "shrub",
        confidence: 0.93,
        source: "demo",
        organ: "flower"
      },
      {
        id: "sy-5",
        box: [225, 545, 680, 955],
        common: "Flowering Dogwood",
        sci: "Cornus florida",
        kind: "tree",
        confidence: 0.95,
        source: "demo",
        organ: "leaf"
      },
      {
        id: "sy-6",
        box: [685, 760, 995, 995],
        common: "Orange Daylily",
        sci: "Hemerocallis fulva",
        kind: "perennial",
        confidence: 0.97,
        source: "demo",
        organ: "flower"
      }
    ]
  }
};
