#!/usr/bin/env node
/* www/ 를 만든다.
   - ../busan/index.html  → www/index.html  (웹 게임과 100% 같은 파일: 단일 소스)
   - admob-config.json    → www/admob-config.json (앱이 런타임에 읽는 광고 설정)
   웹 게임(busan/index.html)은 work/busan-endless/build.sh 가 head.html+game.js+tail.html 로 만든 결과물이다.
*/
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WWW = path.join(ROOT, 'www');
const WEB = path.join(ROOT, '..', 'busan');

function must(p){ if (!fs.existsSync(p)) { console.error('없음: ' + p); process.exit(1); } return p; }
function copy(from, to){
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  const kb = (fs.statSync(to).size / 1024).toFixed(1);
  console.log('  ' + path.relative(ROOT, to) + '  ←  ' + path.relative(ROOT, from) + '  (' + kb + 'KB)');
}

console.log('www 준비');
fs.rmSync(WWW, { recursive: true, force: true });
fs.mkdirSync(WWW, { recursive: true });

copy(must(path.join(WEB, 'index.html')), path.join(WWW, 'index.html'));
/* og:image 는 absolute URL(jh30042-spec.github.io)을 쓰므로 앱 번들에 썸네일을 넣지 않는다 */
copy(must(path.join(ROOT, 'admob-config.json')), path.join(WWW, 'admob-config.json'));

/* 앱에 AdMob 브릿지가 실제로 들어갔는지 확인 — 없으면 광고가 조용히 안 뜨는 사고를 막는다 */
const html = fs.readFileSync(path.join(WWW, 'index.html'), 'utf8');
['window.BusanAds', 'createAdsController', 'admob-config.json', 'reviveBtn'].forEach(function(token){
  if (html.indexOf(token) < 0){
    console.error('빌드 중단: www/index.html 에 "' + token + '" 이(가) 없습니다. 웹 게임을 먼저 빌드하세요 (work/busan-endless/build.sh).');
    process.exit(1);
  }
});
console.log('  ✓ AdMob 브릿지 확인 (window.BusanAds / reviveBtn)');
