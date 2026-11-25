// Monta a pasta www/ (o que vai dentro do APK): telas do app + motor do display + ponte nativa.
import { cpSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from 'esbuild';

const OUT = 'www';
const APP_ID = JSON.parse(readFileSync('capacitor.config.json', 'utf8')).appId;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'js'), { recursive: true });
cpSync('app', OUT, { recursive: true });

// motor do display / protocolo Bluetooth (vêm do site, sem alterações)
for (const f of ['eyes.js', 'reacoes.js', 'reacoes2.js', 'configurar.js']) {
  cpSync(join('site/js', f), join(OUT, 'js', f));
}

// Firebase configurado? (arquivo firebase/google-services.json)
let firebase = false;
const gs = 'firebase/google-services.json';
if (existsSync(gs)) {
  try {
    const j = JSON.parse(readFileSync(gs, 'utf8'));
    const pk = (j.client || []).map((c) => c?.client_info?.android_client_info?.package_name);
    firebase = true;
    if (!pk.includes(APP_ID)) {
      console.log(`::warning::O google-services.json não tem o pacote ${APP_ID} (tem: ${pk.join(', ')}).`);
    }
  } catch (e) {
    console.log('::warning::google-services.json inválido: ' + e.message);
  }
}
writeFileSync(join(OUT, 'js/config.js'), `window.KARLU_CFG=${JSON.stringify({ firebase })};\n`);
console.log('Firebase configurado:', firebase);

// ponte nativa (Bluetooth + login + compartilhar), tudo num arquivo só
await build({
  entryPoints: ['src/native.js'],
  bundle: true, minify: true, format: 'iife', target: 'chrome90',
  external: ['firebase', 'firebase/*'], // só usados na versão web do plugin
  outfile: join(OUT, 'js/native.js'),
  logLevel: 'warning',
});
console.log('www/ pronto');
