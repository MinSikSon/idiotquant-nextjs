"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Filter, ArrowRight, TrendingUp } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { selectNcavDailyList, reqGetNcavDailyList } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { STRATEGY_PRESETS_CLIENT } from "@/lib/constants/strategies";
import { TodayDiscovery } from "./components/todayDiscovery";

// =========================================================================
// 홈 3D 일러스트 (three.js / WebGL)
// 클라이언트에서만 마운트, prefers-reduced-motion 시 정적 렌더.
// =========================================================================

// 금화 전용 스튜디오 환경맵 — 유광 금속의 관건은 "밝은 면과 어두운 면의 경계가 또렷한" 환경이다.
// 완만한 그라데이션만 두면 구릿빛으로 밋밋해지고, 아래쪽을 검정으로 두면 금화가 바닥을 비출 때
// 타버린 듯 검게 보인다 → 위는 밝은 소프트박스, 아래는 "어둡되 따뜻한 황동색"으로 두고 수평선에서
// 급격히 전환시켜 표면에 선명한 반사선을 남긴다.
function makeGoldStudioEnv(renderer: THREE.WebGLRenderer): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 512;
  const x = c.getContext("2d")!;
  // 위쪽(하늘)은 순백 대신 난색 흰색으로 둔다 — 바닥에 눕힌 금화는 위쪽을 통째로 비추는데,
  // 순백이면 반사가 하얗게 날아가 금색을 잃고 크림빛으로 창백해진다.
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.000, "#fff6e2");
  g.addColorStop(0.340, "#ffeec8");
  g.addColorStop(0.470, "#ffdf9e");
  g.addColorStop(0.500, "#fff2cf"); // 수평선 바로 위 밝은 띠
  g.addColorStop(0.505, "#7c5a22"); // 급격한 명암 경계
  g.addColorStop(1.000, "#4d3714");
  x.fillStyle = g;
  x.fillRect(0, 0, 1024, 512);
  // 각진 소프트박스 — 원형 블러보다 경계가 뚜렷해 금속에 "면"으로 된 하이라이트를 남긴다
  x.fillStyle = "#fff8e6";
  for (const [px, py, w, h] of [[120, 60, 300, 110], [560, 30, 230, 80], [860, 150, 170, 70]]) {
    x.fillRect(px, py, w, h);
  }
  // 하단 반사광 — 동전 아랫면이 완전히 죽지 않도록 은은한 금빛을 깔아둔다
  const wg = x.createLinearGradient(0, 512, 0, 300);
  wg.addColorStop(0, "rgba(255,196,90,.5)");
  wg.addColorStop(1, "rgba(255,196,90,0)");
  x.fillStyle = wg;
  x.fillRect(0, 300, 1024, 212);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose();
  tex.dispose();
  return env;
}

// 금화 한 닢을 단일 지오메트리로 병합 — 바깥 원판(어두운 금)과 도드라진 안쪽 필드(밝은 금)의
// 두 겹. 두 색의 단차가 곧 낱알의 입체감이 되므로 각인 링은 두지 않는다(작게 그려질 땐 링이
// 톱니·와셔처럼 읽힌다). 얇게 만들어 굴러떨어질 때 원판이 또렷한 타원으로 접힌다.
// 반지름 1 기준으로 만들어 두고 인스턴스별 scale로 크기를 다르게 쓴다. 파트별 색은 정점
// 색(vertexColors)으로 구분해 재질 하나·드로우콜 한 번으로 수십 개를 그린다.
const COIN_BODY = new THREE.Color(0xffdd80);
const COIN_RIM = new THREE.Color(0xc9911d);
function paint(geo: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = color.r; arr[i * 3 + 1] = color.g; arr[i * 3 + 2] = color.b; }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return geo;
}
const COIN_TH = 0.14; // 얇게 — 굴러떨어지는 낱알이 두꺼우면 금화가 아니라 원통으로 보인다
function makeCoinGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    paint(new THREE.CylinderGeometry(1, 1, COIN_TH, 64), COIN_RIM),
    paint(new THREE.CylinderGeometry(0.82, 0.82, COIN_TH * 1.28, 64), COIN_BODY),
  ];
  const merged = mergeGeometries(parts, false)!;
  parts.forEach(p => p.dispose());
  return merged;
}

