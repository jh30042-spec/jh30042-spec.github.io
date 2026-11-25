#!/usr/bin/env node
/* 릴리스 서명 설정을 android/app/build.gradle 에 넣는다 (멱등).
   - 업로드 키는 android/keystore.properties 에서 읽는다 (android/ 는 .gitignore 대상, 절대 공개 저장소에 올리지 않는다).
   - 키 파일이 없으면 서명 설정을 넣지 않고 그대로 둔다 → 디버그 빌드는 영향 없음.
   사용:
     node scripts/enable-release-signing.js [keystore.properties 경로]
     # 기본값: <repo>/android-app/android/keystore.properties
*/
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GRADLE = path.join(ROOT, 'android', 'app', 'build.gradle');
const PROPS = process.argv[2] || path.join(ROOT, 'android', 'keystore.properties');

if (!fs.existsSync(GRADLE)) {
  console.error('android/app/build.gradle 이 없습니다. 먼저 `npx cap add android` 를 실행하세요.');
  process.exit(1);
}
if (!fs.existsSync(PROPS)) {
  console.error('keystore.properties 가 없습니다: ' + PROPS);
  console.error('  예) work/keystore/keystore.properties 를 android/keystore.properties 로 복사');
  process.exit(1);
}

const SIGN_HEAD =
  "// --- 릴리스 업로드 키 (android/keystore.properties, git 제외) ---\n" +
  "def keystorePropsFile = rootProject.file('keystore.properties')\n" +
  "def uploadKey = new Properties()\n" +
  "def hasUploadKey = false\n" +
  "if (keystorePropsFile.exists()) {\n" +
  "    keystorePropsFile.withInputStream { uploadKey.load(it) }\n" +
  "    hasUploadKey = uploadKey['storeFile'] != null && file(uploadKey['storeFile']).exists()\n" +
  "}\n";

const SIGNING_BLOCK =
  "    signingConfigs {\n" +
  "        release {\n" +
  "            if (hasUploadKey) {\n" +
  "                storeFile file(uploadKey['storeFile'])\n" +
  "                storePassword uploadKey['storePassword']\n" +
  "                keyAlias uploadKey['keyAlias']\n" +
  "                keyPassword uploadKey['keyPassword']\n" +
  "            }\n" +
  "        }\n" +
  "    }\n";

let g = fs.readFileSync(GRADLE, 'utf8');

if (g.indexOf('hasUploadKey') < 0) {
  /* apply plugin 줄 뒤에 서명 설정 로더 삽입 */
  g = g.replace(/^(apply plugin: 'com\.android\.application'\n)/, '$1\n' + SIGN_HEAD);
  /* android { 바로 뒤에 signingConfigs 삽입 */
  g = g.replace(/android \{\n/, 'android {\n' + SIGNING_BLOCK);
  /* release buildType 에 signingConfig 연결 */
  g = g.replace(/(release \{\n\s*minifyEnabled false\n)/, '$1            if (hasUploadKey) { signingConfig signingConfigs.release }\n');
  fs.writeFileSync(GRADLE, g);
  console.log('릴리스 서명 설정 추가: ' + path.relative(ROOT, GRADLE));
} else {
  console.log('이미 릴리스 서명 설정이 있습니다: ' + path.relative(ROOT, GRADLE));
}

const out = fs.readFileSync(GRADLE, 'utf8');
['hasUploadKey', 'signingConfigs', 'signingConfig signingConfigs.release'].forEach(function(t){
  if (out.indexOf(t) < 0) { console.error('설정 확인 실패: ' + t); process.exit(1); }
});
console.log('  ✓ 확인 완료 (키 파일 존재 여부는 빌드 로그의 "Signing" 단계에서 확인)');
