# 전국일주 칼치기 — 안드로이드 앱 (Capacitor + AdMob)

웹 게임(`../busan/index.html`, 주소 `https://jh30042-spec.github.io/busan/`)을 그대로 감싸서 Google Play 출시용 안드로이드 앱으로 만드는 프로젝트입니다.
**웹 게임이 단일 소스**이고, 이 폴더는 그 게임을 앱으로 포장하고 광고를 붙이는 껍데기입니다.

| 항목 | 값 |
|---|---|
| appId (패키지) | `com.busanrush.game` (변경 금지 — 이미 배포·등록된 ID) |
| appName | **전국일주 칼치기** |
| versionCode / versionName | 1 / 1.0 |
| webDir | `www` (빌드할 때 `../busan/index.html` 을 복사해 만든다) |
| Capacitor | 6.2.3 (Java 17 호환) |
| AdMob 플러그인 | @capacitor-community/admob 6.2.0 |
| compileSdk / targetSdk / minSdk | **36 / 36** / 22 |
| AGP / Gradle / JDK | 8.13.2 / 8.13 / 17 |

## 광고 단위 바꾸는 곳 — `admob-config.json` 한 파일

```json
{
  "appId":         "ca-app-pub-9622717538101019~8272360691",
  "bannerId":      "ca-app-pub-9622717538101019/3574441473",
  "interstitialId":"ca-app-pub-9622717538101019/2173856200",
  "rewardedId":    "ca-app-pub-9622717538101019/5646197357",
  "testing": false
}
```

- **2026-11-25 실제 AdMob ID 발급·반영 완료.** `testing: false` 는 "실제 광고 단위로 실제 광고를 요청"한다는 뜻입니다.
  (`testing: true` 는 ID를 테스트 ID로 바꾸는 스위치가 아니라, 플러그인 호출마다 `isTesting: true` 를 붙여 **Google 테스트 광고**를 받는 플래그입니다.)
- 이 파일은 빌드할 때 `www/admob-config.json` 으로 복사되어 앱이 읽고,
  `scripts/inject-admob-app-id.js` 가 같은 `appId` 를 `AndroidManifest.xml` 의
  `com.google.android.gms.ads.APPLICATION_ID` 메타데이터에 넣습니다.
