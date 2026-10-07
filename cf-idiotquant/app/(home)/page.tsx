"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { selectTheme } from "@/lib/features/control/controlSlice";
import { selectNcavDailyList, reqGetNcavDailyList } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import GuestLanding from "./GuestLanding";

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

// 테마별 무대 조명. 금화 자체(goldMat·환경맵)는 두 테마가 공유한다 — 금색은 어디서나 금색이라야
// 하고, 색을 바꾸면 금이 아니라 놋쇠나 레몬으로 읽힌다. 대신 배경 밝기에 맞춰 노출·조명·바닥
// 그림자·캔들 색을 옮겨, 밝은 바닥에서는 씬이 뜨지 않고 어두운 바닥에서는 잠기게 한다.
const HERO_STAGE = {
  dark: {
    exposure: 0.78,
    hemiSky: 0x9fc4ae, hemiGround: 0x0a1b12, hemiInt: 0.3,
    keyInt: 2.3,
    rimColor: 0x3f9e6b, rimInt: 0.85,
    glintInt: 22,
    candleUp: 0x0f7a45, candleDown: 0x9e3b46, candleEnv: 0.4,
  },
  light: {
    // 밝은 바닥에서는 같은 노출로 두면 씬 전체가 회색으로 가라앉는다 → 노출을 올리고
    // 반사광(hemiGround)을 바닥색에 맞춰 밝게 준다.
    exposure: 1.05,
    hemiSky: 0xffffff, hemiGround: 0xdfe6e0, hemiInt: 0.55,
    keyInt: 2.6,
    rimColor: 0x9fd8b8, rimInt: 0.5,
    glintInt: 18,
    // 어두운 무대용 저채도 색은 흰 바닥에서 탁해 보인다 → 앱 기본 초록·로즈로 올린다.
    candleUp: 0x16a34a, candleDown: 0xd4525c, candleEnv: 0.25,
  },
} as const;

