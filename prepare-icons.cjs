const fs = require("node:fs");
let html = fs.readFileSync("index.html","utf8");
for (const name of ["zoom-in","zoom-out","maximize"]) {
  const svg = fs.readFileSync(`vendor/${name}.svg`);
  html = html.replace(`src="vendor/${name}.svg"`, `src="data:image/svg+xml;base64,${svg.toString("base64")}"`);
}
fs.writeFileSync("index.html",html);
