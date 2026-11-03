const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Read .env.local
const envContent = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
for (const line of envContent.split("\n")) {
  const [k, ...v] = line.split("=");
  if (k && v.length) process.env[k.trim()] = v.join("=").trim();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const masterPlants = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../data/master-nj-plants.json"), "utf8")
  );

  console.log(`Loaded ${masterPlants.length} plants to seed into Supabase...`);

  const records = masterPlants.map((p) => ({
    id: p.id,
    scientific_name: p.scientificName,
    common_name: p.commonName,
    synonyms: p.synonyms || [],
    status: p.status,
    nj_status: p.njStatus,
    type: p.type,
    growth_habit: p.growthHabit,
    sun: p.sun,
    moisture: p.moisture,
    bloom: p.bloom,
    height: p.height,
    lepidoptera: p.lepidoptera || 0,
    specialist_bee_support: Boolean(p.specialistBeeSupport),
    deer_resistance: p.deerResistance || "MODERATE",
    description: p.description,
    image_url: p.image,
    swap_plant_ids: p.swapIds || [],
    removal: p.removal || null,
  }));

  // Batch upsert in chunks of 50
  const chunkSize = 50;
  let inserted = 0;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error } = await supabase.from("plants").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.warn(`Chunk ${i} error:`, error.message);
    } else {
      inserted += chunk.length;
      console.log(`Upserted ${inserted} / ${records.length} plants`);
    }
  }

  console.log("Seeding complete!");
}

seed().catch(console.error);
