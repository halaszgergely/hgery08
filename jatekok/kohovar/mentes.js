// Kohóvár mentéshelyek: tetszőleges számú mentés (hadjárat és egyéni játék, ugyanarról a pályáról is),
// a nagy adat IndexedDB-ben, a lista (meta) a játékállásban. Ha az IndexedDB nem érhető el, a localStorage-ba ír.
const DB = 'kohovar_mentesek', ST = 'slots';
let dbp = null;
const open = () => dbp || (dbp = new Promise((ok, no) => { try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); } catch (e) { no(e); } }));
const tx = async (mode, fn) => { const db = await open(); return new Promise((ok, no) => { const t = db.transaction(ST, mode), s = t.objectStore(ST), r = fn(s); t.oncomplete = () => ok(r && r.result); t.onerror = () => no(t.error); }); };
export async function putSlot(id, data) { try { await tx('readwrite', s => s.put(data, id)); return true; } catch (_) { try { localStorage.setItem('kohovar_slot_' + id, JSON.stringify(data)); return true; } catch (__) { return false; } } }
export async function getSlot(id) { try { const v = await tx('readonly', s => s.get(id)); if (v) return v; } catch (_) {} try { return JSON.parse(localStorage.getItem('kohovar_slot_' + id)); } catch (_) { return null; } }
export async function delSlot(id) { try { await tx('readwrite', s => s.delete(id)); } catch (_) {} try { localStorage.removeItem('kohovar_slot_' + id); } catch (_) {} }
