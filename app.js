const data = window.historyData;
const $ = (id) => document.getElementById(id);
const slider = $("yearSlider");
let timer = null;
let selected = "egypt";
const minIndex = -999;
const maxIndex = 1453;
const yearToIndex = (year) => year < 0 ? year + 1 : year;
const indexToYear = (index) => index <= 0 ? index - 1 : index;
const formatYear = (year) => year < 0 ? `公元前 ${-year} 年` : `公元 ${year} 年`;
const inRange = (year, start, end) => year >= start && year <= end;
const periodFor = (region, year) => region.periods.find(([start, end]) => inRange(year, start, end));
const position = (year) => ((yearToIndex(year) - minIndex) / (maxIndex - minIndex)) * 100;
const sourceLink = (page, label = "参考条目") => `<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(page)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;

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
  return `<button class="region-pin" data-region="${region.id}" style="left:${x / 760 * 100}%;top:${y / 430 * 100}%;--region-color:${region.color}" aria-label="查看${region.name}">${region.name}</button>`;
}).join("");
setYear(-1000);
