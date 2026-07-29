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

// 금화 한 닢을 단일 지오메트리로 병합 — 원판 + 도드라진 안쪽 필드 + 앞뒤 각인 링(평평한 금속면의
// 밋밋함 제거). 테두리는 톱니 없이 매끈하게 연마된 면으로 둔다(톱니를 두르면 톱날·기어처럼 보임).
// 반지름 1 기준으로 만들어 두고 인스턴스별 scale로 크기를 다르게 쓴다. 파트별 색은 정점
// 색(vertexColors)으로 구분해 재질 하나·드로우콜 한 번으로 수십 개를 그린다.
const COIN_BODY = new THREE.Color(0xffd257);
const COIN_RIM = new THREE.Color(0xe0a020);
function paint(geo: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = color.r; arr[i * 3 + 1] = color.g; arr[i * 3 + 2] = color.b; }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return geo;
}
function makeCoinGeometry(): THREE.BufferGeometry {
  const TH = 0.22;
  const parts: THREE.BufferGeometry[] = [
    paint(new THREE.CylinderGeometry(1, 1, TH, 48), COIN_BODY),
    paint(new THREE.CylinderGeometry(0.8, 0.8, TH * 1.35, 48), COIN_BODY),
  ];
  for (const sgn of [1, -1]) {
    const ring = paint(new THREE.TorusGeometry(0.52, 0.045, 8, 40), COIN_RIM);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, sgn * TH * 0.7, 0);
    parts.push(ring);
  }
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

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0; // 노출을 낮춰 금화 하이라이트가 날아가지 않게
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

    scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7a72, 0.45));
    const key = new THREE.DirectionalLight(0xfff2d0, 3.2);
    key.position.set(5, 9, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x86efc0, 1.2);
    rim.position.set(-7, 3, -4);
    scene.add(rim);
    const glint = new THREE.PointLight(0xffffff, 26, 40); // 금화 표면 글린트
    glint.position.set(-3, 7, 6);
    scene.add(glint);

    const root = new THREE.Group();
    scene.add(root);
    const BASE = -2;

    // 캔들 재질 — 각진 형태는 유지하되 광택을 걷어내고 채도를 살짝 낮춘다.
    const upMat = new THREE.MeshStandardMaterial({ color: 0x14a05a, roughness: 0.5, metalness: 0.04 });
    const dnMat = new THREE.MeshStandardMaterial({ color: 0xd4525c, roughness: 0.5, metalness: 0.04 });
    const goldMat = new THREE.MeshPhysicalMaterial({
      vertexColors: true, metalness: 1.0, roughness: 0.05,
      // 반사 강도를 너무 올리면 하이라이트가 하얗게 날아가 금색이 빠진다
      envMapIntensity: 1.9, clearcoat: 0.5, clearcoatRoughness: 0.04,
    });
    disposables.push(upMat, dnMat, goldMat);

    // 세로로 긴 화면(모바일)은 보이는 가로 범위가 데스크톱의 절반 이하다 — 캔들 간격과 금화 낙하
    // 구간을 같은 값으로 쓰면 양쪽 다 화면 밖으로 밀려나 잘린 채 보인다. 아래 배치는 전부 이 플래그를
    // 기준으로 좁은 화면용 값을 따로 쓴다.
    const narrowVp = mount.clientWidth / Math.max(1, mount.clientHeight) < 0.9;

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
    const CANDLE_H = narrowVp ? CANDLE_SERIES.slice(4) : CANDLE_SERIES;
    const N = CANDLE_H.length;
    const CANDLE_Z = -0.6;   // 가장 앞(오른쪽 끝) 캔들의 깊이 — 바닥 금화 더미보다는 뒤에 둔다
    const CANDLE_GAP = narrowVp ? 0.56 : 1.05;
    const CANDLE_HS = narrowVp ? 0.7 : 1; // 화면이 좁으면 높이도 낮춰 가로:세로 비율을 유지
    const CANDLE_ARC = narrowVp ? 1.0 : 1.7;   // 왼쪽 끝이 뒤로 물러나는 거리
    const shadowTex = makeRadialTexture("rgba(28,52,40,.4)");
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
    const shadowGeo = new THREE.PlaneGeometry(1, 1);
    disposables.push(shadowTex, shadowMat, shadowGeo);
    let prev = CANDLE_H[0] * CANDLE_HS;
    for (let i = 0; i < N; i++) {
      const h = CANDLE_H[i] * CANDLE_HS;
      const up = h >= prev; prev = h;
      const mat = up ? upMat : dnMat;
      const bw = CANDLE_GAP * 0.66; // 몸통 폭은 간격에 비례 — 겹치지도, 성기지도 않게
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
      g.position.set((i - (N - 1) / 2) * CANDLE_GAP - CANDLE_GAP * 0.4, BASE, CANDLE_Z - (1 - u) * CANDLE_ARC);
      root.add(g);
    }

    // 쏟아지는 금화 — 계속 순환하며 떨어지는 무리(stream) + 바닥에 쌓여 더미를 만드는 무리(pile).
    // 전부 하나의 InstancedMesh라 개수가 많아도 드로우콜은 1회다. 헤드라인을 침범할 수 있는 건
    // 공중을 가로지르는 stream뿐이라, 좁은 화면에선 stream만 줄이고 pile은 그대로 둔다.
    const STREAM = narrowVp ? 18 : 40;

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
    const R_MAX = narrowVp ? 0.46 : 0.6;

    // 바닥 금화 더미 — 낱장이 제멋대로 겹치면 지저분해 보인다(예전엔 동전을 세로로 세운 채
    // 무작위 높이에 띄워둬서, 정면에서 원판이 잔뜩 겹쳐 보이는 게 지저분함의 주원인이었다).
    // 대신 여러 개의 "동전 기둥"으로 나눠 바닥에 눕힌 채 가지런히 포개 쌓는다. 아래층부터
    // 기둥들을 골고루 채워 올려 봉긋한 무더기 실루엣이 되고, 기둥마다 반지름·각도를 조금씩
    // 달리해 기계적으로 보이지 않게 한다.
    const COIN_TH = 0.22; // makeCoinGeometry의 두께(반지름 1 기준)
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
    const respawn = (c: Coin) => {
      const x = rnd(STREAM_X_MIN, X_MAX);
      const textZone = x < BIG_X_MIN;
      // y는 화면 위쪽 경계 바로 밖에서 시작한다 — 훨씬 높은 데서 떨구면 대부분의 금화가 프레임 위
      // 허공에 머물러, 개수를 늘려도 정작 화면에서는 뜸해 보인다.
      // z는 캔들(-2.3 ~ -0.6)을 사이에 두고 확실히 앞/뒤로 갈라둔다 — 같은 깊이에 두면 금화가
      // 캔들 몸통을 파고들어 박힌 것처럼 보인다.
      c.pos.set(x, BASE + rnd(7.2, 12.5), textZone ? rnd(-3.6, -2.6) : rnd(0.1, 1.8));
      // 알을 굵게 — 낱알이 클수록 금덩이처럼 탐스럽게 보인다. 다만 너무 키우면 한 닢이 화면을
      // 잡아먹고, 넓은 면이 환경맵의 어두운 아래쪽을 반사해 갈색으로 죽는다(글씨와 겹치는 구간은
      // 별도로 더 작게).
      c.r = textZone ? rnd(0.18, 0.3) : rnd(R_MAX * 0.5, R_MAX);
      // 낙하·회전을 느리게 — 빠르게 흩날리면 부스러기처럼 보이고, 천천히 굴러떨어져야 면마다
      // 빛을 받아 묵직한 금화로 읽힌다(중력도 함께 낮춘다, stepCoins 참고)
      c.vy = -rnd(1.3, 2.4);
      c.vx = rnd(-0.15, 0.15);
      c.rx = rnd(-1.3, 1.3); c.ry = rnd(-1.5, 1.5); c.rz = rnd(-0.9, 0.9);
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
        _s.setScalar(c.r);
        _m.compose(c.pos, _q, _s);
        coinMesh.setMatrixAt(i, _m);
      });
      coinMesh.instanceMatrix.needsUpdate = true;
    };

    const stepCoins = (dt: number) => {
      for (const c of coins) {
        if (c.settled) continue;
        c.vy -= 5.4 * dt;                     // 중력 — 낮게 잡아 무겁고 느긋하게 떨어지도록
        c.pos.y += c.vy * dt;
        c.pos.x += c.vx * dt;
        c.rot.x += c.rx * dt; c.rot.y += c.ry * dt; c.rot.z += c.rz * dt;
        // 더미에 닿으면 위로 되돌려 끊임없이 쏟아지게 한다(더미는 이미 기둥으로 쌓여 있으므로
        // 낙하 금화가 새로 쌓이지는 않는다 — 계속 쌓으면 무더기가 무한정 높아진다)
        if (c.pos.y <= BASE + c.r * 0.12) respawn(c);
      }
    };

    // 첫 화면부터 "이미 쏟아지고 쌓여 있는" 상태로 보이도록 시뮬레이션을 미리 굴려둔다
    for (let i = 0; i < 360; i++) stepCoins(1 / 60);
    syncCoins();

    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    // 모바일 스크롤 중엔 주소창이 접히며 min-h-[88dvh] 컨테이너 높이가 계속 미세하게 바뀌어
    // ResizeObserver가 연속 발화한다. 그때마다 renderer.setSize()(프레임버퍼 재할당, 비용 큼)를
    // 동기 호출하면 스크롤이 끊겨 보인다. 캔버스는 이미 CSS로 100% 채워지므로, 실제 렌더 해상도
    // 갱신은 리사이즈가 잦아든 뒤 한 번만 하도록 디바운스한다.
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });
    ro.observe(mount);

    const clock = new THREE.Clock();
    let raf = 0;
    const render = () => {
      const dt = Math.min(clock.getDelta(), 0.05); // 탭 전환 후 큰 dt로 금화가 순간이동하는 것 방지
      const t = clock.getElapsedTime();
      stepCoins(dt);
      syncCoins();
      // 캔들은 흔들지 않는다 — 정지된 차트가 "무겁고 신뢰감 있는" 인상을 만든다.
      // 완만한 카메라 드리프트(패럴랙스)로 화면 전체가 살아 있게.
      camera.position.x = Math.sin(t * 0.08) * 2.4;
      camera.position.y = 2.6 + Math.sin(t * 0.05) * 0.5;
      camera.lookAt(0, 0.4, -1);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    if (reduce) {
      // 모션 최소화 설정 — 이미 쏟아져 쌓인 한 장면을 정지 화면으로 보여준다
      camera.position.set(1.6, 2.7, 11);
      camera.lookAt(0, 0.4, -1);
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(render);
    }

    return () => {
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
    { value: scannedCount > 0 ? scannedCount.toLocaleString() : "—", label: "종목 스캔" },
    { value: `${STRATEGY_PRESETS_CLIENT.length}가지`, label: "퀀트 전략" },
    { value: "매일", label: "자동 업데이트" },
    { value: "무료", label: "가입 없이 이용" },
  ];
  return (
    <div className="border-y border-neutral-100 dark:border-[#2c2b27] bg-white dark:bg-[#1f1e1b]">
      <div className="max-w-4xl mx-auto px-5 grid grid-cols-2 sm:grid-cols-4 divide-x divide-neutral-100 dark:divide-[#2c2b27]">
        {stats.map((s, i) => (
          <div key={s.label} className="reveal py-6 text-center" style={delay(i * 80)}>
            <div className="text-2xl font-black font-[family-name:var(--font-mono)] text-neutral-900 dark:text-neutral-50 tabular-nums leading-none">
              {s.value}
            </div>
            <div className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mt-2">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 섹션 머리표 — 번호 · 구분선 · 영문 태그. 두 온보딩 섹션이 레이아웃은 서로 다르지만
// 이 머리표만은 공유해 "같은 시리즈"로 읽히게 한다.
function StepLabel({ n, tag }: { n: string; tag: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[11px] font-bold tabular-nums font-[family-name:var(--font-mono)] text-neutral-300 dark:text-neutral-700 shrink-0">
        {n}
      </span>
      <div className="h-px flex-1 bg-neutral-200 dark:bg-[#2c2b27]" />
      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#16a34a] shrink-0">
        {tag}
      </span>
    </div>
  );
}

// 온보딩 CTA — 보조 버튼. 히어로의 초록 단색 CTA와 위계를 나누되 눌림 피드백은 동일하게 준다.
function StepCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] text-neutral-800 dark:text-neutral-100 font-bold text-sm shadow-sm hover:border-[#16a34a]/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 ease-out"
    >
      {children}
      <ArrowRight size={14} className="text-[#16a34a] group-hover:translate-x-0.5 transition-transform duration-300 ease-out" />
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

  return (
    <div className="min-h-screen">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[88dvh] flex flex-col bg-gradient-to-b from-[#f4faf6] to-white dark:from-[#12241c] dark:to-[#1a1915]">
        {/* 풀블리드 3D 씬 */}
        <div className="absolute inset-0">
          <HeroArt />
        </div>
        {/* 가독성 스크림 — 위아래 경계만 부드럽게 잇는 정도로만 덮는다. 예전엔 상·하단이 배경색
            불투명이라 금화·캔들의 색이 통째로 씻겨 뿌옇게 보였다(특히 하단 금화 더미). */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#f4faf6]/75 via-transparent to-[#f4faf6]/55 dark:from-[#12241c]/80 dark:via-transparent dark:to-[#1a1915]/60" />

        {/* 텍스트 오버레이 */}
        <div className="relative z-10 max-w-3xl mx-auto w-full px-5 pt-20 sm:pt-28 md:pt-32">
          {/* 라이브 배지 — 오늘 스캔이 실제로 돌았다는 사실을 날짜·종목 수로 보여준다.
              데이터가 아직 없을 때만 제품 한 줄 소개로 대체한다. */}
          <div className="reveal inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 dark:bg-[#242320]/70 backdrop-blur-xl border border-neutral-200 dark:border-white/10 mb-5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            {formattedScanDate
              ? `${formattedScanDate} 스캔 완료 · 코스피·코스닥 ${scannedCount.toLocaleString()} 종목`
              : "데이터로 배우는 주식·경제"}
          </div>

          <h1
            className="reveal text-[2.3rem] sm:text-[3.2rem] md:text-[4rem] font-black leading-[1.06] tracking-tight mb-4 text-neutral-900 dark:text-neutral-50 break-keep text-balance"
            style={delay(80)}
          >
            주식 분석,<br />
            <span className="bg-gradient-to-r from-[#16a34a] to-emerald-500 dark:from-[#22c55e] dark:to-emerald-400 bg-clip-text text-transparent">쉽고 재미있게.</span>
          </h1>

          <p
            className="reveal text-sm sm:text-base text-neutral-600 dark:text-neutral-300 font-medium break-keep leading-relaxed max-w-md"
            style={delay(160)}
          >
            검증된 퀀트 전략과 실제 시장 데이터로 주식·경제 감각을 키웁니다.
          </p>

          <div className="reveal mt-8" style={delay(240)}>
            <Link
              href="/screener?mincap=500"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] text-white font-bold text-base sm:text-lg shadow-lg shadow-[#16a34a]/25 hover:shadow-xl hover:shadow-[#16a34a]/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 ease-out"
            >
              <Filter size={18} strokeWidth={2.5} />
              종목 발굴 무료 시작
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform duration-300 ease-out" />
            </Link>
          </div>
        </div>

      </section>

      {/* ── 오늘의 상위 발굴 ─────────────────────────────────────── */}
      <TodayDiscovery list={ncavDailyList.list} totalCount={matchedCount} isLoading={scanLoading} />

      {/* ── 서비스 규모 통계 ─────────────────────────────────────── */}
      <StatsBand scannedCount={scannedCount} />

      {/* ── STEP 01 · 발굴 — 스플릿 2단 ───────────────────────────── */}
      <section className="border-b border-neutral-100 dark:border-[#3a3834]">
        <div className="max-w-4xl mx-auto px-5 py-20 md:py-32 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="reveal h-52 sm:h-72 rounded-3xl border border-neutral-200/70 dark:border-[#35332e] bg-gradient-to-b from-[#fdf6e9] to-white dark:from-[#241d0e] dark:to-[#161511] overflow-hidden">
            <SpinArt kind="coin" />
          </div>

          <div className="reveal" style={delay(120)}>
            <StepLabel n="01" tag="DISCOVER" />
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-neutral-50 mb-3 break-keep text-balance">
              저평가 종목 발굴
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed break-keep mb-6 max-w-sm">
              검증된 퀀트 전략이 매일 코스피·코스닥 전 종목을 훑어 저평가 종목을 찾아냅니다.
              회원가입 없이 바로 확인할 수 있습니다.
            </p>
            <StepCta href="/screener?mincap=500">종목 발굴하기</StepCta>
          </div>
        </div>
      </section>

      {/* ── STEP 02 · 분석 — 벤토 그리드 ───────────────────────────
          01과 좌우만 뒤집으면 같은 레이아웃이 두 번 반복돼 리듬이 죽는다 → 큰 아트 패널 하나에
          텍스트 셀·기능 셀 2개를 붙인 비대칭 벤토로 짠다. */}
      <section className="border-b border-neutral-100 dark:border-[#3a3834] bg-[#faf9f7] dark:bg-[#1a1917]">
        <div className="max-w-4xl mx-auto px-5 py-20 md:py-32">
          <div className="grid md:grid-cols-5 gap-4">
            <div className="reveal md:col-span-3 h-52 sm:h-72 md:h-auto md:min-h-[22rem] rounded-3xl border border-neutral-200/70 dark:border-[#35332e] bg-gradient-to-b from-[#eafaf0] to-white dark:from-[#0e2016] dark:to-[#161511] overflow-hidden">
              <SpinArt kind="gem" />
            </div>

            <div className="md:col-span-2 flex flex-col gap-4">
              <div
                className="reveal flex-1 rounded-3xl border border-neutral-200/70 dark:border-[#35332e] bg-white dark:bg-[#242320] p-6"
                style={delay(120)}
              >
                <StepLabel n="02" tag="ANALYZE" />
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-neutral-50 mb-3 break-keep text-balance">
                  적정주가 분석
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed break-keep mb-6">
                  관심 종목의 내재가치를 재무 데이터로 직접 계산해 지금 가격이 싼지 비싼지 판단합니다.
                </p>
                <StepCta href="/analyze">종목 분석하기</StepCta>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { t: "목표주가 계산", d: "DCF · RIM · 그레이엄 공식" },
                  { t: "위험도 점검", d: "상장폐지 위험 지표 분석" },
                ].map((f, i) => (
                  <div
                    key={f.t}
                    className="reveal rounded-3xl border border-neutral-200/70 dark:border-[#35332e] bg-white dark:bg-[#242320] p-5"
                    style={delay(200 + i * 80)}
                  >
                    <p className="text-[13px] font-black tracking-tight text-neutral-900 dark:text-neutral-50 mb-1 break-keep">
                      {f.t}
                    </p>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-relaxed break-keep">
                      {f.d}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

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
              발굴한 종목을 모으려면?
            </h2>
            <ul className="space-y-3 mb-8 text-left inline-block">
              {[
                "관심 종목 영구 보관 및 분석 이력 저장",
                "스크리너 즐겨찾기 및 포트폴리오 저장",
                "신규 저평가 종목 알림 수신",
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
      <footer className="bg-white dark:bg-[#1f1e1b]">
        <div className="max-w-4xl mx-auto px-5 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-[#16a34a] shrink-0" strokeWidth={2.5} />
            <span className="text-xs font-black tracking-tight text-neutral-700 dark:text-neutral-200">
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
                className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors font-medium"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="border-t border-neutral-100 dark:border-[#2c2b27]">
          <p className="px-5 py-2.5 text-[10px] text-neutral-400 dark:text-neutral-600 text-center">
            본 서비스는 투자 참고 목적이며 투자 결과에 대한 책임을 지지 않습니다. © 2026 IDIOT QUANT
          </p>
        </div>
      </footer>

    </div>
  );
}
