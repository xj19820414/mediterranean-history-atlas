(() => {
  const $ = (id) => document.getElementById(id);
  const annotations = window.ATLAS_ANNOTATIONS;
  const project = ([lon, lat]) => [(lon + 12) / 52 * 760, (49 - lat) / 22 * 430];
  const yearIndex = (year) => year < 0 ? year + 1 : year;
  const format = (year) => year < 0 ? `公元前 ${-year} 年` : `公元 ${year} 年`;
  const chinese = (name) => window.ATLAS_LABELS_ZH[name] || "名称待考";
  let transform = {x:0, y:0, k:1};
  let records = [];
  let currentYear;
  let snapshotYear;
  let selectedKey = "";
  let query = "";
  let labelSnapshot;
  let polityRecords = [];
  const reference = (source) => {
    const link = document.createElement("a");
    link.href = `https://en.wikipedia.org/wiki/${encodeURIComponent(source)}`;
    link.textContent = "参考条目 ↗";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  };
  const addText = (parent, tag, text) => {
    const node = document.createElement(tag);
    node.textContent = text;
    parent.appendChild(node);
    return node;
  };
  function labels(stage) {
    if (labelSnapshot === stage.year) return polityRecords;
    labelSnapshot = stage.year;
    const subjects = new Map();
    for (const feature of stage.features) {
      const subject = feature.properties.SUBJECTO || feature.properties.NAME;
      const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
      if (!subjects.has(subject)) subjects.set(subject, []);
      subjects.get(subject).push(...polygons);
    }
    polityRecords = [];
    // Choose an interior point in the visible part of the territory, rather than a centroid in the sea.
    for (const [subject, polygons] of subjects) {
      const candidates = [];
      const inPolygon = ([lon,lat]) => polygons.some((polygon) =>
        d3.polygonContains(polygon[0], [lon,lat]) &&
        !polygon.slice(1).some((hole) => d3.polygonContains(hole,[lon,lat])));
      for (let lat=28; lat<=48; lat+=.55) for (let lon=-11; lon<=39; lon+=.65) {
        if (inPolygon([lon,lat])) candidates.push([lon,lat]);
      }
      if (!candidates.length) continue;
      const mean = [d3.mean(candidates, (p)=>p[0]),d3.mean(candidates,(p)=>p[1])];
      const center = candidates.reduce((best,p) => Math.hypot(p[0]-mean[0],p[1]-mean[1]) < Math.hypot(best[0]-mean[0],best[1]-mean[1]) ? p : best);
      const anchors = candidates.sort((a,b)=>Math.hypot(a[0]-center[0],a[1]-center[1])-Math.hypot(b[0]-center[0],b[1]-center[1]));
      polityRecords.push({key:`polity:${subject}`,kind:"polity",subject,label:chinese(subject),point:center,anchors,sourceName:subject,weight:candidates.length});
    }
    return polityRecords.sort((a,b)=>b.weight-a.weight);
  }
  function render(year, stage) {
    currentYear = year;
    snapshotYear = stage.year;
    records = [...labels(stage)];
    const grouped = new Map();
    function group(kind, record, location) {
      const key = `${kind}:${location.point.join(",")}`;
      if (!grouped.has(key)) grouped.set(key,{key,kind,point:location.point,items:[],label:""});
      grouped.get(key).items.push({...record,...location});
    }
    for (const [date,title,description,region,source] of window.historyData.events) {
      if (Math.abs(yearIndex(date)-yearIndex(year)) > 50) continue;
      group("event",{title,description,date,source},annotations.events[date]);
    }
    const seen = new Set();
    for (const [region,start,end,title,description,source] of [...window.historyData.rulers,...window.historyData.people]) {
      if (year<start || year>end || seen.has(source)) continue;
      seen.add(source);
      const location = annotations.people[source];
      if (location) group("person",{title,description,start,end,source},location);
    }
    for (const group of grouped.values()) {
      group.label = group.items.map((item)=>item.title).join("\n");
      records.push(group);
    }
    $("mapAnnotations").replaceChildren();
    for (const record of records) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `atlas-label ${record.kind}-label`;
      button.dataset.key = record.key;
      button.textContent = record.label;
      button.title = record.kind === "polity" ? `${record.label} · ${format(stage.year)} 边界快照` : record.items.map((item)=>`${item.title} · ${item.place}`).join("\n");
      button.setAttribute("aria-label", `${record.kind === "polity" ? "政权" : record.kind === "event" ? "事件" : "人物"}：${record.label}`);
      button.addEventListener("click",()=>show(record));
      $("mapAnnotations").appendChild(button);
      record.node = button;
    }
    const selected = records.find((record)=>record.key===selectedKey);
    if (selected) show(selected); else { selectedKey=""; $("annotationSummary").hidden=true; }
    layout();
  }
  function show(record) {
    selectedKey = record.key;
    if (record.kind === "polity") {
      document.querySelector("#boundaryKey [data-subject]") &&
      [...$("boundaryKey").children].find((item)=>item.dataset.subject===record.subject)?.click();
    }
    $("annotationSummary").hidden=false;
    $("annotationTitle").textContent = record.kind === "event" ? "历史事件" : record.kind === "person" ? "历史人物" : "地图政权";
    const body=$("annotationBody");
    body.replaceChildren();
    if (record.kind==="polity") {
      addText(body,"strong",record.label);
      addText(body,"p",`边界快照：${format(snapshotYear)}`);
      addText(body,"p",`原数据名称：${record.sourceName}`);
    } else {
      for (const item of record.items) {
        addText(body,"strong",item.title);
        addText(body,"p",record.kind==="event" ? `事件年份：${format(item.date)}` : `生平 / 任期：${format(item.start)} — ${format(item.end)}`);
        addText(body,"p",item.description);
        addText(body,"p",`${item.place} · ${item.precision || item.relation}`);
        body.appendChild(reference(item.source));
      }
      addText(body,"small",`所选年份：${format(currentYear)} · 标记为关联地点示意`);
    }
    for (const item of records) item.node.classList.toggle("annotation-selected",item===record);
  }
  function layout() {
    const stage=$("mapStage");
    const occupied=[];
    const scaleX=stage.clientWidth/760, scaleY=stage.clientHeight/430;
    // Events and people get priority; compact names appear as space permits and more become visible when zooming.
    const ordered=[...records].sort((a,b)=>({event:0,person:1,polity:2}[a.kind]-{event:0,person:1,polity:2}[b.kind]));
    const overlays=[...stage.querySelectorAll(".map-controls,.map-legend"), ...stage.querySelectorAll("#mapPins:not([hidden]) .region-pin")];
    const stageBox=stage.getBoundingClientRect();
    for(const overlay of overlays) {
      const rect=overlay.getBoundingClientRect();
      occupied.push({x:rect.left-stageBox.left,y:rect.top-stageBox.top,w:rect.width,h:rect.height});
    }
    for (const record of ordered) {
      const enabled=$(record.kind==="polity"?"showPolityNames":record.kind==="event"?"showMapEvents":"showMapPeople").checked;
      const match=record.kind!=="polity" || !query || `${record.label} ${record.subject}`.toLowerCase().includes(query);
      record.node.hidden = !enabled || !match;
      if (record.node.hidden) continue;
      const w=record.node.offsetWidth,h=record.node.offsetHeight;
      const offsets=record.kind==="polity"?[[0,0]]:[[0,-18],[0,18],[0,-42],[0,42],[0,-66],[0,66]];
      let box;
      const anchors=record.kind==="polity" ? record.anchors : [record.point];
      for(const anchor of anchors) {
        const [px,py]=project(anchor);
        const x=(px*transform.k+transform.x)*scaleX, y=(py*transform.k+transform.y)*scaleY;
        for(const [dx,dy] of offsets) {
        const candidate={x:x+dx-w/2,y:y+dy-h/2,w,h};
        if(candidate.x<3 || candidate.y<3 || candidate.x+w>stage.clientWidth-3 || candidate.y+h>stage.clientHeight-3) continue;
        if(occupied.some((other)=>candidate.x<other.x+other.w+3 && candidate.x+w+3>other.x && candidate.y<other.y+other.h+3 && candidate.y+h+3>other.y)) continue;
        box=candidate;break;
        }
        if(box) break;
      }
      if(!box) {record.node.hidden=true;continue;}
      record.node.style.left=`${box.x}px`; record.node.style.top=`${box.y}px`;
      occupied.push(box);
    }
  }
  for(const id of ["showPolityNames","showMapEvents","showMapPeople","showRegions"]) $(id).addEventListener("change",layout);
  new ResizeObserver(layout).observe($("mapStage"));
  window.AtlasAnnotations={render,zoom(value){transform=value;layout();},filter(value){query=value;layout();}};
})();
