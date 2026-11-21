// Az Átemelőtelep – kis WebGL-megjelenítő: pixelenkénti fények (zseblámpa-kúp, pontfények, villám), köd, kibocsátó (világító) felületek.
export const hex = c => [(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255];
const hx = c => Array.isArray(c) ? c : hex(c);
export const M4 = {
  persp(f, a, n, fa) { const t = 1 / Math.tan(f / 2), o = new Float32Array(16); o[0] = t / a; o[5] = t; o[10] = (fa + n) / (n - fa); o[11] = -1; o[14] = 2 * fa * n / (n - fa); return o; },
  mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  trs(x, y, z, yaw, pitch, sx, sy, sz, roll = 0) { const cy = Math.cos(yaw), sy_ = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), o = new Float32Array(16);
    o[0] = cy * sx; o[1] = 0; o[2] = -sy_ * sx; o[4] = sy_ * sp * sy; o[5] = cp * sy; o[6] = cy * sp * sy; o[8] = sy_ * cp * sz; o[9] = -sp * sz; o[10] = cy * cp * sz; o[12] = x; o[13] = y; o[14] = z; o[15] = 1;
    if (roll) { const r = M4.trs(0, 0, 0, 0, 0, 1, 1, 1); const c = Math.cos(roll), s = Math.sin(roll); r[0] = c; r[1] = s; r[4] = -s; r[5] = c; return M4.mul(o, r); } return o; },
  view(x, y, z, yaw, pitch) { const r = M4.trs(x, y, z, yaw, pitch, 1, 1, 1), o = new Float32Array(16); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[j * 4 + i] = r[i * 4 + j];
    o[12] = -(o[0] * x + o[4] * y + o[8] * z); o[13] = -(o[1] * x + o[5] * y + o[9] * z); o[14] = -(o[2] * x + o[6] * y + o[10] * z); o[15] = 1; return o; }
};
/* geometria: csúcsonként pozíció, normál, szín (rgb + kibocsátás) */
export class Geo { constructor() { this.v = []; }
  tri(a, b, c, col, e = 0) { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (const p of [a, b, c]) this.v.push(p[0], p[1], p[2], nx, ny, nz, col[0], col[1], col[2], e); }
  quad(a, b, c, d, col, e) { this.tri(a, b, c, col, e); this.tri(a, c, d, col, e); }
  box(a, b, col, e = 0) { const [x0, y0, z0] = a, [x1, y1, z1] = b, c = hx(col);
    this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], c, e); this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], c, e);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], c, e); this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], c, e);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], c, e); this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], c, e); }
  cyl(x, z, r, h, y0, col, n = 10, e = 0) { const c = hx(col); for (let i = 0; i < n; i++) { const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, p0 = [x + Math.cos(a0) * r, z + Math.sin(a0) * r], p1 = [x + Math.cos(a1) * r, z + Math.sin(a1) * r];
      this.quad([p1[0], y0, p1[1]], [p0[0], y0, p0[1]], [p0[0], y0 + h, p0[1]], [p1[0], y0 + h, p1[1]], c, e); this.tri([x, y0 + h, z], [p1[0], y0 + h, p1[1]], [p0[0], y0 + h, p0[1]], c, e); } }
  hcyl(p0, p1, r, col, n = 8, e = 0) { const c = hx(col), d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], l = Math.hypot(...d) || 1, a = Math.abs(d[1] / l) > .9 ? [1, 0, 0] : [0, 1, 0], u = norm(cross(d, a)), v = norm(cross(d, u));
    for (let i = 0; i < n; i++) { const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, o = q => [u[0] * Math.cos(q) * r + v[0] * Math.sin(q) * r, u[1] * Math.cos(q) * r + v[1] * Math.sin(q) * r, u[2] * Math.cos(q) * r + v[2] * Math.sin(q) * r], A = o(a0), B = o(a1);
      this.quad([p0[0] + A[0], p0[1] + A[1], p0[2] + A[2]], [p1[0] + A[0], p1[1] + A[1], p1[2] + A[2]], [p1[0] + B[0], p1[1] + B[1], p1[2] + B[2]], [p0[0] + B[0], p0[1] + B[1], p0[2] + B[2]], c, e); } }
  sphere(r, col, st = 6, sl = 8, e = 0) { const c = hx(col), P = (i, j) => { const t = i / st * Math.PI, f = j / sl * 6.2832; return [Math.sin(t) * Math.cos(f) * r, Math.cos(t) * r, Math.sin(t) * Math.sin(f) * r]; }; for (let i = 0; i < st; i++) for (let j = 0; j < sl; j++) this.quad(P(i, j), P(i, j + 1), P(i + 1, j + 1), P(i + 1, j), c, e); }
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm = a => { const l = Math.hypot(...a) || 1; return a.map(v => v / l); };

