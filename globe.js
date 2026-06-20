/* ---- Robot sites across the planet: D3 orthographic globe, Protocolized palette ---- */
(async function () {
  var el = document.getElementById("globe-container");
  if (!el || typeof d3 === "undefined" || typeof topojson === "undefined") return;

  var P = "0,100,255"; /* primary cobalt */
  var INK = "44,44,42"; /* ink-dark */
  var width = 700,
    height = 700;
  var CX = 395,
    CY = 340,
    RG = 173,
    K = RG / 270; /* nest the globe in the P's bowl */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var cities = [
    { name: "Oulu", lat: 65.01, lon: 25.47 },
    { name: "Seattle", lat: 47.61, lon: -122.33 },
    { name: "Berlin", lat: 52.52, lon: 13.4 },
    { name: "Tel Aviv", lat: 32.07, lon: 34.78 },
    { name: "Tokyo", lat: 35.68, lon: 139.69 },
  ];
  var links = [
    [0, 2],
    [2, 3],
    [1, 4],
    [0, 4],
    [1, 2],
    [3, 4],
    [0, 1],
    [0, 3],
  ];

  var projection = d3.geoOrthographic().scale(RG).translate([CX, CY]).clipAngle(90).rotate([-10, -28]);
  var path = d3.geoPath().projection(projection);
  var svg = d3
    .select(el)
    .append("svg")
    .attr("viewBox", "0 0 " + width + " " + height)
    .attr("width", "100%");

  var defs = svg.append("defs");
  var f = defs.append("filter").attr("id", "pi-glow");
  f.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
  var fm = f.append("feMerge");
  fm.append("feMergeNode").attr("in", "blur");
  fm.append("feMergeNode").attr("in", "SourceGraphic");

  var og = defs.append("radialGradient").attr("id", "pi-ocean").attr("cx", "42%").attr("cy", "38%");
  og.append("stop").attr("offset", "0%").attr("stop-color", "#ffffff");
  og.append("stop")
    .attr("offset", "70%")
    .attr("stop-color", "rgba(" + P + ",0.05)");
  og.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "rgba(" + P + ",0.13)");
  var ag = defs.append("radialGradient").attr("id", "pi-atmos");
  ag.append("stop")
    .attr("offset", "86%")
    .attr("stop-color", "rgba(" + P + ",0.00)");
  ag.append("stop")
    .attr("offset", "97%")
    .attr("stop-color", "rgba(" + P + ",0.07)");
  ag.append("stop").attr("offset", "100%").attr("stop-color", "transparent");

  svg
    .append("circle")
    .attr("cx", CX)
    .attr("cy", CY)
    .attr("r", RG * 1.075)
    .attr("fill", "url(#pi-atmos)");
  svg
    .append("circle")
    .attr("cx", CX)
    .attr("cy", CY)
    .attr("r", RG)
    .attr("fill", "url(#pi-ocean)")
    .attr("stroke", "rgba(" + P + ",0.28)")
    .attr("stroke-width", 1);

  var graticule = d3.geoGraticule().step([15, 15]);
  svg
    .append("path")
    .datum(graticule())
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "rgba(" + P + ",0.11)")
    .attr("stroke-width", 0.5);

  var landGroup = svg.append("g"),
    linksGroup = svg.append("g"),
    citiesGroup = svg.append("g");

  var world;
  try {
    var res = await fetch("/land-110m.json");
    if (!res.ok) return; /* land map unavailable — skip the globe rather than throw */
    world = await res.json();
  } catch (err) {
    return;
  }
  var land = topojson.feature(world, world.objects.land);
  landGroup
    .selectAll("path")
    .data(land.features || [land])
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", "rgba(" + P + ",0.17)")
    .attr("stroke", "rgba(" + P + ",0.45)")
    .attr("stroke-width", 0.6);

  var angle = -10,
    startTime = Date.now();
  function render() {
    if (!reduce) angle += 0.32;
    projection.rotate([-angle, -28]);
    landGroup.selectAll("path").attr("d", path);
    svg.select("path").attr("d", path(graticule()));
    linksGroup.selectAll("*").remove();
    citiesGroup.selectAll("*").remove();
    var time = reduce ? 0 : (Date.now() - startTime) / 1000;
    var center = projection.invert([CX, CY]);

    links.forEach(function (pair, i) {
      var ca = cities[pair[0]],
        cb = cities[pair[1]];
      var interp = d3.geoInterpolate([ca.lon, ca.lat], [cb.lon, cb.lat]);
      var coords = [];
      for (var t0 = 0; t0 <= 1; t0 += 0.01) coords.push(interp(t0));
      linksGroup
        .append("path")
        .attr("d", path({ type: "Feature", geometry: { type: "LineString", coordinates: coords } }))
        .attr("fill", "none")
        .attr("stroke", "rgba(" + P + ",0.18)")
        .attr("stroke-width", 1);
      var raw = (time * (0.35 + i * 0.07)) % 2;
      var t = raw <= 1 ? raw : 2 - raw;
      var tailLen = 14,
        tailDir = raw <= 1 ? 1 : -1;
      for (var s = 0; s < tailLen; s++) {
        var tt = Math.max(0, Math.min(1, t - s * 0.01 * tailDir));
        var pt = interp(tt),
          pp = projection(pt);
        if (!pp || d3.geoDistance(pt, center) >= Math.PI / 2) continue;
        var fade = 1 - s / tailLen;
        if (s === 0) linksGroup.append("circle").attr("cx", pp[0]).attr("cy", pp[1]).attr("r", 1.5).attr("fill", "rgba(216,90,48,0.95)");
        else
          linksGroup
            .append("circle")
            .attr("cx", pp[0])
            .attr("cy", pp[1])
            .attr("r", 1.2 * fade)
            .attr("fill", "rgba(216,90,48," + 0.55 * fade * fade + ")");
      }
    });

    cities.forEach(function (c, i) {
      var p = projection([c.lon, c.lat]);
      var dist = d3.geoDistance([c.lon, c.lat], center);
      if (p && dist < Math.PI / 2) {
        var blink = reduce ? 1 : 0.7 + Math.sin(time * 2.5 + i * 1.3) * 0.3;
        var ringSize = 12 * K + (reduce ? 0 : Math.sin(time * 1.8 + i) * 3 * K);
        citiesGroup
          .append("circle")
          .attr("cx", p[0])
          .attr("cy", p[1])
          .attr("r", ringSize)
          .attr("fill", "none")
          .attr("stroke", "rgba(" + P + "," + 0.34 * blink + ")")
          .attr("stroke-width", 1);
        citiesGroup
          .append("circle")
          .attr("cx", p[0])
          .attr("cy", p[1])
          .attr("r", 15 * K)
          .attr("fill", "rgba(" + P + "," + 0.2 * blink + ")")
          .attr("filter", "url(#pi-glow)");
        citiesGroup
          .append("circle")
          .attr("cx", p[0])
          .attr("cy", p[1])
          .attr("r", Math.max(2.6, 4 * K))
          .attr("fill", "rgba(" + P + "," + blink + ")");
        citiesGroup
          .append("circle")
          .attr("cx", p[0])
          .attr("cy", p[1])
          .attr("r", Math.max(1, 1.7 * K))
          .attr("fill", "#ffffff");
        if (dist < Math.PI / 3) {
          citiesGroup
            .append("text")
            .attr("x", p[0] + 9)
            .attr("y", p[1] + 3)
            .attr("font-family", "'JetBrains Mono', monospace")
            .attr("font-size", "9px")
            .attr("font-weight", "600")
            .attr("letter-spacing", "0.04em")
            .attr("fill", "rgba(" + INK + "," + 0.9 * blink + ")")
            .text(c.name);
        }
      }
    });
  }

  var raf = null;
  function tick() {
    render();
    raf = requestAnimationFrame(tick);
  }
  function start() {
    if (raf == null && !reduce) raf = requestAnimationFrame(tick);
  }
  function stop() {
    if (raf != null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }

  if (reduce) {
    render();
  } else if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (es) {
        es.forEach(function (e) {
          e.isIntersecting ? start() : stop();
        });
      },
      { threshold: 0.04 },
    ).observe(el);
  } else {
    start();
  }
})();
