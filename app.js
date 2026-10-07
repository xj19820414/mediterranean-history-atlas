const data = window.historyData;
const $ = (id) => document.getElementById(id);
const slider = $("yearSlider");
let timer = null;
let selected = "egypt";
let boundaryRenderKey = "";
let chosenSubject = "";
const boundaryNames = new Set();
const minIndex = -999;
const maxIndex = 1453;
const yearToIndex = (year) => year < 0 ? year + 1 : year;
const indexToYear = (index) => index <= 0 ? index - 1 : index;
const formatYear = (year) => year < 0 ? `公元前 ${-year} 年` : `公元 ${year} 年`;
const inRange = (year, start, end) => year >= start && year <= end;
const periodFor = (region, year) => region.periods.find(([start, end]) => inRange(year, start, end));
const position = (year) => ((yearToIndex(year) - minIndex) / (maxIndex - minIndex)) * 100;
const sourceLink = (page, label = "参考条目") => `<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(page)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
const boundaryStageFor = (year) => [...window.ATLAS_BOUNDARIES].reverse().find((stage) => stage.year <= year) || window.ATLAS_BOUNDARIES[0];
const escapeText = (value) => String(value).replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const polityLabels = {
  "Egypt":"埃及", "Roman Empire":"罗马帝国", "Roman Republic":"罗马共和国",
  "Western Roman Empire":"西罗马帝国", "Eastern Roman Empire":"东罗马帝国",
  "Byzantine Empire":"拜占庭帝国", "Ottoman Empire":"奥斯曼帝国",
  "Carthaginian Empire":"迦太基势力", "Carthage":"迦太基",
  "Ptolemaic Kingdom":"托勒密王国", "Seleucid Kingdom":"塞琉古王国",
  "Achaemenid Empire":"阿契美尼德帝国", "Mamluke Sultanate":"马穆鲁克苏丹国",
  "Fatimid Caliphate":"法蒂玛哈里发国", "Venice":"威尼斯",
  "Macedon and Hellenic League":"马其顿与希腊联盟", "France":"法国",
  "Holy Roman Empire":"神圣罗马帝国"
};
const polityLabel = (name) => polityLabels[name] ? `${polityLabels[name]} · ${name}` : name;
const boundaryColor = (subject) => {
  const hash = [...subject].reduce((value,char)=>(value*31+char.charCodeAt(0))>>>0,0);
  return `hsl(${hash%360} 42% 60%)`;
};
const geometryPath = (feature) => {
  const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  return polygons.map((polygon)=>polygon.map((ring)=>ring.map((point,i)=>`${i?"L":"M"}${project(point).map((v)=>v.toFixed(2)).join(",")}`).join("")+"Z").join("")).join("");
};

function render(year, follow = true) {
  const active = data.regions.filter((region) => periodFor(region, year));
  const nearby = data.events.filter(([date]) => Math.abs(yearToIndex(date) - yearToIndex(year)) <= 50);
  $("yearLabel").textContent = formatYear(year);
  $("yearSlider").setAttribute("aria-valuetext", formatYear(year));
  $("yearEra").value = year < 0 ? "bce" : "ce";
  $("yearInput").value = Math.abs(year) || 1;
  $("eraLabel").textContent = year < -500 ? "早期铁器时代" : year < -323 ? "古典时代" : year < -27 ? "希腊化与共和国时期" : year < 476 ? "罗马帝国时期" : "中世纪";
  $("sliderProgress").style.width = `${position(year)}%`;
  $("activeCount").textContent = active.length;
  $("eventCount").textContent = nearby.length;
  renderBoundaries(year);
  $("polityGrid").innerHTML = active.map((region) => {
    const period = periodFor(region, year);
    const rulers = data.rulers.filter(([id,start,end]) => id === region.id && inRange(year,start,end));
    return `<button type="button" class="polity-card ${selected === region.id ? "active" : ""}" data-region="${region.id}" style="--region-color:${region.color}" aria-pressed="${selected === region.id}">
      <span class="polity-top"><span class="polity-dot"></span><span class="polity-dynasty">${region.name}</span></span>
      <h3>${period[2]}</h3><span class="polity-dynasty">${period[3]}</span>
      <span class="polity-ruler">当年统治者 / 执政者<strong>${rulers.length ? rulers.map((r) => r[3]).join("、") : "任期资料未录入"}</strong></span></button>`;
  }).join("");
  $("eventsList").innerHTML = nearby.length ? nearby.map(([date,title,description,id,source]) => `<article class="event-item"><div class="event-year">${formatYear(date)}</div><div><h3>${title}</h3><p>${description}</p><div class="event-location">${data.regions.find((r) => r.id === id).name} · ${sourceLink(source)}</div><button class="event-jump" data-year="${date}">定位该年</button></div></article>`).join("") : `<p class="empty-events">该年前后 50 年暂无已录入事件。</p>`;
  $("timelineMarker").style.left = `${position(year)}%`;
  $("timelineMarker").textContent = formatYear(year);
  for (const pin of document.querySelectorAll(".region-pin")) {
    const period = periodFor(data.regions.find((r) => r.id === pin.dataset.region), year);
    pin.classList.toggle("selected", pin.dataset.region === selected);
    pin.setAttribute("aria-pressed", String(pin.dataset.region === selected));
    pin.title = `${pin.textContent} · ${period ? period[2] : "未录入"}`;
  }
  renderDetail(year);
  if (follow) {
    const scroller = $("timelineScroller");
    const x = position(year) / 100 * $("timelineTrack").clientWidth;
    scroller.scrollLeft = Math.max(0, x - scroller.clientWidth / 2);
  }
}

function renderBoundaries(year) {
  const stage = boundaryStageFor(year);
  const key = `${stage.year}:${$("compareBoundaries").checked}`;
  if (key === boundaryRenderKey) { selectBoundary(chosenSubject); return; }
  boundaryRenderKey = key;
  $("boundaryLabel").textContent = `边界快照：${formatYear(stage.year)} · 历史重建`;
  $("mapBoundaries").dataset.snapshot = stage.year;
  $("mapBoundaries").replaceChildren();
  boundaryNames.clear();
  $("snapshotSelect").value = stage.year;
  const stageIndex = window.ATLAS_BOUNDARIES.indexOf(stage);
  $("previousBoundary").disabled = stageIndex === 0;
  $("nextBoundary").disabled = stageIndex === window.ATLAS_BOUNDARIES.length - 1;
  for (const feature of stage.features) {
    const name = feature.properties.NAME;
    const subject = feature.properties.SUBJECTO || name;
    boundaryNames.add(subject);
    const path = document.createElementNS("http://www.w3.org/2000/svg","path");
    path.setAttribute("d",geometryPath(feature));
    path.setAttribute("fill",boundaryColor(subject));
    path.setAttribute("class","historical-boundary");
    path.dataset.subject = subject;
    path.setAttribute("tabindex","0");
    path.setAttribute("role","button");
    path.setAttribute("aria-label",`${polityLabel(name)} · ${polityLabel(subject)}`);
    const title = document.createElementNS("http://www.w3.org/2000/svg","title");
    title.textContent = `${polityLabel(name)} · ${polityLabel(subject)} · ${formatYear(stage.year)}`;
    path.appendChild(title);
    const show = ()=>{
      selectBoundary(subject);
    };
    path.addEventListener("click",show);
    path.addEventListener("keydown",(event)=>{if(event.key==="Enter" || event.key===" "){event.preventDefault();show();}});
    $("mapBoundaries").appendChild(path);
  }
  $("boundaryKey").innerHTML = [...boundaryNames].sort().map((name)=>`<button type="button" class="boundary-key-item" data-subject="${escapeText(name)}" aria-pressed="false"><i style="background:${boundaryColor(name)}"></i>${escapeText(polityLabel(name))}</button>`).join("");
  $("previousBoundaries").replaceChildren();
  const previous = window.ATLAS_BOUNDARIES[stageIndex - 1];
  if ($("compareBoundaries").checked && previous) {
    for (const feature of previous.features) {
      const path = document.createElementNS("http://www.w3.org/2000/svg","path");
      path.setAttribute("d",geometryPath(feature));
      $("previousBoundaries").appendChild(path);
    }
    $("boundaryLabel").textContent += ` · 虚线对照 ${formatYear(previous.year)}`;
  }
  if (!boundaryNames.has(chosenSubject)) chosenSubject = "";
  applyBoundaryFilter();
  selectBoundary(chosenSubject);
}

function selectBoundary(subject) {
  chosenSubject = subject;
  for (const item of $("mapBoundaries").children) item.classList.toggle("chosen", !!subject && item.dataset.subject === subject);
  for (const item of $("boundaryKey").children) item.setAttribute("aria-pressed", String(item.dataset.subject === subject));
  const stage = boundaryStageFor(indexToYear(Number(slider.value)));
  $("boundarySelection").textContent = subject ? `${polityLabel(subject)} · ${formatYear(stage.year)} 快照` : `当前快照收录 ${boundaryNames.size} 个政权 / 文化区域（包含地图外延）`;
  $("boundarySummary").hidden = !subject;
  if (subject) {
    const territories = [...new Set(stage.features.filter((feature)=>(feature.properties.SUBJECTO || feature.properties.NAME) === subject).map((feature)=>feature.properties.NAME))];
    $("boundarySummaryBody").innerHTML = `<strong>${escapeText(polityLabel(subject))}</strong><p>边界年代：${formatYear(stage.year)}</p><p>所选年份：${formatYear(indexToYear(Number(slider.value)))}</p><p>${territories.map((name)=>escapeText(polityLabel(name))).join("、")}</p><a href="https://github.com/aourednik/historical-basemaps/blob/master/geojson/${stage.filename}" target="_blank" rel="noopener noreferrer">边界原始数据 ↗</a>`;
  }
}

function applyBoundaryFilter() {
  const query = $("boundarySearch").value.trim().toLowerCase();
  let count = 0;
  for (const item of $("boundaryKey").children) {
    const match = !query || polityLabel(item.dataset.subject).toLowerCase().includes(query);
    item.hidden = !match;
    if (match) count++;
  }
  for (const item of $("mapBoundaries").children) {
    item.classList.toggle("dimmed", !!query && !polityLabel(item.dataset.subject).toLowerCase().includes(query));
  }
  $("boundaryCount").textContent = `${count} / ${boundaryNames.size}`;
}

function renderDetail(year) {
  const region = data.regions.find((r) => r.id === selected);
  const period = periodFor(region, year);
  const rulers = data.rulers.filter(([id,start,end]) => id === selected && inRange(year,start,end));
  const people = data.people.filter(([id,start,end]) => id === selected && inRange(year,start,end));
  $("periodTitle").textContent = region.name;
  $("periodIndex").textContent = region.id.toUpperCase();
  $("periodCopy").textContent = period ? period[2] : "未录入";
  $("detailBody").innerHTML = period ? `<dl><dt>王朝 / 政治制度</dt><dd>${period[3]}</dd><dt>阶段范围（年度概览）</dt><dd>${formatYear(period[0])} — ${formatYear(period[1])}</dd><dt>当年统治者 / 执政者</dt><dd>${rulers.length ? rulers.map((r) => `${r[3]}<small>${r[4]} · ${sourceLink(r[5])}</small>`).join("<br>") : "任期资料未录入"}</dd><dt>同时代代表人物</dt><dd>${people.length ? people.map((p) => `${p[3]}<small>${p[4]} · ${sourceLink(p[5])}</small>`).join("<br>") : "人物资料未录入"}</dd></dl><div class="detail-source">${sourceLink(region.source,"地区史参考")}</div>` : "";
}

function setYear(year, follow = true) {
  const index = Math.min(maxIndex, Math.max(minIndex, yearToIndex(year)));
  slider.value = index;
  render(indexToYear(index), follow);
}

function stopPlayback() {
  clearInterval(timer);
  timer = null;
  $("playLabel").textContent = "播放";
  $("playButton").setAttribute("aria-label", "播放时间轴");
  $("playButton").querySelector(".play-icon").textContent = "▶";
}

slider.min = minIndex;
slider.addEventListener("input", () => { stopPlayback(); render(indexToYear(Number(slider.value))); });
$("stepBack").addEventListener("click", () => { stopPlayback(); setYear(indexToYear(Number(slider.value) - 50)); });
$("stepForward").addEventListener("click", () => { stopPlayback(); setYear(indexToYear(Number(slider.value) + 50)); });
$("resetView").addEventListener("click", () => { stopPlayback(); setYear(-1000); });
$("playButton").addEventListener("click", () => {
  if (timer) return stopPlayback();
  if (Number(slider.value) >= maxIndex) setYear(-1000);
  $("playLabel").textContent = "暂停";
  $("playButton").setAttribute("aria-label", "暂停时间轴");
  $("playButton").querySelector(".play-icon").textContent = "Ⅱ";
  timer = setInterval(() => {
    const next = Math.min(maxIndex, Number(slider.value) + 5);
    setYear(indexToYear(next));
    if (next === maxIndex) stopPlayback();
  }, 140);
});

document.addEventListener("click", (event) => {
  const regionButton = event.target.closest("[data-region]");
  const yearButton = event.target.closest("[data-year]");
  if (regionButton) {
    selected = regionButton.dataset.region;
    render(indexToYear(Number(slider.value)), false);
  }
  if (yearButton) { stopPlayback(); setYear(Number(yearButton.dataset.year)); }
});

$("timelineTrack").innerHTML = `<div class="timeline-marker" id="timelineMarker"></div>` + Array.from({length:26}, (_,i) => {
  const year = i === 25 ? 1453 : i * 100 - 1000 || 1;
  return `<button class="timeline-tick" data-year="${year}" style="left:${position(year)}%" aria-label="${formatYear(year)}">${year < 0 ? `前 ${-year}` : year}</button>`;
}).join("");
$("timelineTrack").addEventListener("click", (event) => {
  if (event.target.closest("button")) return;
  const rect = $("timelineTrack").getBoundingClientRect();
  stopPlayback();
  setYear(indexToYear(Math.round(minIndex + (event.clientX - rect.left) / rect.width * (maxIndex - minIndex))), false);
});
$("yearForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const number = Number($("yearInput").value);
  if (!Number.isInteger(number) || number < 1) return;
  stopPlayback();
  setYear($("yearEra").value === "bce" ? -number : number);
});

const project = ([lon,lat]) => [(lon + 12) / 52 * 760, (49 - lat) / 22 * 430];
for (const feature of window.ATLAS_LAND.features) {
  const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("class", "land");
  path.setAttribute("d", polygons.map((polygon) => polygon.map((ring) => ring.map((point,i) => `${i ? "L" : "M"}${project(point).map((v) => v.toFixed(2)).join(",")}`).join("") + "Z").join("")).join(""));
  $("mapLand").appendChild(path);
}
$("mapPins").innerHTML = data.regions.map((region) => {
  const [x,y] = project(region.point);
  return `<button class="region-pin" data-region="${region.id}" data-x="${x}" data-y="${y}" style="left:${x / 760 * 100}%;top:${y / 430 * 100}%;--region-color:${region.color}" aria-label="查看${region.name}">${region.name}</button>`;
}).join("");
$("showRegions").addEventListener("change",()=>{$("mapPins").hidden = !$("showRegions").checked;});
$("boundarySearch").addEventListener("input", applyBoundaryFilter);
$("boundaryKey").addEventListener("click",(event)=>{
  const item = event.target.closest("[data-subject]");
  if (item) selectBoundary(chosenSubject === item.dataset.subject ? "" : item.dataset.subject);
});
$("compareBoundaries").addEventListener("change",()=>renderBoundaries(indexToYear(Number(slider.value))));
$("snapshotSelect").innerHTML = window.ATLAS_BOUNDARIES.map((stage)=>`<option value="${stage.year}">${formatYear(stage.year)}</option>`).join("");
$("snapshotSelect").addEventListener("change",()=>{stopPlayback();setYear(Number($("snapshotSelect").value));});
for (const [id,direction] of [["previousBoundary",-1],["nextBoundary",1]]) {
  $(id).addEventListener("click",()=>{
    stopPlayback();
    const current = boundaryStageFor(indexToYear(Number(slider.value)));
    const index = window.ATLAS_BOUNDARIES.indexOf(current);
    const next = window.ATLAS_BOUNDARIES[Math.max(0,Math.min(window.ATLAS_BOUNDARIES.length-1,index+direction))];
    setYear(next.year);
  });
}
setYear(-1000);
