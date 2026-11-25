/* Karlu app: entrada animada, login (Firebase), navegação e conta */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var N = window.KarluNative || {};
  var CFG = window.KARLU_CFG || {};
  var SKEY = 'karlu.session';
  var body = document.body;

  /* ---------- toast ---------- */
  var tt;
  function toast(t) {
    var el = $('#cfg-toast'); el.textContent = t; el.classList.add('on');
    clearTimeout(tt); tt = setTimeout(function () { el.classList.remove('on'); }, 2600);
  }
  document.addEventListener('karlu-toast', function (e) { toast(e.detail); });

  /* ---------- sessão guardada no aparelho (vale offline) ---------- */
  function getSession() { try { return JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { return null; } }
  function setSession(s) { try { if (s) localStorage.setItem(SKEY, JSON.stringify(s)); else localStorage.removeItem(SKEY); } catch (e) {} }
  function firstName(s) {
    if (s && s.name) return s.name.trim().split(/\s+/)[0];
    if (s && s.email) return s.email.split('@')[0];
    return 'Visitante';
  }

  /* ---------- animação de entrada (Karlu de verdade, em loop) ---------- */
  var hero = KarluDisp.make($('#hero-disp'), { face: 0, reacts: ['all'], gap: [900, 1800], sway: 14 });
  setInterval(function () {
    if ($('#gate').classList.contains('leave')) return;
    try { hero.setFace(Math.floor(Math.random() * KarluEyes.FACES.length)); } catch (e) {}
  }, 3600);

  var session = getSession();
  if (session) $('#gate-tag').textContent = 'Bem-vindo de volta, ' + firstName(session) + '!';
  setTimeout(function () { if (session) enter(session); else showLogin(); }, session ? 2300 : 2900);

  function showLogin() { $('#gate').dataset.state = 'login'; netNote(); }

  /* ---------- entrar no app ---------- */
  var entered = false;
  function enter(s) {
    if (entered) return; entered = true;
    setSession(s); session = s;
    var ini = firstName(s).charAt(0).toUpperCase() || 'K';
    $('#hello').textContent = 'Oi, ' + firstName(s) + ' 👋';
    paintAvatar($('#btn-acc'), s, ini, '#avatar-ini');
    paintAvatar($('#acc-av'), s, ini);
    $('#acc-name').textContent = s.guest ? 'Visitante' : (s.name || firstName(s));
    $('#acc-mail').textContent = s.guest ? 'Modo teste (sem conta)' : (s.email || '');
    $('#more-acc').textContent = s.guest ? 'Modo teste' : (s.email || s.name || '—');
    go('home');
    var app = $('#app');
    app.classList.remove('off'); app.classList.add('in');
    $('#gate').classList.add('leave');
    setTimeout(function () { $('#gate').style.display = 'none'; }, 800);
  }
  function paintAvatar(el, s, ini, inner) {
    var target = inner ? $(inner) : el;
    if (s.photo) { el.innerHTML = '<img alt="" src="' + String(s.photo).replace(/"/g, '') + '">'; }
    else target.textContent = ini;
  }

  /* ---------- login ---------- */
  var mode = 'in';
  function setMode(m) {
    mode = m;
    $('#seg').dataset.mode = m;
    $$('#seg button').forEach(function (b) { b.classList.toggle('on', b.dataset.mode === m); });
    $('#f-name').hidden = m !== 'up';
    $('#auth-go span').textContent = m === 'up' ? 'Criar conta' : 'Entrar';
    $('#auth-forgot').hidden = m === 'up';
    $('#a-pass').autocomplete = m === 'up' ? 'new-password' : 'current-password';
    msg('');
  }
  $$('#seg button').forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.mode); }); });

  var eyeOn = false;
  $('#a-eye').addEventListener('click', function () {
    eyeOn = !eyeOn; $('#a-pass').type = eyeOn ? 'text' : 'password';
    $('#a-eye use').setAttribute('href', eyeOn ? '#i-eyeoff' : '#i-eye');
  });

  function msg(t, ok) { var m = $('#auth-msg'); m.textContent = t || ''; m.classList.toggle('ok', !!ok); }
  function busy(b) { $('#auth-go').classList.toggle('busy', b); $('#auth-go').disabled = b; $('#auth-google').disabled = b; }
  function netNote() { $('#auth-off').hidden = navigator.onLine; }
  window.addEventListener('online', function () { netNote(); updateNet(); });
  window.addEventListener('offline', function () { netNote(); updateNet(); });

  if (!CFG.firebase || !N.auth) $('#auth-guest').hidden = false;

  function errMsg(e) {
    var t = String((e && e.code) || '') + ' ' + String((e && e.message) || e || '');
    if (/cancel|12501|dismiss|SIGN_IN_CANCELED|no credential/i.test(t)) return '';
    if (/network|offline|timeout|unreachable|unable to resolve/i.test(t)) return 'Sem conexão com a internet. Tente de novo.';
    if (/invalid-email|badly formatted/i.test(t)) return 'E-mail inválido.';
    if (/user-not-found|wrong-password|invalid-credential|INVALID_LOGIN|credential is incorrect|no user record|password is invalid/i.test(t)) return 'E-mail ou senha incorretos.';
    if (/email-already-in-use|already in use/i.test(t)) return 'Esse e-mail já tem conta. Toque em “Entrar”.';
    if (/weak-password/i.test(t)) return 'Senha fraca. Use pelo menos 6 caracteres.';
    if (/too-many-requests|blocked/i.test(t)) return 'Muitas tentativas. Espere um pouco e tente de novo.';
    if (/user-disabled/i.test(t)) return 'Esta conta foi desativada.';
    if (/DEVELOPER_ERROR|10:|12500|sha-?1/i.test(t)) return 'Login do Google não configurado (confira o SHA-1 no Firebase).';
    if (/not initialized|FirebaseApp|google-services|api key/i.test(t)) return 'Firebase não configurado neste APK.';
    return 'Não deu certo. Tente de novo. (' + t.trim().slice(0, 60) + ')';
  }
  function ready() {
    if (!CFG.firebase || !N.auth) { msg('O login ainda não foi configurado neste APK. Use o modo teste.'); return false; }
    if (!navigator.onLine) { msg('Sem internet. No primeiro acesso você precisa estar online.'); return false; }
    return true;
  }
  function done(u) {
    if (!u) { msg('Não consegui entrar. Tente de novo.'); return; }
    enter({ uid: u.uid, email: u.email, name: u.name, photo: u.photo, guest: false, ts: Date.now() });
  }

  $('#auth-card').addEventListener('submit', async function (e) {
    e.preventDefault(); msg('');
    var email = $('#a-email').value.trim(), pass = $('#a-pass').value, name = $('#a-name').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg('Digite um e-mail válido.');
    if (!pass) return msg('Digite a senha.');
    if (mode === 'up' && pass.length < 6) return msg('A senha precisa ter pelo menos 6 caracteres.');
    if (!ready()) return;
    busy(true);
    try { done(mode === 'up' ? await N.auth.signUp(name, email, pass) : await N.auth.signIn(email, pass)); }
    catch (err) { msg(errMsg(err)); }
    busy(false);
  });

  $('#auth-google').addEventListener('click', async function () {
    msg(''); if (!ready()) return; busy(true);
    try { done(await N.auth.google()); } catch (err) { msg(errMsg(err)); }
    busy(false);
  });

  $('#auth-forgot').addEventListener('click', async function () {
    var email = $('#a-email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg('Digite seu e-mail acima e toque de novo.');
    if (!ready()) return;
    try { await N.auth.reset(email); msg('Enviamos um link para redefinir a senha no seu e-mail.', true); }
    catch (err) { msg(errMsg(err)); }
  });

  $('#auth-guest').addEventListener('click', function () { enter({ guest: true, name: 'Visitante', ts: Date.now() }); });

  /* ---------- navegação ---------- */
  var MAP = { home: 'page-home', faces: 'pane-faces', color: 'pane-color', react: 'pane-react', more: 'page-more',
    gaze: 'pane-gaze', fine: 'pane-fine', auto: 'pane-auto', fav: 'pane-fav', presets: 'pane-presets', account: 'page-account', about: 'page-about' };
  var TABS = ['home', 'faces', 'color', 'react', 'more'];
  var SUB = { gaze: 1, fine: 1, auto: 1, fav: 1, presets: 1, account: 1, about: 1 };
  var cur = 'home';

  function go(name) {
    if (!MAP[name]) return;
    cur = name;
    $$('.page').forEach(function (p) { p.classList.toggle('on', p.id === MAP[name]); });
    var tab = SUB[name] ? 'more' : name;
    $('#tabbar').style.setProperty('--i', TABS.indexOf(tab));
    $$('#tabbar .tab').forEach(function (b) { b.classList.toggle('on', b.dataset.go === tab); });
    body.dataset.screen = name === 'home' ? 'home' : 'other';
    var pg = $('#' + MAP[name]); if (pg) pg.scrollTop = 0;
    if (name === 'account') updateNet();
  }
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-go]'); if (g) go(g.dataset.go);
  });
  $('#stage').addEventListener('click', function (e) {
    if (e.target.closest('#btn-acc')) { go('account'); return; }
    if (body.dataset.screen !== 'home') go('home');
  });
  document.addEventListener('karlu-back', function (e) {
    if (!entered) return;
    if (SUB[cur]) { go('more'); e.preventDefault(); }
    else if (cur !== 'home') { go('home'); e.preventDefault(); }
  });

  /* ---------- conta ---------- */
  function updateNet() {
    var on = navigator.onLine, c = $('#acc-net');
    c.classList.toggle('off', !on);
    c.querySelector('b').textContent = on ? 'Online' : 'Offline · o app continua funcionando';
    c.querySelector('use').setAttribute('href', on ? '#i-wifi' : '#i-wifioff');
  }
  var sureT;
  $('#btn-logout').addEventListener('click', async function () {
    var b = this, sp = $('span', b);
    if (!b.classList.contains('sure')) {
      b.classList.add('sure'); sp.textContent = 'Toque de novo para sair';
      clearTimeout(sureT); sureT = setTimeout(function () { b.classList.remove('sure'); sp.textContent = 'Sair da conta'; }, 3200);
      return;
    }
    try { if (session && !session.guest && N.auth) await N.auth.signOut(); } catch (e) {}
    setSession(null); location.reload();
  });

  setMode('in');
})();
