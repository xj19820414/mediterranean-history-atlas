const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = __dirname;
const types = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json"};
const port = Number(process.env.PORT || 4175);
http.createServer((request,response) => {
  let filename;
  try {
    filename = path.resolve(root, "." + decodeURIComponent(new URL(request.url, "http://localhost").pathname));
  } catch {
    response.writeHead(400); response.end("Bad request"); return;
  }
  if (filename === root) filename = path.join(root,"index.html");
  if (!filename.startsWith(root + path.sep)) { response.writeHead(403); response.end("Forbidden"); return; }
  fs.readFile(filename,(error,content) => {
    if (error) { response.writeHead(404); response.end("Not found"); return; }
    response.writeHead(200,{"Content-Type":types[path.extname(filename)] || "application/octet-stream"});
    response.end(content);
  });
}).listen(port,"127.0.0.1",() => console.log(`Atlas: http://127.0.0.1:${port}`));
