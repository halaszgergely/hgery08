// Locsolóháború – kis saját WebGL-megjelenítő low-poly jelenetekhez (textúra nélkül: csúcsszínek, irányfény, köd).
const hex = c => [(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255];
export const M4 = {
  persp(f, a, n, fa) { const t = 1 / Math.tan(f / 2), o = new Float32Array(16); o[0] = t / a; o[5] = t; o[10] = (fa + n) / (n - fa); o[11] = -1; o[14] = 2 * fa * n / (n - fa); return o; },
  mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  // T · Ry(yaw) · Rx(pitch) · S
  trs(x, y, z, yaw, pitch, sx, sy, sz) { const cy = Math.cos(yaw), sy_ = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), o = new Float32Array(16);
    o[0] = cy * sx; o[1] = 0; o[2] = -sy_ * sx; o[4] = sy_ * sp * sy; o[5] = cp * sy; o[6] = cy * sp * sy; o[8] = sy_ * cp * sz; o[9] = -sp * sz; o[10] = cy * cp * sz; o[12] = x; o[13] = y; o[14] = z; o[15] = 1; return o; },
  view(x, y, z, yaw, pitch) { const r = M4.trs(x, y, z, yaw, pitch, 1, 1, 1); // inverz egy tiszta forgatás + eltolásnak
    const o = new Float32Array(16); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[j * 4 + i] = r[i * 4 + j]; o[12] = -(o[0] * x + o[4] * y + o[8] * z); o[13] = -(o[1] * x + o[5] * y + o[9] * z); o[14] = -(o[2] * x + o[6] * y + o[10] * z); o[15] = 1; return o; }
};
/* ---------- geometria ---------- */
class Geo { constructor() { this.v = []; }
  tri(a, b, c, col) { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (const p of [a, b, c]) this.v.push(p[0], p[1], p[2], nx, ny, nz, col[0], col[1], col[2]); }
  quad(a, b, c, d, col) { this.tri(a, b, c, col); this.tri(a, c, d, col); }
  box(a, b, col, j = 0) { const [x0, y0, z0] = a, [x1, y1, z1] = b, c = hexOr(col), sh = k => c.map(v => Math.min(1, v * k + j));
    this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], sh(1.08)); this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], sh(.7));
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], sh(.97)); this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], sh(.93));
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], sh(.95)); this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], sh(.9)); }
  cyl(x, z, r, h, y0, col, n = 10, cap = 1) { const c = hexOr(col); for (let i = 0; i < n; i++) { const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, p0 = [x + Math.cos(a0) * r, z + Math.sin(a0) * r], p1 = [x + Math.cos(a1) * r, z + Math.sin(a1) * r];
      this.quad([p1[0], y0, p1[1]], [p0[0], y0, p0[1]], [p0[0], y0 + h, p0[1]], [p1[0], y0 + h, p1[1]], c); if (cap) this.tri([x, y0 + h, z], [p1[0], y0 + h, p1[1]], [p0[0], y0 + h, p0[1]], c.map(v => Math.min(1, v * 1.07))); } }
  cone(x, z, r, h, y0, col, n = 8) { const c = hexOr(col); for (let i = 0; i < n; i++) { const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, k = .9 + .2 * (i % 2); this.tri([x + Math.cos(a1) * r, y0, z + Math.sin(a1) * r], [x + Math.cos(a0) * r, y0, z + Math.sin(a0) * r], [x, y0 + h, z], c.map(v => v * k)); this.tri([x, y0, z], [x + Math.cos(a0) * r, y0, z + Math.sin(a0) * r], [x + Math.cos(a1) * r, y0, z + Math.sin(a1) * r], c.map(v => v * .6)); } }
  hcyl(x0, z0, x1, z1, r, y, col, n = 8) { const c = hexOr(col), dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1, px = -dz / l, pz = dx / l;
    for (let i = 0; i < n; i++) { const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, o = a => [px * Math.cos(a) * r, Math.sin(a) * r, pz * Math.cos(a) * r], u = o(a0), w = o(a1);
      this.quad([x0 + u[0], y + u[1], z0 + u[2]], [x1 + u[0], y + u[1], z1 + u[2]], [x1 + w[0], y + w[1], z1 + w[2]], [x0 + w[0], y + w[1], z0 + w[2]], c); } }
  sphere(r, col, st = 6, sl = 8) { const c = hexOr(col), P = (i, j) => { const t = i / st * Math.PI, f = j / sl * 6.2832; return [Math.sin(t) * Math.cos(f) * r, Math.cos(t) * r, Math.sin(t) * Math.sin(f) * r]; };
    for (let i = 0; i < st; i++) for (let j = 0; j < sl; j++) this.quad(P(i, j), P(i, j + 1), P(i + 1, j + 1), P(i + 1, j), c); }
}
const hexOr = c => Array.isArray(c) ? c : hex(c);