const NL = 8;
const VS = `attribute vec3 aP;attribute vec3 aN;attribute vec4 aC;uniform mat4 uVP;uniform mat4 uM;varying vec3 vW;varying vec3 vN;varying vec4 vC;
void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=normalize(mat3(uM[0].xyz,uM[1].xyz,uM[2].xyz)*aN);vC=aC;gl_Position=uVP*w;}`;
const FS = `precision mediump float;varying vec3 vW;varying vec3 vN;varying vec4 vC;
uniform vec3 uAmb;uniform vec3 uSunD;uniform vec3 uSunC;uniform vec3 uCam;uniform vec3 uFog;uniform vec2 uFogR;
uniform vec3 uSpP;uniform vec3 uSpD;uniform vec3 uSpC;uniform vec2 uSpK;
uniform vec4 uLP[${NL}];uniform vec3 uLC[${NL}];uniform vec3 uTint;uniform float uUseT;uniform float uEm;uniform float uA;
void main(){vec3 n=normalize(vN);vec3 base=mix(vC.rgb,vC.rgb*uTint,uUseT);float em=max(vC.a,uEm);
vec3 li=uAmb*(.6+.4*(.5+.5*n.y))+uSunC*max(dot(n,uSunD),0.);
vec3 d=vW-uSpP;float dl=length(d);vec3 dd=d/max(dl,.001);float cs=dot(dd,uSpD);float cone=smoothstep(uSpK.x,uSpK.y,cs);li+=uSpC*cone*max(dot(n,-dd),0.)*(1./(1.+.06*dl*dl));
for(int i=0;i<${NL};i++){vec3 l=uLP[i].xyz-vW;float r=uLP[i].w;if(r<=0.)continue;float ll=length(l);float a=max(0.,1.-ll/r);li+=uLC[i]*a*a*max(dot(n,l/max(ll,.001)),0.);}
vec3 col=base*li+base*em*1.4;float f=clamp((length(vW-uCam)-uFogR.x)/(uFogR.y-uFogR.x),0.,1.);gl_FragColor=vec4(mix(col,uFog,f),uA);}`;
const PVS = `attribute vec3 aP;attribute vec4 aC;attribute float aS;uniform mat4 uVP;uniform float uPx;varying vec4 vC;void main(){gl_Position=uVP*vec4(aP,1.);gl_PointSize=clamp(aS*uPx/gl_Position.w,1.,24.);vC=aC;}`;
const PFS = `precision mediump float;varying vec4 vC;void main(){vec2 c=gl_PointCoord-.5;if(abs(c.x)>.12&&vC.a<.5)discard;if(dot(c,c)>.25)discard;gl_FragColor=vC;}`;

