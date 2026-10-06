import fs from "node:fs";
import path from "node:path";

const root =
  "/tmp/vietnamese-provinces-database/dataset-generation-scripts/resources/gis/geojson_11Mar2026";

const outputDir = path.join(
  process.cwd(),
  "public/data/provinces"
);

fs.mkdirSync(outputDir, { recursive: true });

const provinceFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, {
    withFileTypes: true,
  })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.name === "province.geojson") {
      provinceFiles.push(fullPath);
    }
  }
}

walk(root);

console.log(`Tìm thấy ${provinceFiles.length} file province.geojson`);

const features = [];

for (const file of provinceFiles) {
  try {
    const data = JSON.parse(
      fs.readFileSync(file, "utf8")
    );

    for (const feature of data.features ?? []) {
      const p = feature.properties ?? {};

      const name =
        p.name ??
        p.Name ??
        p.fullName ??
        p.FullName ??
        "";

      const fullName =
        p.fullName ??
        p.FullName ??
        name;

      const code =
        p.code ??
        p.Code ??
        p.province_code ??
        p.ProvinceCode ??
        "";

      const nameEn =
        p.nameEn ??
        p.NameEn ??
        p.name_en ??
        "";

      features.push({
        type: "Feature",
        geometry: feature.geometry,
        properties: {
          code: String(code),
          name: String(name),
          fullName: String(fullName),
          nameEn: String(nameEn),
        },
      });
    }
  } catch (error) {
    console.error(`Lỗi đọc: ${file}`);
    console.error(error);
  }
}

const result = {
  type: "FeatureCollection",
  features,
};

const output = path.join(
  outputDir,
  "vietnam-34-tinh-named.geojson"
);

fs.writeFileSync(
  output,
  JSON.stringify(result)
);

console.log("");
console.log(`Đã tạo: ${output}`);
console.log(`Số tỉnh/thành: ${features.length}`);

console.log("");
console.log("Danh sách:");

for (const feature of features) {
  console.log(
    `${feature.properties.code} - ${feature.properties.name}`
  );
}
