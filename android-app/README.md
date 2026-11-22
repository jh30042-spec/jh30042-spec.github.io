# 서울→부산 무한질주 — 안드로이드 앱 (Capacitor + AdMob)

웹 게임(`../busan/index.html`)을 그대로 감싸서 Google Play 출시용 안드로이드 앱으로 만드는 프로젝트입니다.
**웹 게임이 단일 소스**이고, 이 폴더는 그 게임을 앱으로 포장하고 광고를 붙이는 껍데기입니다.

| 항목 | 값 |
|---|---|
| appId | `com.busanrush.game` |
| appName | 서울→부산 무한질주 |
| webDir | `www` (빌드할 때 `../busan/index.html` 을 복사해 만든다) |
| Capacitor | 6.2.3 (Java 17 호환) |
| AdMob 플러그인 | @capacitor-community/admob 6.2.0 |

## 광고 단위 바꾸는 곳 — `admob-config.json` 한 파일

```json
{
  "appId":         "ca-app-pub-…~…",
  "bannerId":      "ca-app-pub-…/…",
  "interstitialId":"ca-app-pub-…/…",
  "rewardedId":    "ca-app-pub-…/…",
  "testing": true
}
```

- 지금은 **Google 공식 테스트 ID**가 들어 있습니다. 실제 ID를 발급받으면 이 파일의 4개 값만 바꾸고 `testing` 을 `false` 로 바꾸면 됩니다.
- 이 파일은 빌드할 때 `www/admob-config.json` 으로 복사되어 앱이 읽고,
  `scripts/inject-admob-app-id.js` 가 같은 `appId` 를 `AndroidManifest.xml` 의
  `com.google.android.gms.ads.APPLICATION_ID` 메타데이터에 넣습니다.

## 게임 쪽 광고 동작 (`busan/index.html` 의 `window.BusanAds`)

- **웹 브라우저에서는 완전 무동작** — `window.Capacitor.isNativePlatform()` 이 참일 때만 광고가 뜹니다. 웹 게임은 기존과 100% 동일합니다.
- **배너**: 타이틀·게임오버 화면에서만 하단 표시. `beginRun()` 에서 즉시 숨김 → **플레이 중에는 절대 안 뜹니다**.
- **전면**: 3판 종료마다 1회(쿨타임 45초, 게임오버 1.6초 뒤 표시). 이어달리기를 누르면 예약이 취소됩니다.
- **보상형(1회 이어달리기)**: 게임오버 화면에 `📺 광고 보고 이어달리기` 버튼. 판당 1회, 광고를 끝까지 봐야 하며,
  보상 콜백 시 **거리·점수를 그대로 이어서** 실드 + 3.2초 무적으로 현재 위치에서 다시 달립니다.

## 로컬 빌드

```bash
# 0) 웹 게임 먼저 빌드 (워크스페이스 기준)
sh work/busan-endless/build.sh          # head.html + game.js + tail.html → games/seoul-to-busan.html
cp games/seoul-to-busan.html repos/elevator-fart-hold/busan/index.html

# 1) 앱
cd repos/elevator-fart-hold/android-app
npm install
npm run www                              # www/index.html 생성 (+ 브릿지 확인)
npx cap add android                      # 최초 1회 (android/ 폴더 생성, git에는 안 올라감)
node scripts/inject-admob-app-id.js      # AndroidManifest 에 AdMob App ID 주입
npx capacitor-assets generate --android  # assets/icon.png · splash.png → mipmap/스플래시
npx cap sync android
cd android && ./gradlew assembleDebug    # → app/build/outputs/apk/debug/app-debug.apk
```

필요 환경: **JDK 17**, Android SDK(platform 34 / build-tools 34.0.0), Node 20,
Capacitor 6.2.3(compileSdk 34 · minSdk 22 · targetSdk 34 · Gradle 8.2.1).

### 이미 확인된 것 (2026-11-22)

- `npm ci` → `npm run www` → `cap add android` → `inject-admob-app-id.js` → `capacitor-assets generate` 까지 실제로 실행해 성공 확인
  (앱 이름 `서울→부산 무한질주`, 패키지 `com.busanrush.game`, AdMob 플러그인 1개 인식, 아이콘·스플래시 87개 생성).
- 남은 단계는 `./gradlew assembleDebug` 뿐이며, 이 환경에는 JDK/Android SDK가 아직 없습니다.

### 이 환경(샌드박스)에서만 필요한 두 가지

1. **Capacitor CLI 가 `os.userInfo()` 에서 죽는 문제** — 이 컨테이너에는 uid 1000의 passwd 엔트리가 없어
   `npx cap …` 이 `uv_os_get_passwd ENOENT` 로 즉시 죽습니다. preload 한 줄로 우회합니다:
   ```bash
   node -r /workspace/work/os-shim.js node_modules/@capacitor/cli/bin/capacitor add android
   node -r /workspace/work/os-shim.js node_modules/@capacitor/assets/bin/capacitor-assets generate --android
   ```
   (GitHub Actions 러너나 일반 PC 에서는 필요 없습니다.)
2. **sharp 네이티브 바이너리** — 아이콘 생성기가 sharp 를 씁니다. 없으면
   `npm install sharp --platform=linux --arch=x64` 한 번 실행하세요.

## 자동 빌드(GitHub Actions) 상태

`../.github/workflows/build-android.yml` 초안은 저장소에 아직 **푸시하지 못했습니다.**
Pickle의 GitHub 연결 토큰에 `workflows` 권한이 없어 GitHub이 푸시를 거부하기 때문입니다.
초안은 워크스페이스 `work/busan-android-workflow.yml` 에 최종본으로 보관되어 있고,
권한이 생기면 저장소 루트의 `.github/workflows/build-android.yml` 로 그대로 올리면 됩니다.