export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance' }); if (!gl) return null;
  const prog = (vs, fs) => { const p = gl.createProgram(); for (const [t, s] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); gl.attachShader(p, sh); } gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name.replace('[0]', '')] = gl.getUniformLocation(p, a.name); } return { p, u, a: n => gl.getAttribLocation(p, n) }; };
  const S = prog(VS, FS), PT = prog(PVS, PFS);
  const vbo = (data, dyn) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW); return b; };
  const mk = g => ({ b: vbo(new Float32Array(g.v)), n: g.v.length / 10 });
  const unit = {}; { let g = new Geo(); g.box([-.5, -.5, -.5], [.5, .5, .5], [1, 1, 1]); unit.box = mk(g); g = new Geo(); g.cyl(0, 0, 1, 1, 0, [1, 1, 1], 12); unit.cyl = mk(g); g = new Geo(); g.sphere(1, [1, 1, 1]); unit.sph = mk(g); }
  let world = null, VP = null, partB = vbo(new Float32Array(8 * 4000), true), fogC = [0, 0, 0];
  const bind = m => { gl.bindBuffer(gl.ARRAY_BUFFER, m.b); const st = 40; for (const [n, s, o] of [['aP', 3, 0], ['aN', 3, 12], ['aC', 4, 24]]) { const l = S.a(n); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, s, gl.FLOAT, false, st, o); } };
  const ID = M4.trs(0, 0, 0, 0, 0, 1, 1, 1), LP = new Float32Array(4 * NL), LC = new Float32Array(3 * NL);
  const R = {
    gl, mk, bind,
    setWorld(g) { if (world) gl.deleteBuffer(world.b); world = mk(g); },
    resize(scale) { const d = Math.min(2, devicePixelRatio || 1) * scale, w = Math.max(1, Math.round(canvas.clientWidth * d)), h = Math.max(1, Math.round(canvas.clientHeight * d)); if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; } },
    // env: { amb, sunD, sunC, fog, far, spot: { p, d, c, k:[külső cos, belső cos] }, lights: [[x,y,z,r, cr,cg,cb]] }
    begin(c, env) { gl.viewport(0, 0, canvas.width, canvas.height); fogC = env.fog; gl.clearColor(env.fog[0], env.fog[1], env.fog[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.frontFace(gl.CCW); gl.disable(gl.BLEND);
      VP = M4.mul(M4.persp(c.fov, canvas.width / canvas.height, .05, env.far + 5), M4.view(c.x, c.y, c.z, c.yaw, c.pitch)); gl.useProgram(S.p); const u = S.u;
      gl.uniformMatrix4fv(u.uVP, false, VP); gl.uniform3fv(u.uAmb, env.amb); gl.uniform3fv(u.uSunD, env.sunD); gl.uniform3fv(u.uSunC, env.sunC); gl.uniform3f(u.uCam, c.x, c.y, c.z); gl.uniform3fv(u.uFog, env.fog); gl.uniform2f(u.uFogR, env.far * .15, env.far);
      const sp = env.spot; gl.uniform3fv(u.uSpP, sp.p); gl.uniform3fv(u.uSpD, sp.d); gl.uniform3fv(u.uSpC, sp.c); gl.uniform2fv(u.uSpK, sp.k);
      LP.fill(0); LC.fill(0); env.lights.slice(0, NL).forEach((l, i) => { LP.set(l.slice(0, 4), i * 4); LC.set(l.slice(4, 7), i * 3); }); gl.uniform4fv(u.uLP, LP); gl.uniform3fv(u.uLC, LC);
      gl.uniform1f(u.uUseT, 0); gl.uniform1f(u.uEm, 0); gl.uniform1f(u.uA, 1); gl.uniformMatrix4fv(u.uM, false, ID); if (world) { bind(world); gl.drawArrays(gl.TRIANGLES, 0, world.n); } },
    draw(kind, m, col, em = 0, alpha = 1) { const u = typeof kind === 'string' ? unit[kind] : kind; gl.uniformMatrix4fv(S.u.uM, false, m); gl.uniform3fv(S.u.uTint, col || [1, 1, 1]); gl.uniform1f(S.u.uUseT, col ? 1 : 0); gl.uniform1f(S.u.uEm, em);
      if (alpha < 1) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.uniform1f(S.u.uA, alpha); } bind(u); gl.drawArrays(gl.TRIANGLES, 0, u.n); if (alpha < 1) { gl.disable(gl.BLEND); gl.depthMask(true); gl.uniform1f(S.u.uA, 1); } },
    points(arr, n, px) { if (n <= 0) return; for (const k of ['aP', 'aN', 'aC']) gl.disableVertexAttribArray(S.a(k)); gl.useProgram(PT.p); gl.uniformMatrix4fv(PT.u.uVP, false, VP); gl.uniform1f(PT.u.uPx, canvas.height * px); gl.bindBuffer(gl.ARRAY_BUFFER, partB); gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr.subarray(0, n * 8));
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); for (const [k, s, o] of [['aP', 3, 0], ['aC', 4, 12], ['aS', 1, 28]]) { const l = PT.a(k); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, s, gl.FLOAT, false, 32, o); }
      gl.drawArrays(gl.POINTS, 0, n); for (const k of ['aP', 'aC', 'aS']) gl.disableVertexAttribArray(PT.a(k)); gl.depthMask(true); gl.disable(gl.BLEND); gl.useProgram(S.p); },
    hand(fov, parts, light) { gl.clear(gl.DEPTH_BUFFER_BIT); gl.useProgram(S.p); const u = S.u; gl.uniformMatrix4fv(u.uVP, false, M4.persp(fov, canvas.width / canvas.height, .02, 5)); gl.uniform3f(u.uCam, 0, 0, 0); gl.uniform2f(u.uFogR, 50, 60);
      gl.uniform3fv(u.uSpC, [0, 0, 0]); gl.uniform3fv(u.uAmb, light); LP.fill(0); gl.uniform4fv(u.uLP, LP); for (const p of parts) R.draw(p[0], p[1], p[2], p[3] || 0); }
  };
  return R;
}