const VS = `attribute vec3 aP;attribute vec3 aN;attribute vec3 aC;uniform mat4 uVP;uniform mat4 uM;uniform vec3 uTint;uniform float uUseTint;uniform float uWet;uniform vec3 uL;uniform vec3 uCam;uniform vec2 uFogR;uniform float uGlow;varying vec3 vC;varying float vF;
void main(){vec4 w=uM*vec4(aP,1.);vec3 n=normalize(mat3(uM[0].xyz,uM[1].xyz,uM[2].xyz)*aN);float d=max(dot(n,uL),0.);vec3 b=mix(aC,aC*uTint,uUseTint);b=mix(b,b*vec3(.5,.66,1.)*.9,uWet);vC=b*(.4+.22*(.5+.5*n.y)+.6*d)+uGlow*b;vF=clamp((length(w.xyz-uCam)-uFogR.x)/(uFogR.y-uFogR.x),0.,1.);gl_Position=uVP*w;}`;
const FS = `precision mediump float;varying vec3 vC;varying float vF;uniform vec3 uFog;uniform float uA;void main(){gl_FragColor=vec4(mix(vC,uFog,vF),uA);}`;
const PVS = `attribute vec3 aP;attribute vec4 aC;attribute float aS;uniform mat4 uVP;uniform float uPx;varying vec4 vC;void main(){gl_Position=uVP*vec4(aP,1.);gl_PointSize=clamp(aS*uPx/gl_Position.w,1.,36.);vC=aC;}`;
const PFS = `precision mediump float;varying vec4 vC;void main(){vec2 c=gl_PointCoord-.5;float r=dot(c,c);if(r>.25)discard;gl_FragColor=vec4(vC.rgb*(1.15-r*1.6),vC.a);}`;

