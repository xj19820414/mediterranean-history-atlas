(() => {
  const svg = d3.select("#baseMap");
  const viewport = d3.select("#mapViewport");
  const zoom = d3.zoom()
    .extent([[0, 0], [760, 430]])
    .translateExtent([[0, 0], [760, 430]])
    .scaleExtent([1, 5])
    .on("zoom", (event) => {
      const {x, y, k} = event.transform;
      viewport.attr("transform", event.transform);
      document.getElementById("mapZoomLabel").textContent = `${Math.round(k * 100)}%`;
      document.querySelectorAll(".region-pin").forEach((pin) => {
        pin.style.left = `${(Number(pin.dataset.x) * k + x) / 760 * 100}%`;
        pin.style.top = `${(Number(pin.dataset.y) * k + y) / 430 * 100}%`;
      });
      document.getElementById("mapZoomOut").disabled = k <= 1;
      document.getElementById("mapZoomIn").disabled = k >= 5;
    });
  svg.call(zoom);
  const duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 160;
  document.getElementById("resetMap").addEventListener("click", () => svg.transition().duration(duration).call(zoom.transform, d3.zoomIdentity));
  document.getElementById("mapZoomOut").addEventListener("click", () => svg.transition().duration(duration).call(zoom.scaleBy, .8));
  document.getElementById("mapZoomIn").addEventListener("click", () => svg.transition().duration(duration).call(zoom.scaleBy, 1.25));
  svg.call(zoom.transform, d3.zoomIdentity);
})();
