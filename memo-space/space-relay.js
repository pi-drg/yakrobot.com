/* ---- The network expands to the Moon ----
   globe.js's rotating Earth with its five rover cities and comet-streak links, wrapped in an orbiting
   LEO relay mesh, then bridged outward by a fan of relay paths to a Lunar relay (orbiting sats +
   surface nodes) around the Moon. Protocol Institute palette. */
(async function () {
  var el = document.getElementById("relay-stage");
  if (!el || typeof d3 === "undefined" || typeof topojson === "undefined") return;

  /* Palette — dark-mode Protocol Institute identity */
  var COBALT = "0,100,255",     /* primary — city nodes, city arcs */
    BRIGHT = "91,157,255",      /* cobalt-bright — LEO mesh, atmosphere, labels on dark */
    RUST = "224,122,69",        /* comet streaks on the Earth mesh */
    FOREST = "52,199,155",      /* live/status — the Earth→Moon expansion + lunar relay */
    INK = "168,179,196";

  var W = 1200, H = 520;
  var EX = 300, EY = 264, RE = 150;               /* Earth */
  var MX = 1012, MY = 264, RM = 60, MS = RM + 24; /* Moon + lunar relay shell */
  var EORBIT = RE + 58, ESQ = 0.82;               /* Earth LEO relay shell radius + perspective squash */
  var LIFT = 30;                                   /* inner relay-sat altitude above surface, px */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Same five rover cities + link graph as globe.js */
  var cities = [
    { name: "Oulu", lat: 65.01, lon: 25.47 },
    { name: "Seattle", lat: 47.61, lon: -122.33 },
    { name: "Berlin", lat: 52.52, lon: 13.4 },
    { name: "Tel Aviv", lat: 32.07, lon: 34.78 },
    { name: "Tokyo", lat: 35.68, lon: 139.69 },
  ];
  var links = [[0, 2], [2, 3], [1, 4], [0, 4], [1, 2], [3, 4], [0, 1], [0, 3]];

  var LEO_N = 14;  /* LEO relay satellites riding the LEO shell */
  var INNER_N = 6; /* inner relay satellites that talk to ground stations */
  var MOON_N = 8;  /* lunar relay satellites */

  /* lunar surface nodes (screen-space, on the Earth-facing near side) */
  var moonBases = [
    { x: MX - 24, y: MY - 16, name: "South Pole Base" },
    { x: MX - 28, y: MY + 18, name: "" },
    { x: MX - 2, y: MY + 28, name: "" },
  ];

  var projection = d3.geoOrthographic().scale(RE).translate([EX, EY]).clipAngle(90).rotate([-10, -24]);
  var path = d3.geoPath().projection(projection);
  function center() { return projection.invert([EX, EY]); }
  function visible(lonlat, p) { return p && d3.geoDistance(lonlat, center()) < Math.PI / 2; }

  var svg = d3.select(el).append("svg")
    .attr("viewBox", "0 0 " + W + " " + H)
    .attr("width", "100%")
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("role", "img")
    .attr("aria-label", "The rover network on Earth expanding through a LEO relay out to the Moon");

  /* ---- defs ---- */
  var defs = svg.append("defs");
  var glow = defs.append("filter").attr("id", "rl-glow");
  glow.append("feGaussianBlur").attr("stdDeviation", "3.2").attr("result", "b");
  var gm = glow.append("feMerge");
  gm.append("feMergeNode").attr("in", "b");
  gm.append("feMergeNode").attr("in", "SourceGraphic");

  var og = defs.append("radialGradient").attr("id", "rl-ocean").attr("cx", "42%").attr("cy", "36%");
  og.append("stop").attr("offset", "0%").attr("stop-color", "#0e2a59");
  og.append("stop").attr("offset", "70%").attr("stop-color", "rgba(" + COBALT + ",0.18)");
  og.append("stop").attr("offset", "100%").attr("stop-color", "rgba(" + COBALT + ",0.32)");
  var ag = defs.append("radialGradient").attr("id", "rl-atmos");
  ag.append("stop").attr("offset", "85%").attr("stop-color", "rgba(" + BRIGHT + ",0)");
  ag.append("stop").attr("offset", "96%").attr("stop-color", "rgba(" + BRIGHT + ",0.10)");
  ag.append("stop").attr("offset", "100%").attr("stop-color", "transparent");
  var ml = defs.append("radialGradient").attr("id", "rl-moonlimb").attr("cx", "50%").attr("cy", "50%").attr("r", "50%");
  ml.append("stop").attr("offset", "0%").attr("stop-color", "rgba(8,11,20,0)");
  ml.append("stop").attr("offset", "80%").attr("stop-color", "rgba(8,11,20,0)");
  ml.append("stop").attr("offset", "100%").attr("stop-color", "rgba(8,11,20,0.25)");
  defs.append("clipPath").attr("id", "rl-moonclip").append("circle").attr("cx", MX).attr("cy", MY).attr("r", RM);

  /* ---- starfield ---- */
  var stars = svg.append("g");
  for (var i = 0; i < 80; i++) {
    var sx = Math.random() * W, sy = Math.random() * H;
    if (Math.hypot(sx - EX, sy - EY) < EORBIT + 12 || Math.hypot(sx - MX, sy - MY) < MS + 10) continue;
    var st = stars.append("circle").attr("cx", sx).attr("cy", sy)
      .attr("r", (Math.random() * 1.1 + 0.3).toFixed(2))
      .attr("fill", "rgba(" + BRIGHT + "," + (0.12 + Math.random() * 0.32).toFixed(2) + ")");
    if (Math.random() < 0.3) st.attr("class", "rl-twinkle").style("animation-delay", (Math.random() * 3).toFixed(2) + "s");
  }

  /* ---- Earth→Moon relay fan (parallel-mapped arcs → corridor, no single crossing) ---- */
  function qbez(a, t) {
    var u = 1 - t;
    return [u * u * a.p0[0] + 2 * u * t * a.c[0] + t * t * a.p1[0], u * u * a.p0[1] + 2 * u * t * a.c[1] + t * t * a.p1[1]];
  }
  /* the relay fan is generated per-frame in render() — each streak runs sat-to-sat between the shells */

  /* ---- Earth base ---- */
  svg.append("circle").attr("cx", EX).attr("cy", EY).attr("r", RE * 1.08).attr("fill", "url(#rl-atmos)");
  svg.append("circle").attr("cx", EX).attr("cy", EY).attr("r", RE).attr("fill", "url(#rl-ocean)")
    .attr("stroke", "rgba(" + BRIGHT + ",0.35)").attr("stroke-width", 1);
  var graticule = d3.geoGraticule().step([15, 15]);
  var grat = svg.append("path").datum(graticule()).attr("d", path).attr("fill", "none")
    .attr("stroke", "rgba(" + BRIGHT + ",0.10)").attr("stroke-width", 0.5);
  var landG = svg.append("g");

  /* ---- Earth LEO relay shell (the green relay streaks launch from this ring) ---- */
  svg.append("ellipse").attr("cx", EX).attr("cy", EY).attr("rx", EORBIT).attr("ry", EORBIT * ESQ).attr("fill", "none")
    .attr("stroke", "rgba(" + FOREST + ",0.26)").attr("stroke-width", 1).attr("stroke-dasharray", "1 5");

  /* ---- Moon (real photograph, clipped to the disc) ---- */
  var mr = RM * 1.34; /* oversize so the moon fills the disc — crops the photo's black margin */
  svg.append("image")
    .attr("href", "moon.jpg").attr("xlink:href", "moon.jpg")
    .attr("x", MX - mr).attr("y", MY - mr).attr("width", 2 * mr).attr("height", 2 * mr)
    .attr("preserveAspectRatio", "xMidYMid slice")
    .attr("clip-path", "url(#rl-moonclip)");
  /* very subtle limb darkening to soften the disc edge into the scene */
  svg.append("circle").attr("cx", MX).attr("cy", MY).attr("r", RM).attr("fill", "url(#rl-moonlimb)").attr("clip-path", "url(#rl-moonclip)");
  svg.append("ellipse").attr("cx", MX).attr("cy", MY).attr("rx", MS).attr("ry", MS * 0.82).attr("fill", "none")
    .attr("stroke", "rgba(" + FOREST + ",0.28)").attr("stroke-width", 1).attr("stroke-dasharray", "1 5");

  /* ---- dynamic layers ---- */
  var arcsG = svg.append("g");    /* city-to-city arcs + comet streaks */
  var fanG = svg.append("g");     /* relay fan: LEO-sat ↔ lunar-sat streaks (behind sats) */
  var leoG = svg.append("g");     /* LEO sats + mesh */
  var moonSatG = svg.append("g"); /* lunar relay sats */
  var baseG = svg.append("g");    /* lunar surface nodes */
  var cityG = svg.append("g");    /* city nodes + labels */

  /* ---- labels ---- */
  function caption(x, y, txt, size, alpha, ls) {
    return svg.append("text").attr("x", x).attr("y", y)
      .attr("font-family", "'Outfit', system-ui, sans-serif").attr("font-size", size)
      .attr("font-weight", "500").attr("letter-spacing", ls).attr("fill", "rgba(" + INK + "," + alpha + ")").text(txt);
  }
  svg.append("circle").attr("cx", 46).attr("cy", 40).attr("r", 4).attr("fill", "rgba(" + FOREST + ",0.95)").attr("class", "rl-twinkle");
  caption(58, 45, "YAKROBOT CISLUNAR RELAY NETWORK", "15", "0.8", "0.15em");
  caption(46, 64, "GROUND STATIONS · LEO RELAY · LUNAR RELAY · LUNAR SITES", "12", "0.45", "0.13em");
  caption(MX, MY + MS + 26, "Lunar Relay", "16", "0.8", "0.02em").attr("text-anchor", "middle");
  caption(EX, EY + EORBIT * ESQ + 24, "LEO Relay", "16", "0.8", "0.02em").attr("text-anchor", "middle");

  /* ---- world data ---- */
  var world;
  try {
    var res = await fetch("land-110m.json");
    if (!res.ok) return;
    world = await res.json();
  } catch (e) { return; }
  var land = topojson.feature(world, world.objects.land);
  landG.selectAll("path").data(land.features || [land]).enter().append("path")
    .attr("d", path).attr("fill", "rgba(" + BRIGHT + ",0.20)")
    .attr("stroke", "rgba(" + BRIGHT + ",0.45)").attr("stroke-width", 0.6);

  /* ---- helpers ---- */
  function trail(g, ax, ay, bx, by, t, dir, n, rgb, head) {
    for (var s = 0; s < n; s++) {
      var tt = Math.max(0, Math.min(1, t - s * 0.01 * dir));
      var x = ax + (bx - ax) * tt, y = ay + (by - ay) * tt, fade = 1 - s / n;
      g.append("circle").attr("cx", x).attr("cy", y)
        .attr("r", s === 0 ? head : 1.1 * fade)
        .attr("fill", "rgba(" + rgb + "," + (s === 0 ? 0.95 : 0.5 * fade * fade) + ")");
    }
  }
  function drawSat(g, x, y, sc, panel, blink) {
    g.append("rect").attr("x", x - 4 * sc).attr("y", y - 2 * sc).attr("width", 8 * sc).attr("height", 4 * sc).attr("rx", 1)
      .attr("fill", "rgba(255,255,255," + 0.85 * blink + ")");
    g.append("rect").attr("x", x - 9.5 * sc).attr("y", y - 1.5 * sc).attr("width", 4.5 * sc).attr("height", 3 * sc).attr("rx", 0.5)
      .attr("fill", "rgba(" + panel + "," + 0.6 * blink + ")");
    g.append("rect").attr("x", x + 5 * sc).attr("y", y - 1.5 * sc).attr("width", 4.5 * sc).attr("height", 3 * sc).attr("rx", 0.5)
      .attr("fill", "rgba(" + panel + "," + 0.6 * blink + ")");
  }

  var angle = -10, t0 = Date.now();
  function render() {
    var time = reduce ? 6 : (Date.now() - t0) / 1000;
    if (!reduce) { angle += 0.3; projection.rotate([-angle, -24]); }
    landG.selectAll("path").attr("d", path);
    grat.attr("d", path(graticule()));
    arcsG.selectAll("*").remove();
    fanG.selectAll("*").remove();
    leoG.selectAll("*").remove();
    moonSatG.selectAll("*").remove();
    baseG.selectAll("*").remove();
    cityG.selectAll("*").remove();
    var ctr = center();

    /* city-to-city great-circle arcs + comet streaks (globe.js) */
    links.forEach(function (pair, i) {
      var ca = cities[pair[0]], cb = cities[pair[1]];
      var interp = d3.geoInterpolate([ca.lon, ca.lat], [cb.lon, cb.lat]);
      var coords = [];
      for (var u = 0; u <= 1; u += 0.01) coords.push(interp(u));
      arcsG.append("path")
        .attr("d", path({ type: "Feature", geometry: { type: "LineString", coordinates: coords } }))
        .attr("fill", "none").attr("stroke", "rgba(" + COBALT + ",0.18)").attr("stroke-width", 1);
      var raw = (time * (0.35 + i * 0.07)) % 2, tt = raw <= 1 ? raw : 2 - raw, dir = raw <= 1 ? 1 : -1;
      for (var s = 0; s < 14; s++) {
        var ti = Math.max(0, Math.min(1, tt - s * 0.01 * dir));
        var pt = interp(ti), pp = projection(pt);
        if (!pp || d3.geoDistance(pt, ctr) >= Math.PI / 2) continue;
        var fade = 1 - s / 14;
        arcsG.append("circle").attr("cx", pp[0]).attr("cy", pp[1])
          .attr("r", s === 0 ? 1.5 : 1.2 * fade)
          .attr("fill", "rgba(" + RUST + "," + (s === 0 ? 0.95 : 0.55 * fade * fade) + ")");
      }
    });

    /* satellite positions on both shells (used by the relay fan + bodies below) */
    var leoPos = [];
    for (var ls = 0; ls < LEO_N; ls++) {
      var la = time * 0.12 + ls * (Math.PI * 2 / LEO_N);
      leoPos.push({ x: EX + EORBIT * Math.cos(la), y: EY + EORBIT * ESQ * Math.sin(la), id: ls, face: Math.cos(la) });
    }
    var msat = [];
    for (var mp = 0; mp < MOON_N; mp++) {
      var ma = time * 0.4 + mp * (Math.PI * 2 / MOON_N);
      msat.push({ x: MX + MS * Math.cos(ma), y: MY + MS * 0.82 * Math.sin(ma), id: mp, face: -Math.cos(ma) });
    }

    /* relay fan: every streak runs from a moon-facing LEO sat to an earth-facing lunar sat */
    var leoFace = leoPos.filter(function (p) { return p.face > 0.12; }).sort(function (a, b) { return a.y - b.y; });
    var moonFace = msat.filter(function (p) { return p.face > 0.12; }).sort(function (a, b) { return a.y - b.y; });
    if (leoFace.length && moonFace.length) {
      leoFace.forEach(function (lp, i) {
        var j = leoFace.length === 1 ? 0 : Math.round(i * (moonFace.length - 1) / (leoFace.length - 1));
        var mpt = moonFace[j];
        var bow = (i - (leoFace.length - 1) / 2) * 12;
        var arc = { p0: [lp.x, lp.y], c: [(lp.x + mpt.x) / 2, (lp.y + mpt.y) / 2 + bow], p1: [mpt.x, mpt.y] };
        var alpha = Math.max(0, Math.min(1, (Math.min(lp.face, mpt.face) - 0.12) / 0.4));
        fanG.append("path")
          .attr("d", "M" + arc.p0[0] + "," + arc.p0[1] + " Q" + arc.c[0] + "," + arc.c[1] + " " + arc.p1[0] + "," + arc.p1[1])
          .attr("fill", "none").attr("stroke", "rgba(" + FOREST + "," + (0.3 * alpha).toFixed(3) + ")")
          .attr("stroke-width", 1).attr("stroke-dasharray", "1.5 7");
        var outward = (lp.id % 2 === 0);   /* two-way: even LEO sat → Moon, odd → Earth */
        var ph = (time * 0.26 + lp.id * 0.13) % 1;
        var head = outward ? ph : 1 - ph;
        var step = outward ? -0.07 : 0.07;
        for (var c2 = 0; c2 < 5; c2++) {
          var tp = head + c2 * step;
          if (tp < 0 || tp > 1) continue;
          var pt = qbez(arc, tp), fade = 1 - c2 / 5;
          fanG.append("circle").attr("cx", pt[0]).attr("cy", pt[1])
            .attr("r", c2 === 0 ? 1.9 : 1.0 * fade)
            .attr("fill", "rgba(" + FOREST + "," + ((c2 === 0 ? 0.95 : 0.5 * fade * fade) * alpha).toFixed(3) + ")")
            .attr("filter", c2 === 0 ? "url(#rl-glow)" : null);
        }
      });
    }

    /* LEO shell ring links */
    for (var lr = 0; lr < LEO_N; lr++) {
      var ln = (lr + 1) % LEO_N;
      leoG.append("line").attr("x1", leoPos[lr].x).attr("y1", leoPos[lr].y).attr("x2", leoPos[ln].x).attr("y2", leoPos[ln].y)
        .attr("stroke", "rgba(" + BRIGHT + ",0.14)").attr("stroke-width", 0.6);
    }

    /* inner relay satellites — close orbit; downlink to ground stations, uplink to the LEO shell */
    var innerPos = [];
    for (var is = 0; is < INNER_N; is++) {
      var ilon = ((time * 24) + is * (360 / INNER_N)) % 360 - 180;
      var ip = projection([ilon, 6]);
      if (!visible([ilon, 6], ip)) { innerPos.push(null); continue; }
      var idx = ip[0] - EX, idy = ip[1] - EY, imag = Math.hypot(idx, idy) || 1;
      innerPos.push({ x: ip[0] + (idx / imag) * LIFT, y: ip[1] + (idy / imag) * LIFT });
    }
    innerPos.forEach(function (s, si) {
      if (!s) return;
      /* downlink to nearest visible ground station */
      var gc = null, gd = 1e9;
      cities.forEach(function (c) {
        var cp = projection([c.lon, c.lat]);
        if (!visible([c.lon, c.lat], cp)) return;
        var d = Math.hypot(cp[0] - s.x, cp[1] - s.y);
        if (d < gd) { gd = d; gc = cp; }
      });
      if (gc) {
        leoG.append("line").attr("x1", s.x).attr("y1", s.y).attr("x2", gc[0]).attr("y2", gc[1])
          .attr("stroke", "rgba(" + BRIGHT + ",0.14)").attr("stroke-width", 0.8);
        var raw = (time * (0.5 + si * 0.05)) % 2, tt = raw <= 1 ? raw : 2 - raw, dir = raw <= 1 ? 1 : -1;
        trail(leoG, s.x, s.y, gc[0], gc[1], tt, dir, 9, BRIGHT, 1.4);
      }
      /* uplink to nearest LEO shell satellite */
      var sc = leoPos[0], sd = 1e9;
      leoPos.forEach(function (p) { var d = Math.hypot(p.x - s.x, p.y - s.y); if (d < sd) { sd = d; sc = p; } });
      leoG.append("line").attr("x1", s.x).attr("y1", s.y).attr("x2", sc.x).attr("y2", sc.y)
        .attr("stroke", "rgba(" + BRIGHT + ",0.12)").attr("stroke-width", 0.7);
      trail(leoG, s.x, s.y, sc.x, sc.y, (time * 0.5 + si * 0.2) % 1, 1, 7, BRIGHT, 1.2);
      var iblink = 0.7 + Math.sin(time * 4 + si * 1.7) * 0.3;
      drawSat(leoG, s.x, s.y, 0.64, BRIGHT, iblink);
    });

    /* LEO shell satellite bodies (above the links) */
    leoPos.forEach(function (s, si) {
      var blink = 0.7 + Math.sin(time * 4 + si * 2) * 0.3;
      drawSat(leoG, s.x, s.y, 0.82, BRIGHT, blink);
    });

    /* lunar relay satellites — ring links + bodies (positions computed above) */
    for (var m2 = 0; m2 < MOON_N; m2++) {
      var n = (m2 + 1) % MOON_N;
      moonSatG.append("line").attr("x1", msat[m2].x).attr("y1", msat[m2].y).attr("x2", msat[n].x).attr("y2", msat[n].y)
        .attr("stroke", "rgba(" + FOREST + ",0.14)").attr("stroke-width", 0.6);
    }
    msat.forEach(function (p, mi) {
      var blink = 0.7 + Math.sin(time * 4 + mi * 1.7) * 0.3;
      drawSat(moonSatG, p.x, p.y, 0.62, FOREST, blink);
    });

    /* lunar surface nodes + downlink from relay */
    moonBases.forEach(function (b, bi) {
      var near = msat[0];
      for (var z = 1; z < msat.length; z++) if (Math.hypot(msat[z].x - b.x, msat[z].y - b.y) < Math.hypot(near.x - b.x, near.y - b.y)) near = msat[z];
      baseG.append("line").attr("x1", b.x).attr("y1", b.y).attr("x2", near.x).attr("y2", near.y)
        .attr("stroke", "rgba(" + BRIGHT + ",0.18)").attr("stroke-width", 0.7);
      var blink = 0.7 + Math.sin(time * 2.6 + bi * 1.5) * 0.3;
      baseG.append("circle").attr("cx", b.x).attr("cy", b.y).attr("r", 7 + Math.sin(time * 1.8 + bi) * 2)
        .attr("fill", "none").attr("stroke", "rgba(" + COBALT + "," + 0.4 * blink + ")").attr("stroke-width", 1);
      baseG.append("circle").attr("cx", b.x).attr("cy", b.y).attr("r", 10)
        .attr("fill", "rgba(" + COBALT + "," + 0.22 * blink + ")").attr("filter", "url(#rl-glow)");
      baseG.append("circle").attr("cx", b.x).attr("cy", b.y).attr("r", 2.6).attr("fill", "rgba(" + COBALT + "," + blink + ")");
      baseG.append("circle").attr("cx", b.x).attr("cy", b.y).attr("r", 1.1).attr("fill", "#ffffff");
    });

    /* city nodes + labels (globe.js) */
    cities.forEach(function (c, i) {
      var p = projection([c.lon, c.lat]);
      var dist = d3.geoDistance([c.lon, c.lat], ctr);
      if (!p || dist >= Math.PI / 2) return;
      var blink = 0.7 + Math.sin(time * 2.5 + i * 1.3) * 0.3;
      var ring = 12 + Math.sin(time * 1.8 + i) * 3;
      cityG.append("circle").attr("cx", p[0]).attr("cy", p[1]).attr("r", ring)
        .attr("fill", "none").attr("stroke", "rgba(" + COBALT + "," + 0.34 * blink + ")").attr("stroke-width", 1);
      cityG.append("circle").attr("cx", p[0]).attr("cy", p[1]).attr("r", 16)
        .attr("fill", "rgba(" + COBALT + "," + 0.22 * blink + ")").attr("filter", "url(#rl-glow)");
      cityG.append("circle").attr("cx", p[0]).attr("cy", p[1]).attr("r", 4).attr("fill", "rgba(" + COBALT + "," + blink + ")");
      cityG.append("circle").attr("cx", p[0]).attr("cy", p[1]).attr("r", 1.8).attr("fill", "#ffffff");
      if (dist < Math.PI / 3) {
        cityG.append("text").attr("x", p[0] + 10).attr("y", p[1] + 3)
          .attr("font-family", "'Outfit', system-ui, sans-serif").attr("font-size", "10px")
          .attr("font-weight", "600").attr("letter-spacing", "0.06em")
          .attr("fill", "rgba(" + INK + "," + 0.9 * blink + ")").text(c.name);
      }
    });
  }

  var raf = null;
  function tick() { render(); raf = requestAnimationFrame(tick); }
  function startLoop() { if (raf == null && !reduce) raf = requestAnimationFrame(tick); }
  function stopLoop() { if (raf != null) { cancelAnimationFrame(raf); raf = null; } }

  if (reduce) {
    render();
  } else if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? startLoop() : stopLoop(); });
    }, { threshold: 0.02 }).observe(el);
  } else {
    startLoop();
  }
})();