- **광고 ID는 비밀값이 아닙니다** (APK 안에 그대로 들어가고 누구나 꺼낼 수 있음). 반면 **키스토어와 비밀번호는 절대 커밋 금지**입니다.

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
npm run www                              # www/index.html 생성 (+ 브릿지 확인)
node scripts/inject-admob-app-id.js      # AndroidManifest 에 AdMob App ID 주입
node scripts/enable-release-signing.js   # (최초 1회) android/keystore.properties 로 릴리스 서명 설정
npx cap sync android                     # 이 컨테이너에서는 os-shim 필요 (아래 참고)
cd android && ./gradlew assembleDebug    # → app/build/outputs/apk/debug/app-debug.apk
./gradlew bundleRelease                  # → app/build/outputs/bundle/release/app-release.aab (서명됨)
./gradlew assembleRelease                # → app/build/outputs/apk/release/app-release.apk (서명됨, 폰 설치용)
```

### 이 워크스페이스의 빌드 환경 (2026-11-25 설치 완료)

| 항목 | 경로 |
|---|---|
| JDK | `/workspace/work/android-env/jdk-17.0.21.1+2` (Temurin OpenJDK 17.0.21.1) |
| Android SDK | `/workspace/work/android-env/android-sdk` (cmdline-tools, platform-tools, platforms;android-34·**36**, build-tools;34.0.0·**36.0.0**) |
| Gradle | wrapper **8.13**, AGP **8.13.2**, 캐시 `GRADLE_USER_HOME=/workspace/work/gradle-home` |
| Node | `/workspace/work/.node/node-v20.18.1-linux-x64/bin` |

빌드 명령 예:

```bash
export JAVA_HOME=/workspace/work/android-env/jdk-17.0.21.1+2
export PATH=$JAVA_HOME/bin:/workspace/work/android-env/android-sdk/platform-tools:/workspace/work/.node/node-v20.18.1-linux-x64/bin:$PATH
export ANDROID_HOME=/workspace/work/android-env/android-sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export GRADLE_USER_HOME=/workspace/work/gradle-home
export TMPDIR=/workspace/work/android-env/tmp      # /tmp 이 128MB tmpfs 라서 필요
cd repos/elevator-fart-hold/android-app/android && ./gradlew bundleRelease --no-daemon
```

### 업로드 키스토어 (절대 공개 저장소에 올리지 말 것)

| 항목 | 값 |
|---|---|
| 키 파일 | `/workspace/work/keystore/upload-keystore.jks` (JKS, RSA 2048, 유효 ~2054-04-12) |
| 별명(alias) | `upload` |
| 비밀번호 | `/workspace/work/keystore/keystore.properties` (chmod 600, git 제외) |
| SHA-256 | `24:64:00:BA:32:80:D6:A2:C6:22:D2:D0:E2:1C:56:51:47:06:C8:75:D6:08:BD:90:98:AC:BB:40:48:D5:9A:63` |
| SHA-1 | `86:AB:D2:51:60:FD:6E:A2:C3:77:2C:86:7F:9A:19:C6:67:B9:B6:65` |

- Gradle 서명 설정은 `android/keystore.properties`(git 제외된 `android/` 안)를 읽습니다. `scripts/enable-release-signing.js` 가 멱등하게 넣습니다.
- **이 키를 잃어버리면 같은 패키지로 다시 업로드할 수 없습니다.** Play Console 업로드 키 등록 후에는 Play App Signing 이 앱 서명 키를 따로 관리하지만, 업로드 키는 계속 필요합니다. 파일과 비밀번호를 안전한 곳에 백업하세요.

### 이 환경(샌드박스)에서만 필요한 것

1. **Capacitor CLI 가 `os.userInfo()` 에서 죽는 문제** — uid 1000의 passwd 엔트리가 없어 `npx cap …` 이 `uv_os_get_passwd ENOENT` 로 죽습니다. preload 로 우회:
   ```bash
   node -r /workspace/work/os-shim.js node_modules/@capacitor/cli/bin/capacitor sync android
   ```
2. **Gradle wrapper 가 배포판을 매번 지우고 다시 받는 문제** — `GRADLE_USER_HOME/wrapper/dists/.../gradle-8.13-bin.zip.ok` 마커가 없으면 재설치합니다. 한 번 `touch` 해 두면 됩니다.
3. 빌드가 5분(도구 제한)을 넘기면 같은 명령을 다시 실행하세요. 캐시 덕분에 이어서 끝납니다.

## 2026-11-25 빌드 검증 결과

- `npm run www` → `cap sync android` → `inject-admob-app-id.js` 성공
- `./gradlew assembleDebug` **BUILD SUCCESSFUL** → `app/build/outputs/apk/debug/app-debug.apk` (25.9MB)
- `./gradlew bundleRelease` **BUILD SUCCESSFUL**, `signReleaseBundle` 수행 → `app/build/outputs/bundle/release/app-release.aab` (18.4MB)
- `./gradlew assembleRelease` **BUILD SUCCESSFUL** → `app/build/outputs/apk/release/app-release.apk` (18.8MB)
- APK/AAB 확인: package `com.busanrush.game`, versionCode 1 / 1.0, label **전국일주 칼치기**, `targetSdkVersion 36`(bundletool 로 AAB 매니페스트 확인), 매니페스트 AdMob APPLICATION_ID `ca-app-pub-9622717538101019~8272360691`, 서명 인증서 SHA-256 `246400ba…8d59a63`

> **왜 SDK 36인가** · Google Play 는 2026-08-31부터 **새 앱과 업데이트 모두 targetSdk 36(Android 16) 이상**을 요구합니다. 처음 만든 targetSdk 34 빌드는 Play Console 업로드가 거부되므로 AGP 8.13.2·Gradle 8.13 으로 올리고 compileSdk/targetSdk 를 36 으로 바꿨습니다. Capacitor 6.2.3 라이브러리는 그대로 동작합니다.

> **이 컨테이너 메모리 주의** · RAM 이 1GB 뿐이라 기본 `-Xmx1536m` 으로는 릴리스 빌드 중 Gradle 데몬이 OOM 으로 죽습니다. `android/gradle.properties` 에 `org.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=384m`, `org.gradle.workers.max=1`, `kotlin.compiler.execution.strategy=in-process` 를 두고, `app/build.gradle` 의 `lint { checkReleaseBuilds false }` 로 릴리스 lint 를 꺼 두었습니다.

## 자동 빌드(GitHub Actions)

`../.github/workflows/build-android.yml` 초안은 `work/busan-android-workflow.yml` 에 있습니다. Pickle의 GitHub 연결 토큰에 `workflows` 권한이 없어 아직 푸시하지 못했습니다.
