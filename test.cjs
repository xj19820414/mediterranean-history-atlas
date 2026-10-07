const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const context = {window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,"history.js"),"utf8"),context);
const data = context.window.historyData;
let periodCount = 0;
for (const region of data.regions) {
  const years = new Set();
  for (const [start,end] of region.periods) {
    assert(start <= end, `${region.id}: reversed interval`);
    assert(start !== 0 && end !== 0, "No historical year zero");
    periodCount++;
    for (let year=start;year<=end;year++) {
      if (year === 0) continue;
      assert(!years.has(year), `${region.id}: overlapping ${year}`);
      years.add(year);
    }
  }
  assert.equal(years.size,2453,`${region.id}: incomplete region timeline`);
}
for (const record of [...data.rulers,...data.people]) {
  assert(data.regions.some((r) => r.id === record[0]),"Unknown region");
  assert(record[1] <= record[2],"Reversed tenure");
  assert(record[5],"Missing reference");
}
const source = fs.readFileSync(path.join(__dirname,"app.js"),"utf8");
const functions = source.slice(source.indexOf("const yearToIndex"), source.indexOf("const formatYear"));
vm.runInContext(functions + ";this.toIndex=yearToIndex;this.toYear=indexToYear",context);
assert.equal(context.toYear(context.toIndex(-1)+1),1);
assert.equal(context.toYear(context.toIndex(1)-1),-1);
console.log(`Data checks passed: ${data.regions.length} regions, ${periodCount} stages, ${data.rulers.length} ruler samples, ${data.people.length} people, ${data.events.length} events.`);

