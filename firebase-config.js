// Firebase beállítások – a Firebase Console → Project settings → General → "Your apps" → Web app
// résznél található firebaseConfig értékeit másold ide. Ezek NEM titkosak, nyugodtan lehetnek a
// nyilvános repóban: a védelmet a firestore.rules szabályai adják.
export const firebaseConfig = {
  apiKey: "AIzaSyDJu5vMa0MY5AWBmp0YldifoZcBFNTr0Rg",
  authDomain: "hgws-7629e.firebaseapp.com",
  projectId: "hgws-7629e",
  storageBucket: "hgws-7629e.firebasestorage.app",
  messagingSenderId: "443659269338",
  appId: "1:443659269338:web:b5f812283f4999729821e3"
};

// true, ha a fenti értékek még nincsenek kitöltve
export const notConfigured = !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("IDE_");

// Helyi teszteléshez (Firebase Emulator): a böngésző konzoljában localStorage.hgws_emu = '1'
export const useEmulator = (() => { try { return localStorage.getItem('hgws_emu') === '1'; } catch (_) { return false; } })();
