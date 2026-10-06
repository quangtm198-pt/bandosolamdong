import fs from "node:fs";
import path from "node:path";

const root =
  "/tmp/vietnamese-provinces-database/dataset-generation-scripts/resources/gis/geojson_11Mar2026";

const output =
  path.join(
    process.cwd(),
    "public/data/provinces/surrounding-wards.geojson"
  );

if (!fs.existsSync(root)) {
  console.error("❌ Không tìm thấy dữ liệu:");
  console.error(root);
  process.exit(1);
}

const provinceFolders = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((x) => x.isDirectory());

const features = [];

for (const folder of provinceFolders) {
  const provinceDir = path.join(root, folder.name);
  const provinceFile = path.join(
    provinceDir,
    "province.geojson"
  );

  if (!fs.existsSync(provinceFile)) continue;

  let provinceData;

  try {
    provinceData = JSON.parse(
      fs.readFileSync(provinceFile, "utf8")
    );
  } catch {
    continue;
  }

  const provinceFeature =
    provinceData.features?.[0];

  if (!provinceFeature) continue;

  const provinceProperties =
    provinceFeature.properties ?? {};

  const provinceName =
    provinceProperties.name ??
    provinceProperties.fullName ??
    provinceProperties.NAME ??
    folder.name;

  const wardsDir = path.join(
    provinceDir,
    "wards"
  );

  if (!fs.existsSync(wardsDir)) continue;

  const wardFiles = fs
    .readdirSync(wardsDir)
    .filter((file) =>
      file.toLowerCase().endsWith(".geojson")
    );

  for (const file of wardFiles) {
    const filePath = path.join(
      wardsDir,
      file
    );

    try {
      const data = JSON.parse(
        fs.readFileSync(filePath, "utf8")
      );

      for (const feature of data.features ?? []) {
        const p = feature.properties ?? {};

        features.push({
          type: "Feature",
          properties: {
            name:
              p.name ??
              p.fullName ??
              "",

            fullName:
              p.fullName ??
              p.name ??
              "",

            province:
              provinceName,

            provinceCode:
              provinceProperties.code ??
              provinceProperties.provinceCode ??
              "",

            wardCode:
              p.code ??
              p.wardCode ??
              "",

            type:
              p.type ??
              p.typeName ??
              "",

            isLamDong:
              provinceName
                .toString()
                .toLowerCase()
                .includes("lâm đồng"),
          },

          geometry:
            feature.geometry,
        });
      }
    } catch {
      console.warn(
        "⚠️ Không đọc được:",
        filePath
      );
    }
  }
}

fs.mkdirSync(
  path.dirname(output),
  { recursive: true }
);

fs.writeFileSync(
  output,
  JSON.stringify({
    type: "FeatureCollection",
    features,
  })
);

console.log("");
console.log(
  `✅ Đã tạo ${features.length} xã/phường/đặc khu`
);
console.log("");
console.log(output);
