const fs = require("node:fs");
const path = require("node:path");
const directory = path.join(__dirname,"boundaries");
const snapshots = fs.readdirSync(directory).filter((name)=>name.endsWith(".geojson")).map((filename)=>{
  const match = filename.match(/world_(bc)?(\d+)/);
  const year = Number(match[2]) * (match[1] ? -1 : 1);
  const collection = JSON.parse(fs.readFileSync(path.join(directory,filename),"utf8"));
  const features = collection.features.filter((feature)=>{
    if (!feature.geometry || !feature.properties.NAME) return false;
    const points = feature.geometry.coordinates.flat(feature.geometry.type === "MultiPolygon" ? 2 : 1);
    return points.some(([lon,lat])=>lon>=-12 && lon<=40 && lat>=27 && lat<=49);
  });
  return {year,filename,features};
}).sort((a,b)=>a.year-b.year);
fs.writeFileSync(path.join(__dirname,"boundaries.js"),"window.ATLAS_BOUNDARIES = " + JSON.stringify(snapshots) + ";\n");
console.log(`Prepared ${snapshots.length} historical boundary snapshots.`);
