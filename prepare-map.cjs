const fs = require("node:fs");
// Mechanical conversion keeps the map usable through file:// without fetch.
const land = JSON.parse(fs.readFileSync("land.geojson", "utf8"));
fs.writeFileSync("land.js", "window.ATLAS_LAND = " + JSON.stringify(land) + ";\n");
