import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const geojson = JSON.parse(
  fs.readFileSync("public/data/lam-dong-124-xa.geojson", "utf8")
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const { data: wards, error } = await supabase
  .from("wards")
  .select("id,name,type")
  .eq("province_code", "68");

if (error) throw error;

const normalize = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^phuong\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

let updated = 0;

for (const feature of geojson.features) {
  const p = feature.properties;

  const ward = wards.find(
    (w) =>
      normalize(w.name) === normalize(p.name) &&
      normalize(w.type) === normalize(p.type)
  );

  // 3 phường Bảo Lộc có tên khác nhau giữa GeoJSON và DB
  const special = {
    "1 Bảo Lộc": "Phường 1 Bảo Lộc",
    "2 Bảo Lộc": "Phường 2 Bảo Lộc",
    "3 Bảo Lộc": "Phường 3 Bảo Lộc",
  };

  const matched =
    ward ||
    wards.find(
      (w) =>
        w.name === special[p.name] &&
        normalize(w.type) === normalize(p.type)
    );

  if (!matched) {
    console.log("❌ Không tìm thấy:", p.id, p.name, p.type);
    continue;
  }

  const { error: updateError } = await supabase
    .from("wards")
    .update({ code: String(p.id) })
    .eq("id", matched.id);

  if (updateError) {
    console.log("❌ Lỗi:", matched.name, updateError.message);
    continue;
  }

  updated++;
  console.log("✅", p.id, "→", matched.name);
}

console.log(`\nHoàn tất: ${updated}/${geojson.features.length}`);