// 부드러운 원형 그림자/글로우 텍스처
function makeRadialTexture(inner: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, inner);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function HeroArt() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 2.6, 11);
    camera.lookAt(0, 0.3, -1);

    // 세로로 긴 화면(모바일)인지 — 배치값과 렌더 해상도를 모두 이 기준으로 나눈다
    const narrowVp = mount.clientWidth / Math.max(1, mount.clientHeight) < 0.9;

    // 모바일은 픽셀은 촘촘한데 GPU는 fill-rate에 묶여 있다. DPR 2 풀스크린에 MSAA까지 걸면
    // 프레임이 들쭉날쭉해진다 → 좁은 화면에선 렌더 해상도를 1.5로 낮추고 MSAA를 끈다.
    // 도트가 촘촘해 육안 차이는 거의 없다.
    const renderer = new THREE.WebGLRenderer({ antialias: !narrowVp, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, narrowVp ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // 배경이 딥그린블랙이라 예전 노출(1.0)로는 씬 전체가 배경에서 떠 보인다.
    // 노출을 더 내려 어둠에 잠기게 하되, 금화 하이라이트는 환경맵이 워낙 밝아 그대로 살아남는다.
    renderer.toneMappingExposure = 0.78;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    mount.appendChild(canvas);

    const disposables: { dispose: () => void }[] = [];

    // 금화가 유광으로 보이려면 명암 경계가 또렷한 환경이 필요하다(makeGoldStudioEnv 주석 참고).
    const envTex = makeGoldStudioEnv(renderer);
    scene.environment = envTex;
    disposables.push(envTex);

    // 어두운 무대용 조명 — 아래쪽(ground) 색을 배경과 같은 딥그린블랙으로 두어야
    // 캔들 밑동이 배경에 자연스럽게 잠긴다. 흰 ground를 쓰면 아래에서 조명을 쏜 것처럼 뜬다.
    scene.add(new THREE.HemisphereLight(0x9fc4ae, 0x0a1b12, 0.3));
    const key = new THREE.DirectionalLight(0xfff2d0, 2.3);
    key.position.set(5, 9, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x3f9e6b, 0.85);
    rim.position.set(-7, 3, -4);
    scene.add(rim);
    const glint = new THREE.PointLight(0xffffff, 22, 40); // 금화 표면 글린트
    glint.position.set(-3, 7, 6);
    scene.add(glint);

    const root = new THREE.Group();
    scene.add(root);
    const BASE = -2;

    // 캔들 재질 — 어두운 무대에서는 캔들이 밝으면 금화보다 먼저 눈에 띈다. 색을 낮추고
    // 환경맵 반사도 줄여 금화만 빛나게 둔다(주연은 금화, 캔들은 무대 배경).
    const upMat = new THREE.MeshStandardMaterial({ color: 0x0f7a45, roughness: 0.62, metalness: 0.03, envMapIntensity: 0.4 });
    const dnMat = new THREE.MeshStandardMaterial({ color: 0x9e3b46, roughness: 0.62, metalness: 0.03, envMapIntensity: 0.4 });
    const goldMat = new THREE.MeshPhysicalMaterial({
      vertexColors: true, metalness: 1.0, roughness: 0.05,
      // 반사 강도를 너무 올리면 하이라이트가 하얗게 날아가 금색이 빠진다
      envMapIntensity: 1.9, clearcoat: 0.5, clearcoatRoughness: 0.04,
    });
    disposables.push(upMat, dnMat, goldMat);

    // 아래 배치는 전부 narrowVp(위에서 선언) 기준으로 좁은 화면용 값을 따로 쓴다 — 세로로 긴
    // 화면은 보이는 가로 범위가 데스크톱의 절반 이하라, 같은 값을 쓰면 양쪽 다 화면 밖으로
    // 밀려나 잘린 채 보인다.

    // 캔들 스카이라인 — 배치를 두 가지로 손봤다.
    // ① 높이를 노이즈로 흔들지 않고 손으로 짠 시퀀스를 쓴다. "눌림 → 재상승"을 반복하며 우상향하는
    //    흐름이 읽혀야 무작위 톱니보다 차트답고 신뢰감이 있다.
    // ② 한 줄로 나란히 세우면 막대그래프처럼 납작해 보인다 → 왼쪽(과거)을 뒤로 밀고 오른쪽(현재)을
    //    카메라 쪽으로 당겨 대각선으로 배치한다. 카메라 드리프트에 따라 깊이가 드러나고, 추세의
    //    끝(최고가)이 가장 앞에 서서 시선이 자연스럽게 오른쪽 위로 끌린다.
    // ③ 바닥에 접지 그림자를 깔아 캔들이 공중에 떠 보이지 않게 한다.
    const CANDLE_SERIES = [0.7, 0.95, 0.85, 1.2, 1.45, 1.28, 1.65, 1.95, 1.75, 2.15, 2.45, 2.28, 2.7, 2.95, 3.2];
    // 좁은 화면에 15개를 다 밀어 넣으면 몸통이 성냥개비처럼 얇아지고 양끝이 잘린다 → 최근 구간만
    // 잘라 보여준다(상승 흐름은 그대로 읽히고 캔들 두께도 지킬 수 있다).
    // 개수를 더 줄인 이유는 아래 CANDLE_GAP 주석 참고 — 같은 폭에 띄엄띄엄 세우기 위해서다.
    const CANDLE_H = narrowVp ? CANDLE_SERIES.slice(6) : CANDLE_SERIES;
    const N = CANDLE_H.length;
    // 가장 앞(오른쪽 끝) 캔들의 깊이 — 바닥 금화 더미보다는 뒤에 둔다.
    // 좁은 화면에선 한 겹 더 뒤로 민다. 프레임이 좁아 캔들이 금화·헤드라인과 같은 평면에 선 것처럼
    // 보이는데, 깊이를 벌리면 원근으로 작아지며 배경으로 물러난다. 다만 더 밀 수는 없다 —
    // 글씨 뒤로 떨어지는 금화가 z −3.6~−2.6 을 쓰므로, 캔들 뒤끝(CANDLE_Z − CANDLE_ARC)이
    // 그 구간에 닿으면 금화가 캔들 몸통을 파고들어 박힌 것처럼 보인다.
    const CANDLE_Z = narrowVp ? -1.5 : -0.6;
    // 좁은 화면에서는 캔들을 띄엄띄엄 세운다. 개수를 11 → 9로 줄이고 간격을 그만큼 넓혀
    // 전체 폭(약 6.3)은 그대로 두면서 몸통 사이 빈 자리만 벌린다. 예전엔 몸통끼리 거의 붙어
    // 초록·빨강 벽처럼 보였고, 배경으로 물러나야 할 차트가 헤드라인과 경쟁했다.
    const CANDLE_GAP = narrowVp ? 0.70 : 1.05;
    // 몸통 폭은 간격에 비례 — 좁은 화면은 비율을 낮춰 빈 자리를 넓힌다. 몸통이 얇을수록
    // 아래 jitterX 의 허용 범위(간격 − 몸통 폭)가 넓어져 더 제멋대로 흩어 세울 수 있다.
    const CANDLE_BODY_RATIO = narrowVp ? 0.44 : 0.66;
    // 좁은 화면에선 키를 확 낮춰 아기자기한 크기로 둔다. 배경 장식이라 키가 크면 헤드라인
    // 옆에서 존재감을 다투는데, 낮추면 바닥에 오밀조밀 늘어선 소품처럼 읽힌다.
    const CANDLE_HS = narrowVp ? 0.42 : 1;
    const CANDLE_ARC = narrowVp ? 1.0 : 1.7;   // 왼쪽 끝이 뒤로 물러나는 거리
    // 어두운 무대에서는 짙은 그림자가 배경과 구분되지 않는다 → 아주 옅게만 깔아 캔들 밑동만 눌러준다
    const shadowTex = makeRadialTexture("rgba(0,0,0,.45)");
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
    const shadowGeo = new THREE.PlaneGeometry(1, 1);
    disposables.push(shadowTex, shadowMat, shadowGeo);
    // 캔들만 따로 묶어 스크롤에 따라 이 그룹만 회전시킨다(금화는 낙하 궤적이 흐트러지면 안 되므로 제외).
    const candleGroup = new THREE.Group();
    root.add(candleGroup);

    // 캔들을 스크롤에 따라 서서히 걷어내려면 재질이 투명을 지원해야 한다.
    // 좁은 화면에서는 기본 불투명도도 살짝 낮춰 한 겹 뒤로 물러나 보이게 한다.
    const CANDLE_BASE_OPACITY = narrowVp ? 0.88 : 1;
    upMat.transparent = dnMat.transparent = true;
    upMat.opacity = dnMat.opacity = CANDLE_BASE_OPACITY;
    let prev = CANDLE_H[0] * CANDLE_HS;
    for (let i = 0; i < N; i++) {
      // 키도 자리처럼 흔든다 — 시퀀스대로만 세우면 계단처럼 반듯해서 "가지런한 막대"로 읽힌다.
      // ±30% 안에서만 흔들어 우상향 흐름 자체는 남긴다.
      const h = CANDLE_H[i] * CANDLE_HS * (narrowVp ? 0.7 + Math.random() * 0.6 : 1);
      const up = h >= prev; prev = h;
      const mat = up ? upMat : dnMat;
      const bw = CANDLE_GAP * CANDLE_BODY_RATIO;
      const geo = new THREE.BoxGeometry(bw, h, bw);
      const wickGeo = new THREE.BoxGeometry(bw * 0.24, h * 0.28, bw * 0.24); // 짧고 도톰한 심지
      disposables.push(geo, wickGeo);
      const g = new THREE.Group();
      const body = new THREE.Mesh(geo, mat); body.position.y = h / 2;
      const wick = new THREE.Mesh(wickGeo, mat); wick.position.y = h + h * 0.14;
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.012; // 바닥면과 z-fighting 방지
      shadow.scale.set(bw * 2.6, bw * 2.6, 1);
      g.add(shadow, body, wick);
      const u = i / (N - 1);
      // 좁은 화면 — 균일 간격으로 세우면 아무리 벌려도 "막대그래프 한 줄"로 읽힌다.
      // 자리마다 좌우로 흔들어 듬성듬성 흩어 세운다. 흔들 폭을 (간격 − 몸통 폭) 이내로 잡아야
      // 이웃과 몸통이 겹치지 않는다. 깊이는 앞뒤 양쪽이 다 막혀 있어 조금만 흔든다 — 뒤로는
      // 글씨 뒤 낙하 금화 구간(z −3.6~−2.6), 앞으로는 바닥 금화 더미(z −1.5~1.5)에 닿는다.
      const jitterX = narrowVp ? (Math.random() - 0.5) * (CANDLE_GAP - bw) : 0;
      const jitterZ = narrowVp ? Math.random() * 0.2 : 0;
      g.position.set(
        (i - (N - 1) / 2) * CANDLE_GAP - CANDLE_GAP * 0.4 + jitterX,
        BASE,
        CANDLE_Z - (1 - u) * CANDLE_ARC + jitterZ,
      );
      candleGroup.add(g);
    }

    // 쏟아지는 금화 — 계속 순환하며 떨어지는 무리(stream) + 바닥에 쌓여 더미를 만드는 무리(pile).
    // 전부 하나의 InstancedMesh라 개수가 많아도 드로우콜은 1회다. 헤드라인을 침범할 수 있는 건
    // 공중을 가로지르는 stream뿐이라, 좁은 화면에선 stream만 줄이고 pile은 그대로 둔다.
    // 낙하가 느려진 만큼 한 닢이 화면에 머무는 시간이 길어진다 → 같은 개수를 쓰면 화면이
    // 금화로 뒤덮인다. 개수를 줄여야 시안처럼 성글게 흩날린다.
    const STREAM = narrowVp ? 11 : 22;

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    // 좁은 화면에선 보이는 가로 범위가 ±3 정도라 데스크톱 값(±7.8)을 그대로 쓰면 금화가 대부분
    // 화면 밖에서 떨어져 "쏟아지는" 느낌이 사라진다 → 낙하 구간과 더미를 프레임 안으로 당긴다.
    // 다만 헤드라인 왼쪽까지 침범하지는 않게, 낙하 시작 x의 하한을 텍스트 오른쪽에 맞춘다.
    const X_MAX = narrowVp ? 2.9 : 6.4; // 프레임 밖에서 떨어지면 개수만 늘고 보이지는 않는다
    const STREAM_X_MIN = narrowVp ? 1.2 : -2.0; // 낙하 금화 — 좁은 화면에선 헤드라인을 피해 오른쪽만
    const MOUND_X = narrowVp ? 1.6 : 3.4;       // 바닥 더미의 중심(더미 폭은 아래 SPREAD_X로 결정)
    // 굵은 금화가 헤드라인 위를 지나면 글씨를 덮는다 → 이 x보다 왼쪽은 작고 깊은(뒤쪽) 금화만.
    const BIG_X_MIN = 1.0;
    // 좁은 화면은 낙하 구간이 좁아 큰 알을 그대로 쓰면 서로 겹쳐 한 덩어리로 뭉쳐 보인다
    const R_MAX = narrowVp ? 0.34 : 0.46;

    // 바닥 금화 더미 — 낱장이 제멋대로 겹치면 지저분해 보인다(예전엔 동전을 세로로 세운 채
    // 무작위 높이에 띄워둬서, 정면에서 원판이 잔뜩 겹쳐 보이는 게 지저분함의 주원인이었다).
    // 대신 여러 개의 "동전 기둥"으로 나눠 바닥에 눕힌 채 가지런히 포개 쌓는다. 아래층부터
    // 기둥들을 골고루 채워 올려 봉긋한 무더기 실루엣이 되고, 기둥마다 반지름·각도를 조금씩
    // 달리해 기계적으로 보이지 않게 한다.
    const SPREAD_X = narrowVp ? 1.7 : 2.5, SPREAD_Z = 1.3;
    const COLS = 5, ROWS = 3; // 기둥 수를 적게 잡아야 같은 금화 수로 더 높이 쌓여 무더기다워진다
    const stacks: { x: number; z: number; r: number; cap: number }[] = [];
    for (let cx = 0; cx < COLS; cx++) {
      for (let cz = 0; cz < ROWS; cz++) {
        const u = (cx / (COLS - 1)) * 2 - 1;
        const v = (cz / (ROWS - 1)) * 2 - 1;
        const d = Math.hypot(u, v);
        if (d > 1.15) continue;                             // 타원 바깥은 버려 둥근 더미 윤곽을 만든다
        stacks.push({
          x: MOUND_X + u * SPREAD_X + rnd(-0.22, 0.22),
          z: v * SPREAD_Z + rnd(-0.22, 0.22),
          r: rnd(0.34, 0.5),
          cap: Math.max(1, Math.round((1 - d * 0.6) * 10)), // 중심 기둥일수록 높게
        });
      }
    }
    // 아래층부터 가로로 채워 올린다 — 도중에 금화가 모자라도 층이 반듯하게 끊긴다
    const slots: { x: number; y: number; z: number; r: number }[] = [];
    const maxCap = Math.max(...stacks.map(s => s.cap));
    for (let level = 0; level < maxCap; level++) {
      for (const s of stacks) {
        if (level >= s.cap) continue;
        slots.push({ x: s.x, y: BASE + (level + 0.5) * COIN_TH * s.r, z: s.z, r: s.r });
      }
    }
    // 더미 금화 수 = 기둥 자리 수 — 설계한 무더기 모양이 빈틈없이 완성된다
    const PILE = slots.length, TOTAL = STREAM + PILE;

    const coinGeo = makeCoinGeometry();
    disposables.push(coinGeo);
    const coinMesh = new THREE.InstancedMesh(coinGeo, goldMat, TOTAL);
    coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    root.add(coinMesh);

    type Coin = {
      pos: THREE.Vector3; rot: THREE.Euler; r: number;
      vy: number; vx: number; rx: number; ry: number; rz: number;
      settled: boolean;
    };
    // 낙하 금화 한 닢을 화면 위쪽에 새로 던져 넣는다 — 최초 배치와 재활용이 같은 규칙을 써야
    // 시간이 지나며 굵은 금화가 헤드라인 쪽으로 흘러들어오는 일이 없다(크기·깊이도 매번 다시 뽑아
    // 같은 금화가 계속 같은 궤적을 그리지 않게 한다).
    // 히어로를 지나 스크롤하면 무대(캔들·금화 더미)를 접고 낙하하는 금화만 남겨 아래 섹션의
    // 배경으로 쓴다. 이 플래그가 켜지면 금화는 화면 폭 전체에서 떨어지고 바닥도 사라진다.
    let bgMode = false;

    const respawn = (c: Coin) => {
      // 배경 모드에서는 헤드라인을 피할 이유가 없으므로 화면 폭 전체를 쓴다
      const x = rnd(bgMode ? -X_MAX : STREAM_X_MIN, X_MAX);
      const textZone = !bgMode && x < BIG_X_MIN;
      // y는 화면 위쪽 경계 바로 밖에서 시작한다 — 훨씬 높은 데서 떨구면 대부분의 금화가 프레임 위
      // 허공에 머물러, 개수를 늘려도 정작 화면에서는 뜸해 보인다.
      // z는 캔들(-2.3 ~ -0.6)을 사이에 두고 확실히 앞/뒤로 갈라둔다 — 같은 깊이에 두면 금화가
      // 캔들 몸통을 파고들어 박힌 것처럼 보인다.
      c.pos.set(x, BASE + rnd(7.2, 12.5), textZone ? rnd(-3.6, -2.6) : rnd(0.1, 1.8));
      // 알을 굵게 — 낱알이 클수록 금덩이처럼 탐스럽게 보인다. 다만 너무 키우면 한 닢이 화면을
      // 잡아먹고, 넓은 면이 환경맵의 어두운 아래쪽을 반사해 갈색으로 죽는다(글씨와 겹치는 구간은
      // 별도로 더 작게).
      c.r = textZone ? rnd(0.14, 0.24) : rnd(R_MAX * 0.5, R_MAX);
      // 아주 느리게 — 시안처럼 "떨어진다"기보다 "가라앉는다"에 가깝게 둔다. 빠르면 부스러기가
      // 흩날리는 것처럼 보이고, 느려야 낱알마다 면이 돌면서 빛을 받아 묵직한 금화로 읽힌다.
      // (중력과 종단속도도 함께 낮춘다 — stepCoins 참고)
      c.vy = -rnd(0.35, 0.8);
      c.vx = rnd(-0.07, 0.07);
      c.rx = rnd(-0.55, 0.55); c.ry = rnd(-0.7, 0.7); c.rz = rnd(-0.4, 0.4);
    };

    const coins: Coin[] = [];
    for (let i = 0; i < TOTAL; i++) {
      // 더미 몫은 애초에 기둥 자리에 눕혀 배치한다(어차피 낙하 시뮬레이션은 첫 렌더 전에 끝나
      // 화면에 안 보이므로, 굴려서 쌓는 대신 곧바로 제자리에 놓는 편이 결과가 가지런하다)
      if (i < PILE && i < slots.length) {
        const s = slots[i];
        coins.push({
          pos: new THREE.Vector3(s.x, s.y, s.z),
          // 눕힌 자세(회전 없음)가 기본 — 아주 살짝만 기울여 딱 맞아떨어진 느낌을 뺀다
          rot: new THREE.Euler(rnd(-0.05, 0.05), rnd(0, 6.3), rnd(-0.05, 0.05)),
          r: s.r,
          vy: 0, vx: 0, rx: 0, ry: 0, rz: 0,
          settled: true,
        });
        continue;
      }
      const c: Coin = {
        pos: new THREE.Vector3(), rot: new THREE.Euler(rnd(0, 6.3), rnd(0, 6.3), rnd(0, 6.3)),
        r: 0, vy: 0, vx: 0, rx: 0, ry: 0, rz: 0, settled: false,
      };
      respawn(c);
      coins.push(c);
    }

    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
    const syncCoins = () => {
      coins.forEach((c, i) => {
        _q.setFromEuler(c.rot);
        // 배경 모드에서는 바닥 더미를 지운다 — 같은 InstancedMesh라 크기 0으로 접는 게 가장 싸다
        _s.setScalar(bgMode && c.settled ? 0 : c.r);
        _m.compose(c.pos, _q, _s);
        coinMesh.setMatrixAt(i, _m);
      });
      coinMesh.instanceMatrix.needsUpdate = true;
    };

    const stepCoins = (dt: number) => {
      for (const c of coins) {
        if (c.settled) continue;
        c.vy -= 0.9 * dt;                     // 중력 — 낮게 잡아 무겁고 느긋하게 떨어지도록
        if (c.vy < -1.5) c.vy = -1.5;         // 종단속도 — 없으면 아래로 갈수록 빨라져 결국 흩날린다
        c.pos.y += c.vy * dt;
        c.pos.x += c.vx * dt;
        c.rot.x += c.rx * dt; c.rot.y += c.ry * dt; c.rot.z += c.rz * dt;
        // 히어로에서는 더미에 닿으면 위로 되돌려 끊임없이 쏟아지게 한다(더미는 이미 기둥으로
        // 쌓여 있으므로 새로 쌓이지는 않는다 — 계속 쌓으면 무더기가 무한정 높아진다).
        // 배경 모드에서는 더미가 사라지므로 바닥을 화면 아래로 내려 끝까지 떨어뜨린다.
        if (c.pos.y <= (bgMode ? BASE - 8 : BASE + c.r * 0.12)) respawn(c);
      }
    };

    // 첫 화면부터 "이미 쏟아지고 쌓여 있는" 상태로 보이도록 시뮬레이션을 미리 굴려둔다.
    // 낙하가 느려졌으므로 예열도 길게 잡아야 첫 프레임에 화면 위쪽이 비지 않는다(약 20초분).
    for (let i = 0; i < 1200; i++) stepCoins(1 / 60);
    syncCoins();

    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    // 컨테이너 높이는 100vh 로 고정돼 있어(마운트하는 쪽 주석 참고) 스크롤만으로는 리사이즈가
    // 일어나지 않는다. 남는 경우는 화면 회전·창 크기 변경뿐인데, renderer.setSize()는
    // 프레임버퍼를 다시 잡는 비싼 호출이라 연속 발화하면 끊겨 보인다 → 잦아든 뒤 한 번만.
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });
    ro.observe(mount);

    // 스크롤에 따라 캔들 차트를 살짝 회전 — 히어로 한 화면(innerHeight) 스크롤될 때까지 목표
    // 각도까지 진행되고, 그 이상은 더 돌지 않게 clamp한다(계속 돌면 산만하다). 목표값을 향해
    // 매 프레임 조금씩 따라가는 지수 감쇠(lerp)로 스크롤이 뚝뚝 끊겨도 회전은 매끈하게 이어진다.
    const CANDLE_MAX_ROT = THREE.MathUtils.degToRad(12);
    let candleRotY = 0;
    // 캔들이 사라지는 구간 — 예전엔 bgMode 로 넘어가는 한 프레임에 candleGroup.visible 을 꺼서
    // 차트가 통째로 툭 사라졌다. 같은 구간을 불투명도로 건너가면 무대가 자연스럽게 물러난다.
    // (스크롤이 뚝뚝 끊겨도 매끈하도록 회전과 같은 지수 감쇠를 쓴다)
    const FADE_FROM = 0.15, FADE_TO = 0.55; // scrollProgress 기준 — 끝값은 bgMode 전환점과 같다
    let candleFade = 1;
    const clock = new THREE.Clock();
    let raf = 0;
    const render = () => {
      const dt = Math.min(clock.getDelta(), 0.05); // 탭 전환 후 큰 dt로 금화가 순간이동하는 것 방지
      const t = clock.getElapsedTime();
      stepCoins(dt);
      syncCoins();
      const scrollProgress = Math.min(window.scrollY / Math.max(1, window.innerHeight * 0.9), 1);
      const targetRotY = scrollProgress * CANDLE_MAX_ROT;
      candleRotY += (targetRotY - candleRotY) * (1 - Math.exp(-6 * dt));
      candleGroup.rotation.y = candleRotY;
      // 히어로를 절반 넘게 지나면 무대를 접는다 — 아래 섹션에서는 금화만 배경으로 흐른다
      bgMode = scrollProgress > 0.55;
      const targetFade = 1 - THREE.MathUtils.clamp((scrollProgress - FADE_FROM) / (FADE_TO - FADE_FROM), 0, 1);
      candleFade += (targetFade - candleFade) * (1 - Math.exp(-8 * dt));
      upMat.opacity = dnMat.opacity = candleFade * CANDLE_BASE_OPACITY;
      shadowMat.opacity = candleFade;
      candleGroup.visible = candleFade > 0.02; // 다 지워지면 그리는 비용까지 없앤다
      // 완만한 카메라 드리프트(패럴랙스)로 화면 전체가 살아 있게.
      camera.position.x = Math.sin(t * 0.08) * 2.4;
      camera.position.y = 2.6 + Math.sin(t * 0.05) * 0.5;
      camera.lookAt(0, 0.4, -1);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    let disposed = false;
    if (reduce) {
      // 모션 최소화 설정 — 이미 쏟아져 쌓인 한 장면을 정지 화면으로 보여준다
      camera.position.set(1.6, 2.7, 11);
      camera.lookAt(0, 0.4, -1);
      renderer.render(scene, camera);
    } else {
      // 셰이더를 첫 프레임에 컴파일하면 모바일 GPU에서 수백 ms가 걸린다 — 그동안 프레임이
      // 통째로 밀려 "덜그럭거리다 매끄러워지는" 시작이 된다. 미리 비동기로 컴파일해 두고
      // 끝난 뒤에 루프를 시작한다. clock을 다시 시작해 컴파일 시간이 첫 dt로 잡히지 않게 한다.
      const start = () => {
        if (disposed) return;
        clock.start();
        raf = requestAnimationFrame(render);
      };
      const compiled = renderer.compileAsync?.(scene, camera);
      if (compiled) compiled.then(start); else start();
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      ro.disconnect();
      disposables.forEach(d => d.dispose());
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" aria-hidden="true" />;
}

// 온보딩 스텝용 3D — 회전하는 글로시 오브젝트 (coin: 금화 / gem: 에메랄드 젬)
function SpinArt({ kind }: { kind: "coin" | "gem" }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.3, 6.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    mount.appendChild(canvas);

    const disposables: { dispose: () => void }[] = [];
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();
    disposables.push(envRT.texture);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9a88, 0.6));
    const key = new THREE.DirectionalLight(0xfff2d0, 2.6);
    key.position.set(4, 7, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x86efc0, 1.1);
    rim.position.set(-5, 2, -4);
    scene.add(rim);

    // 소프트 그림자
    const shadowTex = makeRadialTexture("rgba(16,60,40,0.5)");
    const shadowMat = new THREE.SpriteMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.4 });
    disposables.push(shadowTex, shadowMat);
    const shadow = new THREE.Sprite(shadowMat);
    shadow.scale.set(4.4, 1.3, 1);
    shadow.position.set(0, -1.7, -0.2);
    scene.add(shadow);

    const obj = new THREE.Group();
    scene.add(obj);

    const haloColor = kind === "coin" ? "rgba(255,205,80,0.5)" : "rgba(80,220,140,0.5)";
    const glowTex = makeRadialTexture(haloColor);
    const haloMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 });
    disposables.push(glowTex, haloMat);
    const halo = new THREE.Sprite(haloMat);
    halo.scale.set(6, 6, 1);
    obj.add(halo);

    if (kind === "coin") {
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xffca3d, metalness: 0.95, roughness: 0.15, emissive: 0x5a3d06, emissiveIntensity: 0.16 });
      const baseGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.34, 60);
      const fieldGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.44, 60);
      disposables.push(goldMat, baseGeo, fieldGeo);
      const disc = new THREE.Group();
      disc.add(new THREE.Mesh(baseGeo, goldMat), new THREE.Mesh(fieldGeo, goldMat));
      disc.rotation.x = Math.PI / 2;
      obj.add(disc);
    } else {
      const gemMat = new THREE.MeshPhysicalMaterial({ color: 0x18a94e, metalness: 0.1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.1, emissive: 0x0b5a2a, emissiveIntensity: 0.14 });
      const gemGeo = new THREE.OctahedronGeometry(1.55, 0);
      disposables.push(gemMat, gemGeo);
      obj.add(new THREE.Mesh(gemGeo, gemMat));
    }

    const resize = () => {
      const w = mount.clientWidth || 1, h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const clock = new THREE.Clock();
    let raf = 0;
    const render = () => {
      const t = clock.getElapsedTime();
      obj.rotation.y = t * 0.9;
      obj.position.y = Math.sin(t * 0.9) * 0.16;
      if (kind === "gem") obj.rotation.x = Math.sin(t * 0.5) * 0.22;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    if (reduce) {
      obj.rotation.y = 0.5;
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      disposables.forEach(d => d.dispose());
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [kind]);

  return <div ref={mountRef} className="w-full h-full" aria-hidden="true" />;
}

// 스크롤 리빌 — `.reveal` 클래스가 붙은 요소를 전부 관측해 화면에 들어오면 `.is-in`을 단다.
// 래퍼 컴포넌트 대신 클래스 기반으로 둔 이유: grid 자식에 래퍼 div가 끼면 열 배치가 깨진다.
// 한 번 나타난 요소는 unobserve해서 다시 스크롤해도 재생되지 않는다(깜빡임 방지).
// deps는 조건부로 늦게 마운트되는 섹션(비로그인 CTA)을 위해 받는다.
function useScrollReveal(deps: unknown[]) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (!els.length) return;
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.1 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// 계단식 등장용 지연값 — CSS의 var(--d)로 전달된다
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

// ── 서비스 규모 통계 밴드 ─────────────────────────────────────────
// 스캔 종목 수·전략 개수는 실제 데이터에서 읽는다. 하드코딩하면 스캔 규모가 늘어도
// 숫자가 그대로 남아 "매일 갱신된다"는 주장 자체가 거짓이 된다.
function StatsBand({ scannedCount }: { scannedCount: number }) {
  const stats = [
    { value: scannedCount > 0 ? scannedCount.toLocaleString() : "—", label: "매일 뒤지는 회사" },
    { value: `${STRATEGY_PRESETS_CLIENT.length}가지`, label: "쓰는 잣대" },
    { value: "매일 아침", label: "갱신 시각" },
    { value: "무료", label: "이용료" },
  ];
  return (
    <div className="border-y border-neutral-100 dark:border-[#1c2f26] bg-white dark:bg-[#081109]/85">
      <div className="max-w-4xl mx-auto px-5 grid grid-cols-2 sm:grid-cols-4 divide-x divide-neutral-100 dark:divide-[#1c2f26]">
        {stats.map((s, i) => (
          <div key={s.label} className="reveal py-6 text-center" style={delay(i * 80)}>
            <div className="text-2xl font-black font-[family-name:var(--font-mono)] text-neutral-900 dark:text-white tabular-nums leading-none">
              {s.value}
            </div>
            <div className="text-[10px] font-semibold text-neutral-400 dark:text-white/35 uppercase tracking-widest mt-2">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 섹션 머리표 — 구분선 + 영문 태그. 두 온보딩 섹션이 레이아웃은 서로 다르지만
// 이 머리표만은 공유해 "같은 시리즈"로 읽히게 한다.
// (번호 01/02 는 뺐다 — 순서를 지켜야 하는 절차가 아니라 서로 독립된 기능이다)
function StepLabel({ tag }: { tag: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px flex-1 bg-neutral-200 dark:bg-[#22402f]" />
      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#16a34a] dark:text-[#22c55e] shrink-0">
        {tag}
      </span>
    </div>
  );
}

// ── 히어로 앱 미리보기 ────────────────────────────────────────────
// "써보고 싶다"는 대개 결과 화면을 봤을 때 생긴다 → 제품 설명 대신 실제 화면을 기울여 띄운다.
// 스크린샷 이미지가 아니라 축소 렌더라 UI를 고치면 이 자리도 함께 갱신된다.
//
// 왼쪽 패널의 숫자는 특정 종목의 실제 분석이 아니라 눈금 읽는 법을 보여주는 예시다.
// 실존 종목 이름을 붙이면 계산해 보지도 않은 값을 그 회사의 분석인 양 내걸게 된다 → "예시"로 명시한다.
const PREVIEW_CUR = 36; // 현재가 눈금 위치(%)
const PREVIEW_MODELS = [
  { key: "DCF", color: "#a855f7", at: 88, ret: "+52%" },
  { key: "SRIM", color: "#10b981", at: 67, ret: "+31%" },
  { key: "PER", color: "#6366f1", at: 28, ret: "−5%" },
  { key: "NCAV", color: "#3b82f6", at: 10, ret: "−21%" },
];

// 부유(animation)와 기울이기(transform)를 같은 요소에 걸면 애니메이션이 인라인 transform을
// 통째로 덮어써 기울기가 사라진다 → 바깥 div가 떠다니고, 안쪽 div가 기운다.
// 원근은 부모의 perspective 대신 transform 안에서 직접 준다(중첩되면 부모 perspective가 안 먹는다).
function PreviewPanel({ title, meta, className, tilt, children }: {
  title: string; meta?: string; className?: string;
  tilt: string; children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="rounded-2xl bg-[#fbfbfa] border border-white/15 shadow-[0_34px_70px_-20px_rgba(0,0,0,0.72)] overflow-hidden"
        style={{ transform: `perspective(1500px) ${tilt}` }}>
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-neutral-100">
          <span className="text-[10.5px] font-extrabold text-neutral-900">{title}</span>
          {meta && <span className="ml-auto text-[9px] text-neutral-400">{meta}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HeroPreview({ list }: { list: Record<string, any>[] }) {
  const top = list.slice(0, 3);

  return (
    // 회전(rotate)과 부유(translateY)를 같은 요소에 걸면 서로 덮어쓴다 → 바깥은 애니메이션, 안쪽은 회전
    <div className="relative h-[290px] sm:h-[340px]">
      <PreviewPanel
        title="이 회사, 얼마짜리인가"
        meta="예시"
        className="absolute left-[2%] top-1.5 w-[min(290px,86%)] animate-float"
        tilt="rotateY(-18deg) rotateX(7deg) rotateZ(-1.6deg)"
      >
        {PREVIEW_MODELS.map(m => (
          <div key={m.key} className="flex items-center gap-2 px-3 py-2 border-b border-neutral-100 last:border-0">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.color }} />
            <span className="w-[34px] text-[10.5px] font-bold text-neutral-800 shrink-0">{m.key}</span>
            <span className="relative flex-1 h-2.5">
              <span className="absolute left-0 right-0 top-1 h-0.5 rounded-full bg-neutral-200" />
              <span className="absolute -top-2 -bottom-2 w-px bg-neutral-900/35" style={{ left: `${PREVIEW_CUR}%` }} />
              <span
                className="absolute top-1 h-0.5 rounded-full opacity-60"
                style={{
                  background: m.color,
                  left: `${Math.min(PREVIEW_CUR, m.at)}%`,
                  width: `${Math.abs(m.at - PREVIEW_CUR)}%`,
                }}
              />
              <span
                className="absolute -top-0.5 w-2.5 h-2.5 -ml-[5px] rounded-full ring-2 ring-[#fbfbfa]"
                style={{ background: m.color, left: `${m.at}%` }}
              />
            </span>
            <span className="text-[10px] font-extrabold text-neutral-800 shrink-0">{m.ret}</span>
          </div>
        ))}
      </PreviewPanel>

      {top.length > 0 && (
        <PreviewPanel
          title="오늘 남은 회사"
          meta={`${list.length}곳`}
          className="absolute right-0 bottom-2 w-[min(228px,66%)] hidden sm:block animate-float [animation-delay:-4s]"
          tilt="rotateY(-14deg) rotateX(5deg) rotateZ(1.4deg)"
        >
          {top.map(item => (
            <div key={item.ticker} className="flex items-center gap-2 px-3 py-2 border-b border-neutral-100 last:border-0">
              <span className="flex-1 text-[10.5px] font-bold text-neutral-800 truncate">{item.name}</span>
              <span className="text-[10px] font-extrabold text-[#16a34a] shrink-0">
                {Number(item.ncav_ratio) > 0 ? `${Number(item.ncav_ratio).toFixed(2)}x` : "—"}
              </span>
            </div>
          ))}
        </PreviewPanel>
      )}
    </div>
  );
}

// 온보딩 CTA — 보조 버튼. 히어로의 초록 단색 CTA와 위계를 나누되 눌림 피드백은 동일하게 준다.
function StepCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-white dark:bg-[#13211a] border border-neutral-200 dark:border-[#24402f] text-neutral-800 dark:text-white font-bold text-sm shadow-sm hover:border-[#16a34a]/50 dark:hover:border-[#22c55e]/60 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 ease-out"
    >
      {children}
      <ArrowRight size={14} className="text-[#16a34a] dark:text-[#22c55e] group-hover:translate-x-0.5 transition-transform duration-300 ease-out" />
    </Link>
  );
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const isLoggedIn = !!session;
  const sessionLoading = status === "loading";
  useScrollReveal([isLoggedIn, sessionLoading]);

  // 랜딩도 발굴 결과를 직접 읽는다 — 제품 설명만으로는 다시 올 이유가 생기지 않는다.
  const dispatch = useAppDispatch();
  const ncavDailyList = useAppSelector(selectNcavDailyList);
  useEffect(() => { dispatch(reqGetNcavDailyList("latest")); }, [dispatch]);

  const scanLoading = ncavDailyList.state === "pending" || ncavDailyList.state === "init";
  const matchedCount = ncavDailyList.list.length;
  // meta.total 은 스캔 대상 전체 수. 아직 안 왔으면 조건 충족 수로라도 채운다.
  const scannedCount = ncavDailyList.total || matchedCount;
  const scanDate = ncavDailyList.scanDate;
  const formattedScanDate = scanDate
    ? `${scanDate.slice(0, 4)}.${scanDate.slice(4, 6)}.${scanDate.slice(6, 8)}`
    : null;

  // 랜딩은 히어로부터 푸터까지 하나의 어두운 무대로 간다. 밝은 섹션이 섞이면 히어로에서
  // 만든 분위기가 다음 스크롤에서 끊긴다. 테마와 무관하게 이 톤 하나만 쓴다.
  return (
    <div className="relative min-h-screen bg-[#faf9f7] dark:bg-[#050d09]">

      {/* ── 페이지 전체 배경 ────────────────────────────────────────
          3D 씬을 히어로 안이 아니라 뷰포트에 고정해 둔다. 그래야 스크롤을 내려도 금화가
          계속 떨어지며 아래 섹션의 배경이 된다(히어로 안에 두면 히어로를 벗어나는 순간 잘린다).
          그라디언트 → 금화 → 콘텐츠 순으로 겹친다.

          높이는 inset-0 대신 h-screen(100vh)으로 고정한다. 모바일에서 fixed inset-0 은
          주소창이 접혔다 펴질 때마다 따라 늘었다 줄고, 그때마다 캔버스가 리사이즈되면서
          스크롤 중에 배경이 커졌다 작아졌다 한다. 100vh 는 모바일에서 "주소창이 접힌
          상태"의 큰 뷰포트에 고정된 값이라 스크롤 내내 변하지 않는다. */}
      <div className="fixed inset-x-0 top-0 h-screen z-0 pointer-events-none bg-[radial-gradient(130%_90%_at_74%_-10%,#143725_0%,#0a1b12_46%,#050d09_100%)]" />
      <div className="fixed inset-x-0 top-0 h-screen z-[1] pointer-events-none">
        <HeroArt />
      </div>

      <div className="relative z-10">

      {/* ── HERO ─────────────────────────────────────────────────────
          어두운 무대 위에 제품 화면을 올린다. 배경을 밝게 두면 3D 금화·캔들의 광택이
          배경에 씻겨 밋밋해진다 → 딥그린블랙으로 떨어뜨려 금색만 빛나게 한다.
          라이트/다크 모두 이 어두운 화면 하나로 간다(테마별 반전 없음 — 의도된 단일 톤). */}
      <section className="relative min-h-[92dvh] flex flex-col">
        {/* 가독성 비네트 — 글이 놓이는 왼쪽만 눌러 덮는다. 화면 전체를 덮으면 금화가 통째로 죽는다. */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(74%_62%_at_22%_46%,rgba(4,11,8,0.94)_0%,rgba(4,11,8,0.6)_44%,transparent_76%)]" />

        <div className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-5 pt-20 pb-14 sm:pt-24 grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-6 items-center">
          <div>
            <div className="reveal flex items-center gap-2.5 mb-5">
              <span className="w-5 h-px bg-[#e3b34a]/50" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#e3b34a]">
                Idiot Quant
              </span>
            </div>

            <h1
              className="reveal text-[2.3rem] sm:text-[3rem] lg:text-[3.4rem] font-black leading-[1.14] tracking-tight text-white break-keep text-balance"
              style={delay(80)}
            >
              주식 고르는 일,<br />
              <span className="bg-gradient-to-r from-[#ffe9a8] via-[#e3b34a] to-[#c08c12] bg-clip-text text-transparent">
                바보도 할 수 있게
              </span><br />
              만들었습니다
            </h1>

            <p
              className="reveal mt-5 text-sm sm:text-base text-white/60 break-keep leading-relaxed max-w-md"
              style={delay(160)}
            >
              어려운 건 저희가 합니다. 매일 아침
              {scannedCount > 0 ? ` ${scannedCount.toLocaleString()}곳을 ` : " 코스피·코스닥 전 종목을 "}
              뒤져서 값이 싼 회사만 남겨 둘 테니, 마음에 드는 걸 고르기만 하세요.
            </p>

            <div className="reveal mt-8" style={delay(240)}>
              <Link
                href="/screener?mincap=500"
                className="group inline-flex items-center gap-2 px-7 py-4 rounded-full bg-gradient-to-b from-[#f7dc8c] to-[#d9a52a] hover:from-[#ffe7a4] hover:to-[#e6b13a] text-[#2a1c00] font-black text-base shadow-[0_14px_38px_rgba(217,165,42,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 ease-out"
              >
                <Filter size={17} strokeWidth={2.6} />
                오늘 싸게 나온 회사 보기
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-300 ease-out" />
              </Link>
            </div>

            {/* 스캔 사실을 숫자 배지 대신 문장으로 — 처음 온 사람에게 "2,410 종목"은 뜻이 없다 */}
            <p className="reveal mt-4 text-[11px] text-white/35 break-keep" style={delay(300)}>
              {formattedScanDate && matchedCount > 0
                ? `오늘 아침 ${scannedCount.toLocaleString()}곳을 뒤져 ${matchedCount}곳이 남았습니다 · 가입 없이 무료`
                : "가입 없이 · 무료 · 매일 아침 갱신"}
            </p>
          </div>

          <div className="reveal" style={delay(200)}>
            <HeroPreview list={ncavDailyList.list} />
          </div>
        </div>
      </section>

      {/* ── 발굴 — 스플릿 2단 ─────────────────────────────────────── */}
      <section className="relative border-b border-neutral-100 dark:border-[#1c2f26] bg-[#faf9f7] dark:bg-[#0a1510]/85">
        <div className="max-w-4xl mx-auto px-5 py-20 md:py-32 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="reveal h-52 sm:h-72 rounded-3xl border border-neutral-200/70 dark:border-[#22402f] bg-gradient-to-b from-[#fdf6e9] to-white dark:from-[#1c1608] dark:to-[#0a1510] overflow-hidden">
            <SpinArt kind="coin" />
          </div>

          <div className="reveal" style={delay(120)}>
            <StepLabel tag="DISCOVER" />
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-white mb-3 break-keep text-balance">
              돌을 많이 뒤집는 쪽이 이깁니다
            </h2>
            <p className="text-sm text-neutral-500 dark:text-white/55 leading-relaxed break-keep mb-6 max-w-sm">
              사람이 {scannedCount > 0 ? `${scannedCount.toLocaleString()}곳의 ` : "상장사 "}재무제표를 하나씩 들추면 며칠이 걸립니다.
              여기선 아침에 끝나 있습니다. 가입도 필요 없습니다.
            </p>
            <StepCta href="/screener?mincap=500">오늘 남은 회사 보기</StepCta>
          </div>
        </div>
      </section>

      {/* ── STEP 02 · 분석 — 벤토 그리드 ───────────────────────────
          01과 좌우만 뒤집으면 같은 레이아웃이 두 번 반복돼 리듬이 죽는다 → 큰 아트 패널 하나에
          텍스트 셀·기능 셀 2개를 붙인 비대칭 벤토로 짠다. */}
      <section className="relative border-b border-neutral-100 dark:border-[#1c2f26] bg-white dark:bg-[#08120d]/85">
        <div className="max-w-4xl mx-auto px-5 py-20 md:py-32">
          <div className="grid md:grid-cols-5 gap-4">
            <div className="reveal md:col-span-3 h-52 sm:h-72 md:h-auto md:min-h-[22rem] rounded-3xl border border-neutral-200/70 dark:border-[#22402f] bg-gradient-to-b from-[#eafaf0] to-white dark:from-[#0e2016] dark:to-[#08120d] overflow-hidden">
              <SpinArt kind="gem" />
            </div>

            <div className="md:col-span-2 flex flex-col gap-4">
              <div
                className="reveal flex-1 rounded-3xl border border-neutral-200/70 dark:border-[#22402f] bg-white dark:bg-[#101b15]/95 p-6"
                style={delay(120)}
              >
                <StepLabel tag="ANALYZE" />
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-white mb-3 break-keep text-balance">
                  값을 먼저 정하고, 그다음에 가격을 봅니다
                </h2>
                <p className="text-sm text-neutral-500 dark:text-white/55 leading-relaxed break-keep mb-6">
                  이 회사가 얼마짜리인지 다섯 가지 방법으로 따로 계산합니다.
                  답이 하나로 모이지 않는다는 것 자체가 중요한 정보입니다.
                </p>
                <StepCta href="/analyze">종목 하나 넣어보기</StepCta>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { t: "얼마짜리인가", d: "서로 다른 다섯 가지 셈법" },
                  { t: "망할 곳인가", d: "상장폐지로 가는 신호 점검" },
                ].map((f, i) => (
                  <div
                    key={f.t}
                    className="reveal rounded-3xl border border-neutral-200/70 dark:border-[#22402f] bg-white dark:bg-[#101b15]/95 p-5"
                    style={delay(200 + i * 80)}
                  >
                    <p className="text-[13px] font-black tracking-tight text-neutral-900 dark:text-white mb-1 break-keep">
                      {f.t}
                    </p>
                    <p className="text-[11px] text-neutral-400 dark:text-white/40 leading-relaxed break-keep">
                      {f.d}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 오늘 남은 회사 · 서비스 규모 ────────────────────────────
          제품이 무엇을 하는지 먼저 말한 뒤에 결과와 숫자를 보여준다.
          히어로 직후에 두면 첫 화면의 감흥이 끊기고 대시보드처럼 읽힌다. */}
      <TodayDiscovery list={ncavDailyList.list} totalCount={matchedCount} isLoading={scanLoading} />

      <StatsBand scannedCount={scannedCount} />

      {/* ── CONVERSION CTA (비로그인) ───────────────────────────────
          앞선 섹션들이 전부 밝은 중립색이라, 같은 톤으로 두면 CTA가 본문에 묻힌다 →
          풀블리드 딥그린 패널로 뒤집어 페이지에서 가장 대비가 큰 블록으로 만든다. */}
      {!isLoggedIn && !sessionLoading && (
        <section className="relative overflow-hidden py-20 md:py-28 px-5 bg-[#0d2a1a] dark:bg-[#0b2416]">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[42rem] h-[26rem] rounded-full bg-[#16a34a]/25 blur-3xl" />
            <div className="absolute -bottom-32 right-0 w-[28rem] h-[20rem] rounded-full bg-[#facc15]/10 blur-3xl" />
          </div>
          <div className="max-w-md mx-auto text-center relative">
            <h2 className="reveal text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight leading-tight break-keep text-balance">
              찾았으면, 잊어버리기 전에 적어둡시다
            </h2>
            <ul className="space-y-3 mb-8 text-left inline-block">
              {[
                "마음에 든 회사를 모아 둡니다",
                "내가 쓰던 조건을 그대로 저장합니다",
                "새로 싸진 회사가 나오면 알려드립니다",
              ].map((item, i) => (
                <li
                  key={item}
                  className="reveal flex items-center gap-3 text-sm text-emerald-50/80 break-keep"
                  style={delay(80 + i * 80)}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="reveal" style={delay(320)}>
              <Link href="/login"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white hover:bg-emerald-50 text-[#0d2a1a] font-bold text-base sm:text-lg shadow-xl shadow-[#031a0e]/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 ease-out"
              >
                카카오로 무료 시작
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform duration-300 ease-out" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="bg-white dark:bg-[#050d09]">
        <div className="max-w-4xl mx-auto px-5 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-[#16a34a] dark:text-[#22c55e] shrink-0" strokeWidth={2.5} />
            <span className="text-xs font-black tracking-tight text-neutral-700 dark:text-white/80">
              IDIOT QUANT
            </span>
          </div>
          <div className="flex items-center gap-4">
            {[
              { label: "발굴", href: "/screener" },
              { label: "분석", href: "/analyze" },
              { label: "계산기", href: "/calculator" },
            ].map(l => (
              <Link key={l.label} href={l.href}
                className="text-xs text-neutral-400 hover:text-neutral-700 dark:text-white/50 dark:hover:text-white transition-colors font-medium"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="border-t border-neutral-100 dark:border-[#1c2f26]">
          <p className="px-5 py-2.5 text-[10px] text-neutral-400 dark:text-white/40 text-center">
            본 서비스는 투자 참고 목적이며 투자 결과에 대한 책임을 지지 않습니다. © 2026 IDIOT QUANT
          </p>
        </div>
      </footer>

      </div>
    </div>
  );
}
