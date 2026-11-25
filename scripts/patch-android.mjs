// Ajusta o projeto Android gerado: permissões, tema escuro, ícones e Firebase.
import { readFileSync, writeFileSync, cpSync, existsSync } from 'node:fs';

const rd = (p) => readFileSync(p, 'utf8');

/* ---- AndroidManifest: Bluetooth + microfone ---- */
const MANIFEST = 'android/app/src/main/AndroidManifest.xml';
if (!existsSync(MANIFEST)) { console.error('Rode "npx cap add android" antes.'); process.exit(1); }
let m = rd(MANIFEST);
if (!m.includes('xmlns:tools')) m = m.replace('<manifest ', '<manifest xmlns:tools="http://schemas.android.com/tools" ');
if (!m.includes('BLUETOOTH_SCAN')) {
  const perms = `
    <!-- Bluetooth (Android 5 a 15) -->
    <uses-feature android:name="android.hardware.bluetooth_le" android:required="false" />
    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" tools:targetApi="s" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <!-- Microfone (reação do Karlu ao som, na pré-visualização) -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
`;
  m = m.replace('</manifest>', perms + '</manifest>');
}
writeFileSync(MANIFEST, m);

/* ---- ícones + cor de fundo ---- */
if (existsSync('android-res')) cpSync('android-res', 'android/app/src/main/res', { recursive: true });

/* ---- tema escuro (sem piscar branco) ---- */
const STY = 'android/app/src/main/res/values/styles.xml';
if (existsSync(STY)) {
  let s = rd(STY);
  if (!s.includes('karlu_bg')) {
    s = s.replace(
      /<style name="AppTheme\.NoActionBarLaunch" parent="Theme\.SplashScreen">[\s\S]*?<\/style>/,
      `<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">@color/karlu_bg</item>
        <item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher_foreground</item>
        <item name="android:background">@color/karlu_bg</item>
    </style>`
    );
    s = s.replace(
      /(<style name="AppTheme\.NoActionBar"[^>]*>)([\s\S]*?)(<\/style>)/,
      (all, a, b, c) =>
        a + b.replace(/<item name="android:background">@null<\/item>/, '') +
        `
        <item name="android:background">@color/karlu_bg</item>
        <item name="android:windowBackground">@color/karlu_bg</item>
        <item name="android:statusBarColor">@color/karlu_bg</item>
        <item name="android:navigationBarColor">@color/karlu_bg</item>
    ` + c
    );
    writeFileSync(STY, s);
  }
}

/* ---- Firebase / Google Services no Gradle ---- */
const GMS_VERSION = '4.6.0';
const BOM_VERSION = '35.2.0';

// 1) android/build.gradle: plugin do Google Services (equivale a: id("com.google.gms.google-services") version "4.6.0" apply false)
const ROOT = 'android/build.gradle';
if (existsSync(ROOT)) {
  let r = rd(ROOT);
  if (r.includes('com.google.gms:google-services')) {
    r = r.replace(/com\.google\.gms:google-services:[\w.\-]+/, `com.google.gms:google-services:${GMS_VERSION}`);
  } else {
    r = r.replace(/dependencies\s*\{/, (x) => x + `\n        classpath 'com.google.gms:google-services:${GMS_VERSION}'`);
  }
  writeFileSync(ROOT, r);
}

// 2) android/app/build.gradle: Firebase BoM + aplicar o plugin
const APPG = 'android/app/build.gradle';
if (existsSync(APPG)) {
  let g = rd(APPG);

  // BoM (implementation(platform("com.google.firebase:firebase-bom:35.2.0")))
  if (g.includes('com.google.firebase:firebase-bom')) {
    g = g.replace(/com\.google\.firebase:firebase-bom:[\w.\-]+/, `com.google.firebase:firebase-bom:${BOM_VERSION}`);
  } else {
    g = g.replace(/dependencies\s*\{/, (x) => x + `\n    implementation platform('com.google.firebase:firebase-bom:${BOM_VERSION}')`);
  }

  // Plugin do Google Services (id("com.google.gms.google-services"))
  if (!g.includes('com.google.gms.google-services')) {
    g += `
apply plugin: 'com.google.gms.google-services'
`;
  }
  writeFileSync(APPG, g);
}
console.log('Android ajustado');
