/* Útvonaltervező: A* az OSM-úthálózaton (a megyei .bin fájlokból), a térképen és a minitérképen kirajzolt útvonalhoz.
   Újratervez, ha a cél változik vagy a jármű letér az útvonalról. */
const SPEED = [8.5, 11, 14, 17, 22, 28, 30, 30];   // m/s osztályonként (0 = lakóút/szerviz); földút 4,5 m/s

export function createRouter(osm) {
  let G = null, gBox = null, target = null, route = null, waitT = 0, chkT = 0;
  function heapPush(h, f, n) { h.push([f, n]); let i = h.length - 1; while (i) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } }
  function heapPop(h) { const top = h[0], last = h.pop(); if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return top; }
  function buildGraph(p) { const pad = 1500, x0 = Math.min(p.x, target[0]) - pad, z0 = Math.min(p.z, target[1]) - pad, x1 = Math.max(p.x, target[0]) + pad, z1 = Math.max(p.z, target[1]) + pad;
    const raw = osm.roadGraph(x0, z0, x1, z1); if (!raw) return false; const n = raw.x.length, deg = new Int32Array(n + 1), e = raw.e;
    for (let i = 0; i < e.length; i += 4) { deg[e[i] + 1]++; deg[e[i + 1] + 1]++; } for (let i = 0; i < n; i++) deg[i + 1] += deg[i];
    const adj = new Int32Array(deg[n]), cost = new Float32Array(deg[n]), fill = deg.slice(0, n);
    for (let i = 0; i < e.length; i += 4) { const a = e[i], b = e[i + 1], dirt = !e[i + 2] && !(e[i + 3] & 32), c = Math.hypot(raw.x[a] - raw.x[b], raw.z[a] - raw.z[b]) / (dirt ? 4.5 : SPEED[e[i + 2]]);
      adj[fill[a]] = b; cost[fill[a]++] = c; adj[fill[b]] = a; cost[fill[b]++] = c; }
    G = { x: raw.x, z: raw.z, n, deg, adj, cost }; gBox = [x0 + 300, z0 + 300, x1 - 300, z1 - 300]; return true; }
  function nearest(x, z) { let best = -1, bd = 1e18; for (let i = 0; i < G.n; i++) { if (G.deg[i + 1] === G.deg[i]) continue; const d = (G.x[i] - x) ** 2 + (G.z[i] - z) ** 2; if (d < bd) { bd = d; best = i; } } return best; }
  function plan(p) { const s = nearest(p.x, p.z), t = nearest(target[0], target[1]); if (s < 0 || t < 0) return null; const tx = G.x[t], tz = G.z[t];
    const g = new Float64Array(G.n).fill(Infinity), from = new Int32Array(G.n).fill(-1), done = new Uint8Array(G.n), h = []; g[s] = 0; heapPush(h, 0, s);
    while (h.length) { const [, u] = heapPop(h); if (done[u]) continue; done[u] = 1; if (u === t) break;
      for (let k = G.deg[u]; k < G.deg[u + 1]; k++) { const w = G.adj[k]; if (done[w]) continue; const ng = g[u] + G.cost[k]; if (ng < g[w]) { g[w] = ng; from[w] = u; heapPush(h, ng + Math.hypot(G.x[w] - tx, G.z[w] - tz) / 30, w); } } }
    if (!done[t]) return null; const out = [[target[0], target[1]]]; for (let u = t, g2 = 0; u !== -1 && g2 < G.n; u = from[u], g2++) out.push([G.x[u], G.z[u]]); out.push([p.x, p.z]); return out.reverse(); }
  // a jármű legközelebbi pontja az útvonalon: [távolság, szakaszindex]
  function onRoute(p) { let bd = 1e9, bi = 0; for (let i = 0; i + 1 < route.length; i++) { const [ax, az] = route[i], [bx, bz] = route[i + 1], dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.z - az) * dz) / L)), d = Math.hypot(p.x - ax - dx * t, p.z - az - dz * t); if (d < bd) { bd = d; bi = i; } } return [bd, bi]; }
  function replan(p) { if (!G || p.x < gBox[0] || p.z < gBox[1] || p.x > gBox[2] || p.z > gBox[3]) { if (!buildGraph(p)) { waitT = 1; return; } } route = plan(p); if (!route) waitT = 3; }
  return {
    set(t) { if (!t) { target = null; route = null; G = null; return; } if (target && Math.hypot(t[0] - target[0], t[1] - target[1]) < 1) return; target = t; route = null; G = null; waitT = 0; },
    update(p, dt) { if (!target) return null; if (Math.hypot(p.x - target[0], p.z - target[1]) < 25) return route = null;
      if (!route) { if ((waitT -= dt) <= 0) replan(p); return route; }
      if ((chkT -= dt) <= 0) { chkT = .5; const [d, i] = onRoute(p); if (d > 40) { replan(p); return route; } if (i > 0) route = route.slice(i); route[0] = [p.x, p.z]; }
      return route; },
    get route() { return route; } };
}
