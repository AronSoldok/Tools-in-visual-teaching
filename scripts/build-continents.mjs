import { copyFileSync, readFileSync, statSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { feature, merge } from "topojson-client";
import { geoCentroid } from "d3-geo";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const geoDir = join(root, "public/geo");

copyFileSync(
  join(root, "node_modules/world-atlas/countries-50m.json"),
  join(geoDir, "world-countries-50m.json"),
);
console.log("Copied world-countries-50m.json");

const EARTH_TEXTURE_URL =
  "https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg";
const earthTexturePath = join(geoDir, "earth-topography.jpg");
const MIN_TEXTURE_BYTES = 3_000_000;

async function ensureEarthTexture() {
  try {
    const currentSize = statSync(earthTexturePath).size;
    if (currentSize >= MIN_TEXTURE_BYTES) {
      console.log("Earth texture already high-res, skipping download");
      return;
    }
  } catch {
    // file missing — download below
  }

  const res = await fetch(EARTH_TEXTURE_URL);
  if (!res.ok) {
    console.warn("Could not download earth texture:", res.status);
    return;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(earthTexturePath, buffer);
  console.log("Downloaded earth-topography.jpg", buffer.length, "bytes");
}

await ensureEarthTexture();

const topology = JSON.parse(
  readFileSync(join(root, "node_modules/world-atlas/countries-110m.json"), "utf8"),
);
const countries = feature(topology, topology.objects.countries);

/** Assign continent by centroid heuristics (110m scale, teaching use). */
function continentForFeature(f) {
  const [lon, lat] = geoCentroid(f);
  const id = String(f.id);

  // Manual overrides for edge cases at 110m resolution
  const overrides = {
    "643": "europe", // Russia -> Asia for eastern part handled below
    "792": "asia", // Turkey
    "376": "asia", // Israel
    "818": "africa", // Egypt
    "732": "africa", // W. Sahara
    "242": "oceania", // Fiji
    "360": "asia", // Indonesia
    "608": "asia", // Philippines
    "356": "asia", // India
    "586": "asia", // Pakistan
    "050": "asia", // Bangladesh
    "144": "asia", // Sri Lanka
    "116": "asia", // Cambodia
    "704": "asia", // Vietnam
    "418": "asia", // Laos
    "764": "asia", // Thailand
    "104": "asia", // Myanmar
    "496": "asia", // Mongolia
    "398": "asia", // Kazakhstan
    "417": "asia", // Kyrgyzstan
    "762": "asia", // Tajikistan
    "860": "asia", // Uzbekistan
    "795": "asia", // Turkmenistan
    "031": "asia", // Azerbaijan
    "051": "asia", // Armenia
    "268": "asia", // Georgia
    "196": "asia", // Cyprus
    "275": "asia", // Palestine
    "400": "asia", // Jordan
    "422": "asia", // Lebanon
    "760": "asia", // Syria
    "368": "asia", // Iraq
    "414": "asia", // Kuwait
    "682": "asia", // Saudi Arabia
    "784": "asia", // UAE
    "512": "asia", // Oman
    "887": "asia", // Yemen
    "634": "asia", // Qatar
    "048": "asia", // Bahrain
    "533": "north_america", // Aruba etc - Caribbean -> NA
    "212": "north_america",
    "308": "north_america",
    "312": "north_america",
    "332": "north_america",
    "388": "north_america",
    "474": "north_america",
    "500": "north_america",
    "630": "north_america",
    "659": "north_america",
    "662": "north_america",
    "670": "north_america",
    "780": "north_america",
    "796": "north_america",
    "850": "north_america",
    "092": "north_america",
    "044": "north_america",
    "028": "north_america",
    "052": "north_america",
    "084": "north_america",
    "320": "north_america",
    "340": "north_america",
    "558": "north_america",
    "591": "south_america",
    "254": "south_america",
    "328": "south_america",
    "740": "south_america",
    "862": "south_america",
    "076": "south_america",
    "068": "south_america",
    "152": "south_america",
    "170": "south_america",
    "218": "south_america",
    "600": "south_america",
    "858": "south_america",
    "604": "south_america",
    "238": "south_america",
    "239": "south_america",
    "184": "oceania",
    "316": "oceania",
    "520": "oceania",
    "540": "oceania",
    "570": "oceania",
    "574": "oceania",
    "581": "oceania",
    "583": "oceania",
    "584": "oceania",
    "585": "oceania",
    "598": "oceania",
    "612": "oceania",
    "626": "oceania",
    "772": "oceania",
    "776": "oceania",
    "798": "oceania",
    "882": "oceania",
  };
  if (overrides[id]) return overrides[id];

  if (lat < -60) return "antarctica";
  if (id === "643" && lon > 60) return "asia";
  if (id === "643") return "europe";

  if (lon >= 110 && lat < 10 && lat > -50) return "oceania";
  if (lon >= -180 && lon < -100 && lat < 0 && lat > -30) return "oceania";

  if (lon >= -170 && lon < -35) {
    if (lat < 14) return "south_america";
    return "north_america";
  }
  if (lon >= -35 && lon < 55) {
    if (lat >= -35 && lat <= 38) return "africa";
    if (lat > 38) return "europe";
    return "south_america";
  }
  if (lon >= 55 && lon <= 180 && lat > -10) return "asia";
  if (lat < -10 && lon > 90 && lon < 180) return "oceania";

  if (lat > 35 && lon >= -25 && lon < 60) return "europe";
  if (lat >= -35 && lat <= 37 && lon >= -20 && lon < 55) return "africa";

  return "asia";
}

const CONTINENT_NAMES = {
  africa: "Africa",
  antarctica: "Antarctica",
  asia: "Asia",
  europe: "Europe",
  north_america: "North America",
  oceania: "Oceania",
  south_america: "South America",
};

const byContinent = {};
for (const f of countries.features) {
  const continent = continentForFeature(f);
  if (!byContinent[continent]) byContinent[continent] = [];
  byContinent[continent].push(f);
}

const features = [];
for (const [continentId, feats] of Object.entries(byContinent)) {
  const geometries = feats.map((f) => {
    const geom = topology.objects.countries.geometries.find(
      (g) => String(g.id) === String(f.id),
    );
    return geom;
  }).filter(Boolean);

  if (geometries.length === 0) continue;

  try {
    const merged = merge(topology, geometries);
    features.push({
      type: "Feature",
      id: continentId,
      properties: { id: continentId, name: CONTINENT_NAMES[continentId] },
      geometry: merged,
    });
  } catch {
    features.push({
      type: "Feature",
      id: continentId,
      properties: { id: continentId, name: CONTINENT_NAMES[continentId] },
      geometry: {
        type: "GeometryCollection",
        geometries: feats.map((f) => f.geometry),
      },
    });
  }
}

const out = { type: "FeatureCollection", features };
writeFileSync(
  join(root, "public/geo/continents-110m.json"),
  JSON.stringify(out),
);
console.log("Wrote continents-110m.json with", features.length, "continents");
