import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PLANTS } from "../lib/njPlants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../public/plants");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function fetchWikiImage(query) {
  try {
    const title = encodeURIComponent(query.replace(/ /g, "_"));
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "NativeYardApp/1.0 (landscape-biodiversity-nj; contact@nativeyard.app)",
        "Accept": "application/json"
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.thumbnail ? data.thumbnail.source : null;
  } catch (err) {
    return null;
  }
}

async function downloadFile(url, filepath) {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filepath, buffer);
    return true;
  } catch (err) {
    return false;
  }
}

async function run() {
  console.log(`Starting plant image download for ${PLANTS.length} plants...`);
  const imageMap = {};

  // Additional aliases or fallbacks for specific plants where Wikipedia article name differs
  const customSearches = {
    "Rudbeckia hirta": "Rudbeckia hirta",
    "Pyrus calleryana": "Pyrus calleryana",
    "Buxus sempervirens": "Buxus sempervirens",
    "Hosta plantaginea": "Hosta plantaginea",
    "Symphyotrichum novae-angliae": "Symphyotrichum novae-angliae",
    "Solidago rugosa": "Solidago rugosa",
    "Asclepias incarnata": "Asclepias incarnata",
    "Vaccinium corymbosum": "Vaccinium corymbosum",
    "Ligustrum obtusifolium": "Ligustrum obtusifolium",
    "Kalmia latifolia": "Kalmia latifolia",
    "Cornus florida": "Cornus florida",
    "Hemerocallis fulva": "Hemerocallis fulva"
  };

  let count = 0;
  // Process unique plants
  for (const plant of PLANTS) {
    const slug = slugify(plant.sci);
    const dest = path.join(OUT_DIR, `${slug}.jpg`);
    const publicPath = `/plants/${slug}.jpg`;

    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      imageMap[plant.sci] = publicPath;
      continue;
    }

    // Try scientific name first
    let imgUrl = await fetchWikiImage(customSearches[plant.sci] || plant.sci);

    // Fallback: try genus if not found
    if (!imgUrl && plant.sci.includes(" ")) {
      const genus = plant.sci.split(" ")[0];
      imgUrl = await fetchWikiImage(genus);
    }

    // Fallback: try common name
    if (!imgUrl) {
      imgUrl = await fetchWikiImage(plant.common);
    }

    if (imgUrl) {
      const ok = await downloadFile(imgUrl, dest);
      if (ok) {
        imageMap[plant.sci] = publicPath;
        count++;
        console.log(`[${count}] Saved ${plant.common} (${plant.sci}) -> ${slug}.jpg`);
      } else {
        console.log(`[FAIL] Could not download image for ${plant.sci}`);
      }
    } else {
      console.log(`[NONE] No image found for ${plant.sci}`);
    }

    // Gentle pacing to respect Wikipedia API guidelines (100ms)
    await new Promise((r) => setTimeout(r, 120));
  }

  // Write mapping file
  const mapCode = `// Auto-generated plant image mapping
export const PLANT_IMAGES = ${JSON.stringify(imageMap, null, 2)};

export function getPlantImage(sci, common) {
  if (sci && PLANT_IMAGES[sci]) return PLANT_IMAGES[sci];
  return null;
}
`;

  fs.writeFileSync(path.join(__dirname, "../lib/plantImages.js"), mapCode);
  console.log(`\nFinished! Populated ${Object.keys(imageMap).length} plant images.`);
}

run();