export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false }); if (!gl) return null;
  const prog = (vs, fs) => { const p = gl.createProgram(); for (const [t, s] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); gl.attachShader(p, sh); } gl.linkProgram(p); const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); } return { p, u, a: n => gl.getAttribLocation(p, n) }; };
  const S = prog(VS, FS), PT = prog(PVS, PFS);
  const vbo = (data, dyn) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW); return b; };
  const mk = g => ({ b: vbo(new Float32Array(g.v)), n: g.v.length / 9 });
  const unit = {}; { let g = new Geo(); g.box([-.5, -.5, -.5], [.5, .5, .5], [1, 1, 1]); unit.box = mk(g); g = new Geo(); g.cyl(0, 0, 1, 1, 0, [1, 1, 1], 10); unit.cyl = mk(g); g = new Geo(); g.cone(0, 0, 1, 1, 0, [1, 1, 1], 8); unit.cone = mk(g); g = new Geo(); g.sphere(1, [1, 1, 1]); unit.sph = mk(g); }
  let world = null, water = null, decalB = null, decalN = 0, partB = vbo(new Float32Array(8 * 3000), true), fog = [.6, .75, .9], VP = null, cam = [0, 0, 0], fogR = [30, 90];
  const bindMesh = m => { gl.bindBuffer(gl.ARRAY_BUFFER, m.b); const st = 36; for (const [n, o] of [['aP', 0], ['aN', 12], ['aC', 24]]) { const l = S.a(n); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.FLOAT, false, st, o); } };
  const ID = M4.trs(0, 0, 0, 0, 0, 1, 1, 1);
  const R = {
    gl,
    setMap(M) { const g = new Geo(), wg = new Geo(), gc = hex(M.ground), T = 4;
      for (let x = -M.W / 2; x < M.W / 2; x += T) for (let z = -M.D / 2; z < M.D / 2; z += T) { const k = .94 + ((Math.sin(x * 12.9 + z * 78.2) * 43758.5) % 1 + 1) % 1 * .12; g.quad([x, 0, z], [x, 0, z + T], [x + T, 0, z + T], [x + T, 0, z], gc.map(v => v * k)); }
      for (const b of M.boxes) if (!(b.k & 8)) g.box(b.a, b.b, b.c, 0);
      for (const v of M.vis) { if (v.t === 'box') g.box(v.a, v.b, v.c); else if (v.t === 'cyl') g.cyl(v.x, v.z, v.r, v.h, v.y0, v.c, v.n); else if (v.t === 'cone') g.cone(v.x, v.z, v.r, v.h, v.y0, v.c, v.n); else if (v.t === 'hcyl') g.hcyl(v.x0, v.z0, v.x1, v.z1, v.r, v.y, v.c); else if (v.t === 'water') wg.quad([v.a[0], v.a[1], v.a[2]], [v.a[0], v.a[1], v.b[2]], [v.b[0], v.a[1], v.b[2]], [v.b[0], v.a[1], v.a[2]], [.25, .55, .85]); }
      world = mk(g); water = wg.v.length ? mk(wg) : null; fog = M.fog; },
    resize(scale) { const d = Math.min(2, devicePixelRatio || 1) * scale, w = Math.max(1, Math.round(canvas.clientWidth * d)), h = Math.max(1, Math.round(canvas.clientHeight * d)); if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; } },
    begin(c, far) { gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(fog[0], fog[1], fog[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.frontFace(gl.CCW); gl.disable(gl.BLEND);
      fogR = [far * .35, far]; VP = M4.mul(M4.persp(c.fov, canvas.width / canvas.height, .05, far + 10), M4.view(c.x, c.y, c.z, c.yaw, c.pitch)); cam = [c.x, c.y, c.z];
      gl.useProgram(S.p); gl.uniformMatrix4fv(S.u.uVP, false, VP); gl.uniform3f(S.u.uL, .45, .8, .38); gl.uniform3fv(S.u.uCam, cam); gl.uniform2fv(S.u.uFogR, fogR); gl.uniform3fv(S.u.uFog, fog); gl.uniform1f(S.u.uA, 1); gl.uniform1f(S.u.uWet, 0); gl.uniform1f(S.u.uUseTint, 0); gl.uniform1f(S.u.uGlow, 0); gl.uniformMatrix4fv(S.u.uM, false, ID);
      if (world) { bindMesh(world); gl.drawArrays(gl.TRIANGLES, 0, world.n); } },
    draw(kind, m, col, wet = 0, glow = 0, alpha = 1) { const u = unit[kind]; gl.uniformMatrix4fv(S.u.uM, false, m); gl.uniform3fv(S.u.uTint, col); gl.uniform1f(S.u.uUseTint, 1); gl.uniform1f(S.u.uWet, wet); gl.uniform1f(S.u.uGlow, glow);
      if (alpha < 1) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.uniform1f(S.u.uA, alpha); } bindMesh(u); gl.drawArrays(gl.TRIANGLES, 0, u.n); if (alpha < 1) { gl.disable(gl.BLEND); gl.uniform1f(S.u.uA, 1); } },
    // átlátszó rétegek: víz, foltok (tócsák), részecskék
    after(t, decals, parts, pn, pxScale) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.uniform1f(S.u.uUseTint, 0); gl.uniform1f(S.u.uWet, 0); gl.uniform1f(S.u.uGlow, 0); gl.uniformMatrix4fv(S.u.uM, false, ID);
      if (water) { gl.uniform1f(S.u.uA, .72 + Math.sin(t * 2) * .04); bindMesh(water); gl.drawArrays(gl.TRIANGLES, 0, water.n); }
      if (decals) { if (decals.dirty) { const g = new Geo(); for (const d of decals.l) { const n = d.n, a = Math.abs(n[1]) > .9 ? [1, 0, 0] : [0, 1, 0], u = norm(cross(n, a)), v = cross(n, u), r = d.r, c = [.32, .55, .78], o = [d.x + n[0] * .012, d.y + n[1] * .012, d.z + n[2] * .012], P = k => { const f = k / 7 * 6.2832; return [o[0] + (u[0] * Math.cos(f) + v[0] * Math.sin(f)) * r, o[1] + (u[1] * Math.cos(f) + v[1] * Math.sin(f)) * r, o[2] + (u[2] * Math.cos(f) + v[2] * Math.sin(f)) * r]; }; for (let k = 0; k < 7; k++) g.tri(o, P(k + 1), P(k), c); }
          if (decalB) gl.deleteBuffer(decalB.b); decalB = g.v.length ? mk(g) : null; decals.dirty = 0; }
        if (decalB) { gl.disable(gl.CULL_FACE); gl.depthMask(false); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-1, -2); gl.uniform1f(S.u.uA, .32); bindMesh(decalB); gl.drawArrays(gl.TRIANGLES, 0, decalB.n); gl.disable(gl.POLYGON_OFFSET_FILL); gl.depthMask(true); gl.enable(gl.CULL_FACE); } }
      gl.uniform1f(S.u.uA, 1);
      for (const n of ['aP', 'aN', 'aC']) gl.disableVertexAttribArray(S.a(n));
      if (pn > 0) { gl.useProgram(PT.p); gl.uniformMatrix4fv(PT.u.uVP, false, VP); gl.uniform1f(PT.u.uPx, canvas.height * pxScale); gl.bindBuffer(gl.ARRAY_BUFFER, partB); gl.bufferSubData(gl.ARRAY_BUFFER, 0, parts.subarray(0, pn * 8)); gl.depthMask(false);
        const st = 32; for (const [n, s, o] of [['aP', 3, 0], ['aC', 4, 12], ['aS', 1, 28]]) { const l = PT.a(n); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, s, gl.FLOAT, false, st, o); } gl.drawArrays(gl.POINTS, 0, pn); for (const n of ['aP', 'aC', 'aS']) gl.disableVertexAttribArray(PT.a(n)); gl.depthMask(true); gl.useProgram(S.p); }
      gl.disable(gl.BLEND); },
    // a kézben tartott fegyver: nézettérben, a jelenet fölé rajzolva
    viewModel(fov, parts) { gl.clear(gl.DEPTH_BUFFER_BIT); gl.useProgram(S.p); gl.uniformMatrix4fv(S.u.uVP, false, M4.persp(fov, canvas.width / canvas.height, .02, 5)); gl.uniform3f(S.u.uCam, 0, 0, 0); gl.uniform2f(S.u.uFogR, 50, 60); gl.uniform3f(S.u.uL, .3, .85, .45);
      for (const p of parts) R.draw(p[0], p[1], p[2], 0, p[3] || 0); }
  };
  return R;
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm = a => { const l = Math.hypot(...a) || 1; return a.map(v => v / l); };
export { hex };
