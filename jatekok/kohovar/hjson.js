// Kohóvár – Hjson / Arc-JSON olvasó (a Mindustry tartalom- és szabályfájljaihoz)
export function parseHjson(src) {
  let i = 0; const s = src.replace(/^﻿/, '');
  const ws = () => { for (;;) { while (i < s.length && /\s/.test(s[i])) i++; if (s[i] === '#' || (s[i] === '/' && s[i + 1] === '/')) { while (i < s.length && s[i] !== '\n') i++; continue; } if (s[i] === '/' && s[i + 1] === '*') { i = s.indexOf('*/', i + 2); i = i < 0 ? s.length : i + 2; continue; } break; } };
  const wsLine = () => { while (i < s.length && (s[i] === ' ' || s[i] === '\t' || s[i] === '\r')) i++; };
  const str = q => { let o = ''; i++; while (i < s.length && s[i] !== q) { if (s[i] === '\\') { i++; const c = s[i]; o += c === 'n' ? '\n' : c === 't' ? '\t' : c === 'u' ? String.fromCharCode(parseInt(s.substr(i + 1, 4), 16)) + ((i += 4), '') : c; } else o += s[i]; i++; } i++; return o; };
  const ml = () => { i += 3; const e = s.indexOf("'''", i); const t = s.slice(i, e < 0 ? s.length : e); i = e < 0 ? s.length : e + 3; return t.replace(/^\n/, '').replace(/\n[ \t]*$/, ''); };
  const key = () => { ws(); if (s[i] === '"' || s[i] === "'") return str(s[i]); let k = ''; while (i < s.length && !/[:\s{}\[\],]/.test(s[i])) k += s[i++]; return k; };
  const bare = (stop) => { let t = ''; while (i < s.length && s[i] !== '\n' && !(stop && stop.test(s[i]))) { if ((s[i] === '/' && s[i + 1] === '/') || s[i] === '#') break; t += s[i++]; } t = t.trim(); if (t === 'true') return true; if (t === 'false') return false; if (t === 'null') return null; if (/^-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?f?$/.test(t)) return parseFloat(t); return t; };
  const val = () => {
    ws(); const c = s[i];
    if (c === '{') { i++; const o = {}; for (;;) { ws(); if (s[i] === '}') { i++; return o; } if (i >= s.length) return o; const k = key(); ws(); if (s[i] === ':') i++; o[k] = val(); ws(); if (s[i] === ',') i++; } }
    if (c === '[') { i++; const a = []; for (;;) { ws(); if (s[i] === ']') { i++; return a; } if (i >= s.length) return a; a.push(val()); ws(); if (s[i] === ',') i++; } }
    if (c === "'" && s.startsWith("'''", i)) return ml();
    if (c === '"' || c === "'") return str(c);
    wsLine(); return bare(/[,}\]]/);
  };
  ws(); if (s[i] !== '{' && s[i] !== '[') { const o = {}; while (i < s.length) { const k = key(); if (!k) break; ws(); if (s[i] === ':') i++; o[k] = val(); ws(); if (s[i] === ',') i++; ws(); } return o; }
  return val();
}
