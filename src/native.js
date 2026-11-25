/*
 * Ponte nativa do app Karlu (vira www/js/native.js).
 *  - Bluetooth: importa bt-native.js (cria navigator.bluetooth no Android)
 *  - Login: Firebase Authentication nativo (e-mail/senha e Google)
 *  - Compartilhar foto/clipe, botão voltar e barra de status
 */
import './bt-native.js';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

const isNative = Capacitor.isNativePlatform();

/* ---------- login ---------- */
function nu(u) {
  if (!u) return null;
  return { uid: u.uid, email: u.email || '', name: u.displayName || '', photo: u.photoUrl || '', verified: !!u.emailVerified };
}

const auth = {
  async signIn(email, password) {
    const r = await FirebaseAuthentication.signInWithEmailAndPassword({ email, password });
    return nu(r.user);
  },
  async signUp(name, email, password) {
    const r = await FirebaseAuthentication.createUserWithEmailAndPassword({ email, password });
    const u = nu(r.user) || { uid: '', email, name: '', photo: '' };
    if (name) {
      try { await FirebaseAuthentication.updateProfile({ displayName: name }); u.name = name; } catch (e) {}
    }
    return u;
  },
  async google() {
    const r = await FirebaseAuthentication.signInWithGoogle();
    let u = nu(r.user);
    if (!u) {
      const c = await FirebaseAuthentication.getCurrentUser();
      u = nu(c.user);
    }
    return u;
  },
  async reset(email) { await FirebaseAuthentication.sendPasswordResetEmail({ email }); },
  async signOut() { await FirebaseAuthentication.signOut(); },
  async current() { const r = await FirebaseAuthentication.getCurrentUser(); return nu(r.user); }
};

/* ---------- compartilhar foto / clipe do display ---------- */
function toast(t) { document.dispatchEvent(new CustomEvent('karlu-toast', { detail: t })); }
function blobToB64(b) {
  return new Promise(function (res, rej) {
    const r = new FileReader();
    r.onload = function () { res(String(r.result).split(',')[1]); };
    r.onerror = rej;
    r.readAsDataURL(b);
  });
}
async function out(blob, name, done) {
  try {
    const data = await blobToB64(blob);
    const f = await Filesystem.writeFile({ path: name, data: data, directory: Directory.Cache });
    await Share.share({ title: 'Karlu', text: 'Meu Karlu | Starlyn Infinite', files: [f.uri], dialogTitle: 'Compartilhar' });
    done && done('shared');
  } catch (e) {
    const m = String((e && e.message) || e || '');
    if (!/cancel/i.test(m)) toast('Não consegui compartilhar.');
    done && done('cancel');
  }
}
function photo(cv, done) {
  const S = 1080, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(S / 2, S * 0.42, 40, S / 2, S / 2, S * 0.8);
  g.addColorStop(0, '#2a1030'); g.addColorStop(1, '#0b0b0f'); x.fillStyle = g; x.fillRect(0, 0, S, S);
  const R = 400, cx = S / 2, cy = S / 2 - 30;
  x.fillStyle = '#cfd2d9'; x.beginPath(); x.arc(cx, cy, R + 14, 0, 6.2832); x.fill();
  x.save(); x.beginPath(); x.arc(cx, cy, R, 0, 6.2832); x.clip(); x.drawImage(cv, cx - R, cy - R, R * 2, R * 2); x.restore();
  x.fillStyle = '#fff'; x.font = '800 44px sans-serif'; x.textAlign = 'center'; x.fillText('Karlu', S / 2, S - 92);
  x.fillStyle = '#ff42c4'; x.font = '600 26px sans-serif'; x.fillText('Starlyn Infinite', S / 2, S - 52);
  c.toBlob(function (b) { out(b, 'karlu-' + Date.now() + '.png', done); }, 'image/png');
}
function clip(cv, ms, onStart, done) {
  if (!cv.captureStream || !window.MediaRecorder) { done && done('unsupported'); return; }
  const types = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  let mt = '';
  for (let i = 0; i < types.length; i++) if (MediaRecorder.isTypeSupported(types[i])) { mt = types[i]; break; }
  let rec; const chunks = [];
  try { rec = new MediaRecorder(cv.captureStream(30), mt ? { mimeType: mt, videoBitsPerSecond: 4000000 } : undefined); }
  catch (e) { done && done('unsupported'); return; }
  rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
  rec.onstop = function () {
    const t = rec.mimeType || mt || 'video/webm';
    const b = new Blob(chunks, { type: t.split(';')[0] });
    out(b, 'karlu-' + Date.now() + '.' + (/mp4/.test(t) ? 'mp4' : 'webm'), done);
  };
  rec.start(); onStart && onStart();
  setTimeout(function () { if (rec.state !== 'inactive') rec.stop(); }, ms);
}
window.KarluShare = { photo: photo, clip: clip };

/* ---------- botão voltar + barra de status ---------- */
if (isNative) {
  App.addListener('backButton', function () {
    const ev = new CustomEvent('karlu-back', { cancelable: true });
    document.dispatchEvent(ev);
    if (!ev.defaultPrevented) App.minimizeApp();
  });
  StatusBar.setStyle({ style: Style.Dark }).catch(function () {});
  StatusBar.setBackgroundColor({ color: '#07050D' }).catch(function () {});
}

window.KarluNative = { isNative: isNative, auth: auth };