// 페이지 맨 아래에 쌓인 금화 더미.
// 히어로 캔버스는 fixed 라 아래 섹션들의 불투명한 배경에 가려진다 — 더미를 "페이지 하단"에
// 두려면 그 자리에 직접 놓인 캔버스여야 한다. 그래서 히어로에서 떼어내 여기로 옮겼다.
// 낙하 시뮬레이션이 없는 정지 더미라 프레임당 비용은 회전 한 번이 전부다.
function HeroArt() {
  const mountRef = useRef<HTMLDivElement>(null);
  const theme = useAppSelector(selectTheme);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const stage = HERO_STAGE[theme === "light" ? "light" : "dark"];

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
    renderer.toneMappingExposure = stage.exposure;
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
    scene.add(new THREE.HemisphereLight(stage.hemiSky, stage.hemiGround, stage.hemiInt));
    const key = new THREE.DirectionalLight(0xfff2d0, stage.keyInt);
    key.position.set(5, 9, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(stage.rimColor, stage.rimInt);
    rim.position.set(-7, 3, -4);
    scene.add(rim);
    const glint = new THREE.PointLight(0xffffff, stage.glintInt, 40); // 금화 표면 글린트
    glint.position.set(-3, 7, 6);
    scene.add(glint);

    const root = new THREE.Group();
    scene.add(root);
    const BASE = -2;

    // 캔들 재질 — 어두운 무대에서는 캔들이 밝으면 금화보다 먼저 눈에 띈다. 색을 낮추고
    // 환경맵 반사도 줄여 금화만 빛나게 둔다(주연은 금화, 캔들은 무대 배경).
    const upMat = new THREE.MeshStandardMaterial({ color: stage.candleUp, roughness: 0.62, metalness: 0.03, envMapIntensity: stage.candleEnv });
    const dnMat = new THREE.MeshStandardMaterial({ color: stage.candleDown, roughness: 0.62, metalness: 0.03, envMapIntensity: stage.candleEnv });
    const goldMat = new THREE.MeshPhysicalMaterial({
      vertexColors: true, metalness: 1.0, roughness: 0.05,
      // 반사 강도를 너무 올리면 하이라이트가 하얗게 날아가 금색이 빠진다
      envMapIntensity: 1.9, clearcoat: 0.5, clearcoatRoughness: 0.04,
    });
    disposables.push(upMat, dnMat, goldMat);

    // 아래 배치는 전부 narrowVp(위에서 선언) 기준으로 좁은 화면용 값을 따로 쓴다 — 세로로 긴
    // 화면은 보이는 가로 범위가 데스크톱의 절반 이하라, 같은 값을 쓰면 양쪽 다 화면 밖으로
    // 밀려나 잘린 채 보인다.

    // 캔들 — 바닥에 줄지어 세운 스카이라인이 아니라 낱개로 화면 곳곳에 띄운다.
    // 한 줄로 세우면 아무리 흩어도 결국 "막대그래프 한 줄"로 읽히고 시선이 바닥에 묶인다.
    // 낱개로 떠 있으면 화면 중간중간을 채우는 소품이 되어 헤드라인과 자리를 다투지 않는다.
    const CANDLE_N = narrowVp ? 9 : 12;
    const CANDLE_HS = narrowVp ? 0.42 : 1;
    // 가로는 고르게, 세로는 제멋대로. x 를 지터 섞은 격자로 잡아야 화면 폭에 골고루 퍼지고,
    // 완전 난수로 두면 한쪽에 뭉치고 반대쪽이 비는 자리가 매번 생긴다.
    // 가로 반폭은 세로 시야 × 종횡비다. 모바일(390×844)은 그 값이 약 2.2 라 2.6 으로 잡으면
    // 양끝 캔들이 화면 밖에서 떠 있어 개수만 늘고 화면은 텅 빈다.
    const SPAN_X = narrowVp ? 1.95 : 6.2;
    // 세로 — 위로 더 올리면 윗변에 잘린 채 걸리고, 아래로 더 내리면 CTA 버튼 위를 덮는다.
    // 이 범위가 화면 높이의 대략 15~78% 에 해당해 "중간중간"으로 읽힌다.
    const Y_MIN = narrowVp ? -3.4 : -3.0, Y_MAX = narrowVp ? 3.4 : 3.6;
    // 깊이는 낙하 금화가 쓰는 두 구간(글씨 뒤 z −3.6~−2.6 / 앞쪽 z 0.1~1.8) 사이에만 둔다.
    // 같은 깊이에 겹치면 금화가 캔들 몸통을 파고들어 박힌 것처럼 보인다. 앞끝을 더 당기면
    // 카메라에 너무 가까운 캔들이 프레임 밖으로 잘려 덩어리처럼 보인다.
    const Z_MIN = -2.4, Z_MAX = -0.6;
    // 캔들만 따로 묶어 스크롤에 따라 이 그룹만 회전시킨다(금화는 낙하 궤적이 흐트러지면 안 되므로 제외).
    const candleGroup = new THREE.Group();
    root.add(candleGroup);

    // 캔들을 스크롤에 따라 서서히 걷어내려면 재질이 투명을 지원해야 한다.
    // 좁은 화면에서는 기본 불투명도도 살짝 낮춰 한 겹 뒤로 물러나 보이게 한다.
    const CANDLE_BASE_OPACITY = narrowVp ? 0.88 : 1;
    upMat.transparent = dnMat.transparent = true;
    upMat.opacity = dnMat.opacity = CANDLE_BASE_OPACITY;

    // 떠 있는 소품이라 제자리에 가만히 두면 붙여넣은 스티커처럼 보인다 → 낱개마다 위상이 다른
    // 아주 느린 상하 부유 + 자전을 준다.
    const floaters: { g: THREE.Group; y0: number; phase: number; bob: number; spin: number }[] = [];
    for (let i = 0; i < CANDLE_N; i++) {
      // 크기도 낱개로 뽑는다 — 같은 크기를 흩어놓기만 하면 자리만 다른 복제품으로 읽힌다.
      const h = (0.5 + Math.random() * 0.85) * CANDLE_HS;
      const bw = h * (0.3 + Math.random() * 0.14);
      // 상승·하락을 7:3 으로 — 초록이 더 많아야 배경이 "우상향"의 인상으로 남는다.
      const mat = Math.random() < 0.7 ? upMat : dnMat;
      const geo = new THREE.BoxGeometry(bw, h, bw);
      const wickGeo = new THREE.BoxGeometry(bw * 0.24, h * 0.28, bw * 0.24); // 짧고 도톰한 심지
      disposables.push(geo, wickGeo);
      const g = new THREE.Group();
      g.add(new THREE.Mesh(geo, mat), new THREE.Mesh(wickGeo, mat));
      g.children[1].position.y = h * 0.64; // 심지는 몸통 위로
      const slotW = (SPAN_X * 2) / CANDLE_N;
      const x = -SPAN_X + (i + 0.5) * slotW + (Math.random() - 0.5) * slotW * 0.7;
      // 세로도 난수로만 뽑으면 몇 개가 같은 높이에 뭉치고 넓은 띠가 통째로 빈다. 황금비 수열로
      // 층을 고르게 훑은 뒤 살짝만 흔들어, 매 로드마다 달라지되 항상 골고루 퍼지게 한다.
      const yu = ((i * 0.618034) % 1 + Math.random() * 0.08) % 1;
      g.position.set(x, Y_MIN + yu * (Y_MAX - Y_MIN), Z_MIN + Math.random() * (Z_MAX - Z_MIN));
      // 살짝 기울여 세워둔 게 아니라 떠 있는 것으로 읽히게 한다.
      g.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * 6.3, (Math.random() - 0.5) * 0.34);
      candleGroup.add(g);
      floaters.push({
        g, y0: g.position.y, phase: Math.random() * 6.3,
        bob: 0.25 + Math.random() * 0.35, spin: (Math.random() - 0.5) * 0.25,
      });
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
    // 굵은 금화가 헤드라인 위를 지나면 글씨를 덮는다 → 이 x보다 왼쪽은 작고 깊은(뒤쪽) 금화만.
    const BIG_X_MIN = 1.0;
    // 좁은 화면은 낙하 구간이 좁아 큰 알을 그대로 쓰면 서로 겹쳐 한 덩어리로 뭉쳐 보인다
    const R_MAX = narrowVp ? 0.34 : 0.46;

    // 쌓인 동전 더미는 히어로가 아니라 페이지 맨 아래 CoinPileArt 로 옮겼다 —
    // 여기 남는 건 화면을 가로질러 떨어지는 낱알뿐이다.
    const TOTAL = STREAM;

    const coinGeo = makeCoinGeometry();
    disposables.push(coinGeo);
    const coinMesh = new THREE.InstancedMesh(coinGeo, goldMat, TOTAL);
    coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    root.add(coinMesh);

    type Coin = {
      pos: THREE.Vector3; rot: THREE.Euler; r: number;
      vy: number; vx: number; rx: number; ry: number; rz: number;
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
      const c: Coin = {
        pos: new THREE.Vector3(), rot: new THREE.Euler(rnd(0, 6.3), rnd(0, 6.3), rnd(0, 6.3)),
        r: 0, vy: 0, vx: 0, rx: 0, ry: 0, rz: 0,
      };
      respawn(c);
      coins.push(c);
    }

    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
    const syncCoins = () => {
      coins.forEach((c, i) => {
        _q.setFromEuler(c.rot);
        _s.setScalar(c.r);
        _m.compose(c.pos, _q, _s);
        coinMesh.setMatrixAt(i, _m);
      });
      coinMesh.instanceMatrix.needsUpdate = true;
    };

    const stepCoins = (dt: number) => {
      for (const c of coins) {
        c.vy -= 0.9 * dt;                     // 중력 — 낮게 잡아 무겁고 느긋하게 떨어지도록
        if (c.vy < -1.5) c.vy = -1.5;         // 종단속도 — 없으면 아래로 갈수록 빨라져 결국 흩날린다
        c.pos.y += c.vy * dt;
        c.pos.x += c.vx * dt;
        c.rot.x += c.rx * dt; c.rot.y += c.ry * dt; c.rot.z += c.rz * dt;
        // 화면 아래로 빠지면 위에서 다시 던져 넣어 끊임없이 쏟아지게 한다
        if (c.pos.y <= BASE - 8) respawn(c);
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
      // 낱개로 뜬 캔들은 위상이 서로 다른 느린 부유 + 자전으로 살아 있게 둔다
      for (const f of floaters) {
        f.g.position.y = f.y0 + Math.sin(t * f.bob + f.phase) * 0.22;
        f.g.rotation.y += f.spin * dt;
      }
      const scrollProgress = Math.min(window.scrollY / Math.max(1, window.innerHeight * 0.9), 1);
      const targetRotY = scrollProgress * CANDLE_MAX_ROT;
      candleRotY += (targetRotY - candleRotY) * (1 - Math.exp(-6 * dt));
      candleGroup.rotation.y = candleRotY;
      // 히어로를 절반 넘게 지나면 무대를 접는다 — 아래 섹션에서는 금화만 배경으로 흐른다
      bgMode = scrollProgress > 0.55;
      const targetFade = 1 - THREE.MathUtils.clamp((scrollProgress - FADE_FROM) / (FADE_TO - FADE_FROM), 0, 1);
      candleFade += (targetFade - candleFade) * (1 - Math.exp(-8 * dt));
      upMat.opacity = dnMat.opacity = candleFade * CANDLE_BASE_OPACITY;
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
    // 테마가 바뀌면 씬을 통째로 다시 세운다. 살아 있는 재질·조명을 하나씩 갈아끼우는 것보다
    // cleanup 이 이미 하는 dispose 를 그대로 태우는 쪽이 누수 없이 확실하다.
  }, [theme]);

  return <div ref={mountRef} className="w-full h-full" aria-hidden="true" />;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  // 랜딩도 발굴 결과를 직접 읽는다 — 제품 설명만으로는 다시 올 이유가 생기지 않는다.
  const dispatch = useAppDispatch();
  const ncavDailyList = useAppSelector(selectNcavDailyList);
  // 랜딩이 그리는 건 미리보기 3행 + 오늘의 발굴 4행, 모두 합쳐 일곱 줄이다. 그런데
  // 2,500행을 받고 있었다(한 행 570바이트 → 압축 전 1.3MB). 정렬 여유를 두고 60행만
  // 받는다 — 개수는 목록 길이가 아니라 meta.matched(전체 수)로 읽는다.
  useEffect(() => { dispatch(reqGetNcavDailyList({ date: "latest", limit: 60 })); }, [dispatch]);

  const scanLoading = ncavDailyList.state === "pending" || ncavDailyList.state === "init";
  // 조건에 맞은 전체 수. 목록은 그중 일부만 받아 오므로 length 로 세면 안 된다.
  const matchedCount = ncavDailyList.total || ncavDailyList.list.length;
  const scanDate = ncavDailyList.scanDate;

  return (
    <GuestLanding
      list={ncavDailyList.list}
      totalCount={matchedCount}
      isLoading={scanLoading}
      scanDate={scanDate}
      backgroundArt={<HeroArt />}
      isLoggedIn={status === "loading" || !!session}
    />
  );

}
