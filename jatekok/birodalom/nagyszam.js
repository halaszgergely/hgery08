/* HGWS – nagy számok (mantissza × 10^kitevő), felső határ nélkül.
   Egy érték: { m, e }, ahol 1 ≤ |m| < 10 (vagy m = 0), e egész. A kitevő maga is JS-szám, így kb. 10^(10^308)-ig megy.
   Elég pontos egy idle játékhoz (kb. 15 értékes jegy). Klasszikus szkript: a globális Nagy osztályt adja. */
'use strict';
const Nagy = (() => {
  const LOG = Math.log10;
  class D {
    constructor(m, e) { this.m = m; this.e = e; }
    static norm(m, e) {
      if (!m || !isFinite(m) || !isFinite(e)) return m && isFinite(e) ? D.from(m * 10 ** e) : (m !== m || e !== e ? ZERO : m > 0 || m === Infinity ? INF : m < 0 ? NINF : ZERO);
      const k = Math.floor(LOG(Math.abs(m))); if (k) { m /= 10 ** k; e += k; }
      if (Math.abs(m) >= 10) { m /= 10; e++; } else if (Math.abs(m) < 1) { m *= 10; e--; }
      return new D(m, e);
    }
    static from(x) {
      if (x instanceof D) return x;
      if (typeof x === 'number') { if (!x || x !== x) return ZERO; if (!isFinite(x)) return x > 0 ? INF : NINF; const e = Math.floor(LOG(Math.abs(x))); return D.norm(x / 10 ** e, e); }
      if (typeof x === 'string') { const s = x.trim(), i = s.search(/e/i); if (i < 0) return D.from(+s);
        const m = +s.slice(0, i), e = +s.slice(i + 1); if (!isFinite(m) || !isFinite(e)) return s.startsWith('-') ? NINF : s === 'Infinity' ? INF : ZERO; return D.norm(m, e); }
      if (x && typeof x === 'object' && 'm' in x && 'e' in x) return D.norm(+x.m, +x.e);
      return ZERO;
    }
    static pow10(e) { return new D(1, e); }
    get zero() { return !this.m; }
    get neg() { return this.m < 0; }
    get finite() { return isFinite(this.e); }
    toNumber() { return !this.m ? 0 : this.e > 308 ? (this.m > 0 ? Infinity : -Infinity) : this.e < -324 ? 0 : this.m * 10 ** this.e; }
    valueOf() { return this.toNumber(); }
    toJSON() { return !this.m ? 0 : Math.abs(this.e) < 300 ? this.toNumber() : this.m + 'e' + this.e; }
    toString() { return this.toJSON() + ''; }
    log10() { return this.m > 0 ? this.e + LOG(this.m) : -Infinity; }
    add(b) { b = D.from(b); if (!b.m) return this; if (!this.m) return b; const d = this.e - b.e; if (d > 17) return this; if (d < -17) return b;
      return d >= 0 ? D.norm(this.m + b.m / 10 ** d, this.e) : D.norm(this.m / 10 ** -d + b.m, b.e); }
    sub(b) { b = D.from(b); return this.add(new D(-b.m, b.e)); }
    mul(b) { b = D.from(b); if (!this.m || !b.m) return ZERO; return D.norm(this.m * b.m, this.e + b.e); }
    div(b) { b = D.from(b); if (!b.m) return this.m ? (this.m > 0 ? INF : NINF) : ZERO; if (!this.m) return ZERO; return D.norm(this.m / b.m, this.e - b.e); }
    pow(p) { if (!this.m) return p ? ZERO : ONE; if (this.m < 0) return D.from(this.toNumber() ** p); const l = this.log10() * p, e = Math.floor(l); return D.norm(10 ** (l - e), e); }
    cmp(b) { b = D.from(b); if (this.m === b.m && this.e === b.e) return 0; const sa = Math.sign(this.m), sb = Math.sign(b.m);
      if (sa !== sb) return sa > sb ? 1 : -1; if (this.e !== b.e) return (this.e > b.e ? 1 : -1) * sa; return this.m > b.m ? 1 : this.m < b.m ? -1 : 0; }
    gte(b) { return this.cmp(b) >= 0; } gt(b) { return this.cmp(b) > 0; } lte(b) { return this.cmp(b) <= 0; } lt(b) { return this.cmp(b) < 0; } eq(b) { return this.cmp(b) === 0; }
    max(b) { b = D.from(b); return this.gte(b) ? this : b; } min(b) { b = D.from(b); return this.lte(b) ? this : b; }
    floor() { return this.e >= 15 ? this : D.from(Math.floor(this.toNumber())); }
    round() { return this.e >= 15 ? this : D.from(Math.round(this.toNumber())); }
    sqrt() { return this.pow(.5); } cbrt() { return this.pow(1 / 3); }
  }
  const ZERO = new D(0, 0), ONE = new D(1, 0), INF = new D(1, Infinity), NINF = new D(-1, Infinity);
  // tudományos jelölés: 1 millió alatt egész szám, felette 1,23E45 (a kitevő is lehet óriási: 1,2E1,5E400 helyett 1,23EE400 nem kell – a kitevő számként íródik)
  const sci = x => { const d = D.from(x); if (!d.finite) return d.m < 0 ? '-∞' : '∞'; if (d.e < 6) return Math.floor(d.toNumber()).toLocaleString('hu-HU');
    let m = Math.round(d.m * 100) / 100, e = d.e; if (Math.abs(m) >= 10) { m /= 10; e++; } return m.toFixed(2).replace('.', ',') + 'E' + (e < 1e15 ? e : D.from(e).toNumber().toExponential(2)); };
  const N = x => D.from(x);
  return { D, N, sci, ZERO, ONE };
})();
if (typeof module !== 'undefined') module.exports = Nagy;
