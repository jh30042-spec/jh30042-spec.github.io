#!/usr/bin/env node
/* android/app/src/main/AndroidManifest.xml 에 AdMob App ID 메타데이터를 주입한다.
   값은 admob-config.json(appId) 한 곳에서 온다. 여러 번 실행해도 안전(멱등).

   <application ...>
     <meta-data
       android:name="com.google.android.gms.ads.APPLICATION_ID"
       android:value="ca-app-pub-…~…" />
*/
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const CONFIG = path.join(ROOT, 'admob-config.json');
const META_NAME = 'com.google.android.gms.ads.APPLICATION_ID';

if (!fs.existsSync(MANIFEST)){
  console.error('AndroidManifest.xml 이 없습니다: ' + MANIFEST + '  →  먼저 `npx cap add android` 를 실행하세요.');
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
const appId = String(cfg.appId || '').trim();
if (!/^ca-app-pub-\d+~\d+$/.test(appId)){
  console.error('admob-config.json 의 appId 형식이 올바르지 않습니다: "' + appId + '" (예: ca-app-pub-3940256099942544~3347511713)');
  process.exit(1);
}

let xml = fs.readFileSync(MANIFEST, 'utf8');
const metaBlock =
  '        <meta-data\n' +
  '            android:name="' + META_NAME + '"\n' +
  '            android:value="' + appId + '" />\n';

if (xml.indexOf(META_NAME) >= 0){
  xml = xml.replace(
    /<meta-data\s+android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"\s+android:value="[^"]*"\s*\/>/,
    '<meta-data\n            android:name="' + META_NAME + '"\n            android:value="' + appId + '" />'
  );
  console.log('AdMob App ID 갱신: ' + appId);
} else {
  /* <application ...> 여는 태그 바로 뒤에 넣는다 */
  const m = xml.match(/<application\b[^>]*>\n/);
  if (!m){
    console.error('AndroidManifest.xml 에서 <application> 태그를 찾지 못했습니다.');
    process.exit(1);
  }
  xml = xml.slice(0, m.index + m[0].length) + metaBlock + xml.slice(m.index + m[0].length);
  console.log('AdMob App ID 주입: ' + appId);
}

fs.writeFileSync(MANIFEST, xml);
const check = fs.readFileSync(MANIFEST, 'utf8');
if (check.indexOf(META_NAME) < 0 || check.indexOf(appId) < 0){
  console.error('주입 실패: 매니페스트에 값이 없습니다.');
  process.exit(1);
}
console.log('  ✓ ' + path.relative(ROOT, MANIFEST));