async function browserTests() {
  let playwright;
  try { playwright = require("playwright"); } catch {
    console.log("Browser tests skipped: set NODE_PATH to a Playwright installation.");
    return;
  }
  let browser;
  try { browser = await playwright.chromium.launch({headless:true}); }
  catch { browser = await playwright.chromium.launch({headless:true,channel:"msedge"}); }
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[];
    fs.mkdirSync("test-results",{recursive:true});
    page.on("pageerror",(error)=>errors.push(error.message));
    await page.goto(process.env.TEST_URL || "http://127.0.0.1:8766");
    assert.match(await page.locator("#yearLabel").innerText(),/1000/);
    assert.equal(await page.locator(".polity-card").count(),7);
    assert(await page.locator("#mapLand path").count() > 0,"Map must be rendered");
    assert(await page.locator("#mapBoundaries path").count() > 0,"Historical boundaries must be rendered");
    const earlyBorders = await page.locator("#mapBoundaries").innerHTML();
    const jump = async (era,year) => {
      await page.locator("#yearEra").selectOption(era);
      await page.locator("#yearInput").fill(String(year));
      await page.getByRole("button",{name:"跳转年份",exact:true}).click();
    };
    await jump("bce",50);
    assert.match(await page.locator("#detailBody").innerText(),/克娄巴特拉/);
    await jump("ce",100);
    assert.equal(await page.locator("#mapBoundaries").getAttribute("data-snapshot"),"100");
    assert.notEqual(await page.locator("#mapBoundaries").innerHTML(),earlyBorders,"Boundaries must change");
    await page.locator("#compareBoundaries").check();
    assert(await page.locator("#previousBoundaries path").count() > 0,"Previous snapshot comparison must render");
    await page.locator("#compareBoundaries").uncheck();
    assert.equal(await page.locator("#previousBoundaries path").count(),0);
    assert(await page.locator("#boundaryKey button").count() > 0,"Polity legend must render");
    await page.locator("#boundarySearch").fill("罗马");
    assert(await page.locator("#boundaryKey button:visible").count() > 0,"Chinese search must match Roman Empire");
    await page.locator('#boundaryKey button[data-subject="Roman Empire"]').click();
    assert(await page.locator(".historical-boundary.chosen").count() > 0,"Legend selection must highlight boundaries");
    const sameSnapshotPath = await page.locator(".historical-boundary.chosen").first().elementHandle();
    await jump("ce",101);
    assert(await sameSnapshotPath.evaluate((node)=>node.isConnected),"Same snapshot must reuse boundary paths");
    assert.match(await page.locator("#boundarySelection").innerText(),/罗马帝国/);
    await page.locator("#boundarySearch").fill("no-such-polity");
    assert.equal(await page.locator("#boundaryKey button:visible").count(),0,"Empty search must not show unmatched items");
    await page.locator("#boundarySearch").fill("");
    await page.getByRole("button",{name:"放大地图",exact:true}).click();
    await page.waitForTimeout(250);
    assert.notEqual(await page.locator("#mapZoomLabel").innerText(),"100%");
    const beforePan = await page.locator("#mapViewport").getAttribute("transform");
    const box = await page.locator("#baseMap").boundingBox();
    await page.mouse.move(box.x+box.width*.6,box.y+box.height*.65);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width*.5,box.y+box.height*.65,{steps:8});
    await page.mouse.up();
    assert.notEqual(await page.locator("#mapViewport").getAttribute("transform"),beforePan,"Map must pan");
    await page.getByRole("button",{name:"重置地图视图",exact:true}).click();
    await page.waitForTimeout(250);
    assert.equal(await page.locator("#mapZoomLabel").innerText(),"100%");
    assert.equal(await page.locator("#mapZoomOut").isDisabled(),true);
    await jump("ce",100);
    await page.locator("#mapStage").screenshot({path:"test-results/roman-boundaries.png"});
    assert.match(await page.locator(".polity-card[data-region=italy]").innerText(),/图拉真/);
    await page.locator(".region-pin[data-region=italy]").click();
    assert.match(await page.locator("#detailBody").innerText(),/图拉真/);
    await page.locator("#yearSlider").fill("0");
    assert.equal(await page.locator("#yearLabel").innerText(),"公元前 1 年");
    await page.locator("#yearSlider").press("ArrowRight");
    assert.equal(await page.locator("#yearLabel").innerText(),"公元 1 年");
    await jump("ce",1204);
    assert.equal(await page.locator("#mapBoundaries").getAttribute("data-snapshot"),"1200");
    await page.getByRole("button",{name:"下一个边界快照",exact:true}).click();
    assert.equal(await page.locator("#mapBoundaries").getAttribute("data-snapshot"),"1279");
    await jump("ce",1204);
    assert.match(await page.locator("#eventsList").innerText(),/十字军/);
    await page.getByRole("button",{name:"播放时间轴",exact:true}).click();
    await page.waitForTimeout(350);
    assert(Number(await page.locator("#yearSlider").inputValue()) > 1204);
    await page.getByRole("button",{name:"暂停时间轴",exact:true}).click();
    await jump("ce",1453);
    assert.equal(await page.locator("#mapBoundaries").getAttribute("data-snapshot"),"1400");
    await page.locator("#mapStage").screenshot({path:"test-results/medieval-boundaries.png"});
    await page.locator("#snapshotSelect").selectOption("-500");
    assert.equal(await page.locator("#mapBoundaries").getAttribute("data-snapshot"),"-500");
    await page.locator("#showRegions").uncheck();
    assert.equal(await page.locator("#mapPins").isVisible(),false);
    await page.locator("#showRegions").check();
    await jump("ce",1453);
    assert.match(await page.locator("#eventsList").innerText(),/君士坦丁堡陷落/);
    assert(await page.locator("#timelineScroller").evaluate((el)=>el.scrollLeft > 0));
    await page.getByRole("button",{name:"重置时间轴",exact:true}).click();
    fs.mkdirSync("test-results",{recursive:true});
    await page.screenshot({path:"test-results/desktop.png",fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:"test-results/mobile.png",fullPage:true});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),"Mobile page overflow");
    assert.equal(errors.length,0,errors.join("\n"));
    const requests=[];
    const offline = await browser.newPage();
    offline.on("request",(request)=>requests.push(request.url()));
    await offline.goto("file:///" + path.join(__dirname,"index.html").replaceAll("\\","/"));
    assert.equal(await offline.locator(".polity-card").count(),7);
    assert(requests.every((url)=>url.startsWith("file:")),"Offline build must not request network resources");
    console.log("Browser checks passed: year changes, dynasty/ruler filtering, selection, BCE/CE transition, events, playback, horizontal scroll, reset, desktop/mobile layout and offline file opening.");
  } finally { await browser.close(); }
}
browserTests().catch((error)=>{console.error(error);process.exitCode=1;});
