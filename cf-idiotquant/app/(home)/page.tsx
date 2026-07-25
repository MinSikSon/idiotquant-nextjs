"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Filter, ArrowRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.000, "#ffffff");
  g.addColorStop(0.340, "#fbf1dc");
  g.addColorStop(0.470, "#ffe7ae");
  g.addColorStop(0.500, "#fff6df"); // 수평선 바로 위 밝은 띠
  g.addColorStop(0.505, "#7c5a22"); // 급격한 명암 경계
  g.addColorStop(1.000, "#4d3714");
  x.fillStyle = g;
  x.fillRect(0, 0, 1024, 512);
  // 각진 소프트박스 — 원형 블러보다 경계가 뚜렷해 금속에 "면"으로 된 하이라이트를 남긴다
  x.fillStyle = "#ffffff";
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
      envMapIntensity: 2.6, clearcoat: 0.5, clearcoatRoughness: 0.04,
    });
    disposables.push(upMat, dnMat, goldMat);

    // 캔들 스카이라인 — 좌→우 상승 추세. 예전엔 가느다란 회색 심지가 벌레 다리처럼 보이고, 진한
    // 윤곽선과 제각각인 깊이(z)가 어수선해 보였다 → 심지를 몸통과 같은 색의 짧고 도톰한 블록으로
    // 바꾸고, 윤곽선을 없애고, 깊이를 한 줄로 정렬해 정면에서 읽히는 깔끔한 차트로 만든다.
    const N = 15;
    const CANDLE_Z = -0.6;
    let prev = 1.0;
    for (let i = 0; i < N; i++) {
      const trend = 0.9 + i * 0.12;
      const noise = Math.sin(i * 1.7) * 0.4 + (Math.sin(i * 7.3) * 0.5 - 0.25) * 0.35;
      const h = Math.max(0.6, trend + noise);
      const up = h >= prev; prev = h;
      const mat = up ? upMat : dnMat;
      const geo = new THREE.BoxGeometry(0.66, h, 0.66);          // 폭을 넓혀 안정감 있게
      const wickGeo = new THREE.BoxGeometry(0.16, h * 0.28, 0.16); // 짧고 도톰한 심지
      disposables.push(geo, wickGeo);
      const g = new THREE.Group();
      const body = new THREE.Mesh(geo, mat); body.position.y = h / 2;
      const wick = new THREE.Mesh(wickGeo, mat); wick.position.y = h + h * 0.14;
      g.add(body, wick);
      g.position.set((i - (N - 1) / 2) * 1.15, BASE, CANDLE_Z);
      root.add(g);
    }

    // 쏟아지는 금화 — 계속 순환하며 떨어지는 무리(stream) + 바닥에 쌓여 더미를 만드는 무리(pile).
    // 전부 하나의 InstancedMesh라 개수가 많아도 드로우콜은 1회다. 헤드라인을 침범할 수 있는 건
    // 공중을 가로지르는 stream뿐이라, 좁은 화면에선 stream만 줄이고 pile은 그대로 둔다.
    const narrowVp = mount.clientWidth / Math.max(1, mount.clientHeight) < 0.9;
    const STREAM = narrowVp ? 10 : 26, PILE = 46, TOTAL = STREAM + PILE;
    const coinGeo = makeCoinGeometry();
    disposables.push(coinGeo);
    const coinMesh = new THREE.InstancedMesh(coinGeo, goldMat, TOTAL);
    coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    root.add(coinMesh);

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    // 세로로 긴 화면(모바일)은 보이는 가로 범위가 좁아, 넓은 화면 기준으로 쏟으면 금화가 헤드라인
    // 위를 지나가 글씨를 가린다 → 좁은 화면에선 더미와 낙하 구간을 오른쪽으로 옮기고, 특히 공중을
    // 가로지르는 낙하 금화는 텍스트 오른쪽 바깥에서만 떨어지게 한다.
    const X_MAX = narrowVp ? 5.6 : 7.8;
    const PILE_X_MIN = narrowVp ? 0.0 : -2.0;   // 바닥 더미 — 텍스트 아래라 왼쪽까지 깔려도 무방
    const STREAM_X_MIN = narrowVp ? 1.6 : -2.0; // 낙하 금화 — 좁은 화면에선 헤드라인을 피해 오른쪽만
    const MOUND_X = narrowVp ? 2.4 : 3.4;

    type Coin = {
      pos: THREE.Vector3; rot: THREE.Euler; r: number;
      vy: number; vx: number; rx: number; ry: number; rz: number;
      pile: boolean; settled: boolean;
    };
    const coins: Coin[] = [];
    for (let i = 0; i < TOTAL; i++) {
      const pile = i < PILE;
      const x = rnd(pile ? PILE_X_MIN : STREAM_X_MIN, X_MAX);
      // 텍스트가 얹히는 좌상단은 작고 깊은(뒤쪽) 금화만 배치해 가독성을 지킨다
      const leftZone = x < -1.0;
      coins.push({
        pos: new THREE.Vector3(x, rnd(BASE + 4, BASE + 17), leftZone ? rnd(-3.5, -1.5) : rnd(-2.5, 3.2)),
        rot: new THREE.Euler(rnd(0, 6.3), rnd(0, 6.3), rnd(0, 6.3)),
        r: rnd(leftZone ? 0.2 : 0.26, leftZone ? 0.34 : 0.6),
        vy: -rnd(2.2, 4.0), vx: rnd(-0.2, 0.2),
        rx: rnd(-2.4, 2.4), ry: rnd(-2.6, 2.6), rz: rnd(-1.6, 1.6),
        pile, settled: false,
      });
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
        c.vy -= 9.0 * dt;                     // 중력
        c.pos.y += c.vy * dt;
        c.pos.x += c.vx * dt;
        c.rot.x += c.rx * dt; c.rot.y += c.ry * dt; c.rot.z += c.rz * dt;
        const floorY = BASE + c.r * 0.12;
        if (c.pos.y <= floorY) {
          if (c.pile) {
            // 눕혀서 고정 — 더미 중심에 가까울수록 높이 쌓여 봉긋한 금화 무더기가 된다
            const mound = Math.max(0, 1 - Math.abs(c.pos.x - MOUND_X) / 5.5);
            c.pos.y = floorY + mound * rnd(0.1, 1.5) + rnd(0, 0.12);
            c.rot.set(Math.PI / 2 + rnd(-0.3, 0.3), rnd(0, 6.3), rnd(-0.3, 0.3));
            c.settled = true;
          } else {                            // 위로 되돌려 끊임없이 쏟아지게
            c.pos.set(rnd(STREAM_X_MIN, X_MAX), BASE + rnd(11, 17), rnd(-2.5, 3.2));
            c.vy = -rnd(2.2, 4.0);
          }
        }
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
    const ro = new ResizeObserver(resize);
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

// ── 서비스 규모 통계 밴드 ─────────────────────────────────────────
const STATS = [
  { value: "2,400+", label: "종목 스캔" },
  { value: "4가지",  label: "퀀트 전략" },
  { value: "매일",   label: "자동 업데이트" },
  { value: "무료",   label: "로 시작 가능" },
];

function StatsBand() {
  return (
    <div className="border-b border-neutral-100 dark:border-[#2c2b27] bg-white dark:bg-[#1f1e1b]">
      <div className="max-w-4xl mx-auto px-5 grid grid-cols-2 sm:grid-cols-4 divide-x divide-neutral-100 dark:divide-[#2c2b27]">
        {STATS.map(s => (
          <div key={s.label} className="py-5 text-center">
            <div className="text-2xl font-black font-[family-name:var(--font-mono)] text-neutral-900 dark:text-neutral-50 tabular-nums leading-none">
              {s.value}
            </div>
            <div className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mt-1.5">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 순차 온보딩 2단계 — 각 단계는 3D 이미지 + 한 줄 설명 + 단일 CTA
const STEPS: {
  n: string; tag: string; title: string; desc: string; cta: string; href: string;
  art: React.ReactNode; tint: string;
}[] = [
  {
    n: "01", tag: "DISCOVER", title: "저평가 종목 발굴",
    desc: "검증된 퀀트 전략으로 숨어 있는 저평가 종목을 스캔해요. 회원가입 없이 바로 시작합니다.",
    cta: "종목 발굴하기", href: "/screener?mincap=500", art: <SpinArt kind="coin" />,
    tint: "from-[#fdf6e9] to-white dark:from-[#241d0e] dark:to-[#161511]",
  },
  {
    n: "02", tag: "ANALYZE", title: "적정주가 분석",
    desc: "관심 종목의 내재가치를 재무 데이터로 직접 계산해, 지금 가격이 싼지 비싼지 판단해요.",
    cta: "종목 분석하기", href: "/analyze", art: <SpinArt kind="gem" />,
    tint: "from-[#eafaf0] to-white dark:from-[#0e2016] dark:to-[#161511]",
  },
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const isLoggedIn = !!session;
  const sessionLoading = status === "loading";

  return (
    <div className="min-h-screen">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[88vh] flex flex-col border-b border-neutral-200/70 dark:border-[#3a3834] bg-gradient-to-b from-[#f4faf6] to-white dark:from-[#12241c] dark:to-[#1a1915]">
        {/* 풀블리드 3D 씬 */}
        <div className="absolute inset-0">
          <HeroArt />
        </div>
        {/* 가독성 스크림 — 위아래 경계만 부드럽게 잇는 정도로만 덮는다. 예전엔 상·하단이 배경색
            불투명이라 금화·캔들의 색이 통째로 씻겨 뿌옇게 보였다(특히 하단 금화 더미). */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#f4faf6]/75 via-transparent to-[#f4faf6]/55 dark:from-[#12241c]/80 dark:via-transparent dark:to-[#1a1915]/60" />

        {/* 텍스트 오버레이 */}
        <div className="relative z-10 max-w-3xl mx-auto w-full px-5 pt-20 sm:pt-28 md:pt-32">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 dark:bg-[#242320]/70 backdrop-blur border border-neutral-200 dark:border-[#35332e] mb-5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            데이터로 배우는 주식·경제
          </div>

          <h1 className="text-[2.3rem] sm:text-[3.2rem] md:text-[4rem] font-black leading-[1.06] tracking-tight mb-4 text-neutral-900 dark:text-neutral-50">
            주식 분석이,<br />
            <span className="bg-gradient-to-r from-[#16a34a] to-emerald-500 dark:from-[#22c55e] dark:to-emerald-400 bg-clip-text text-transparent">쉽고 재미있게.</span>
          </h1>

          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 font-medium break-keep max-w-md">
            검증된 퀀트 전략과 실제 시장 데이터로 주식·경제 감각을 키웁니다.
          </p>

          <div className="mt-8">
            <Link
              href="/screener?mincap=500"
              className="group inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] text-white font-bold text-base shadow-lg shadow-[#16a34a]/25 transition-all hover:-translate-y-0.5"
            >
              <Filter size={18} strokeWidth={2.5} />
              종목 발굴 무료 시작
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

      </section>

      {/* ── 서비스 규모 통계 ─────────────────────────────────────── */}
      <StatsBand />

      {/* ── 온보딩 3단계 ─────────────────────────────────────────── */}
      {STEPS.map((s, i) => (
        <section
          key={s.n}
          className={cn(
            "border-b border-neutral-100 dark:border-[#3a3834]",
            i % 2 === 1 && "bg-[#faf9f7] dark:bg-[#1a1917]"
          )}
        >
          <div className="max-w-4xl mx-auto px-5 py-12 md:py-20 grid md:grid-cols-2 gap-7 md:gap-12 items-center">
            {/* 3D 이미지 */}
            <div className={cn("order-1", i % 2 === 1 ? "md:order-2" : "md:order-1")}>
              <div className={cn("h-52 sm:h-64 rounded-3xl border border-neutral-200/70 dark:border-[#35332e] bg-gradient-to-b overflow-hidden", s.tint)}>
                {s.art}
              </div>
            </div>

            {/* 텍스트 + 단일 CTA */}
            <div className={cn("order-2", i % 2 === 1 ? "md:order-1" : "md:order-2")}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-bold tabular-nums font-[family-name:var(--font-mono)] text-neutral-300 dark:text-neutral-700 shrink-0">
                  {s.n}
                </span>
                <div className="h-px flex-1 bg-neutral-200 dark:bg-[#2c2b27]" />
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#16a34a] shrink-0">
                  {s.tag}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-50 mb-2.5">
                {s.title}
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed break-keep mb-5 max-w-sm">
                {s.desc}
              </p>
              <Link
                href={s.href}
                className="group inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] text-neutral-800 dark:text-neutral-100 font-bold text-sm shadow-sm hover:border-[#16a34a]/50 hover:-translate-y-0.5 transition-all"
              >
                {s.cta}
                <ArrowRight size={14} className="text-[#16a34a] group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </section>
      ))}

      {/* ── CONVERSION CTA (비로그인) ─────────────────────────────── */}
      {!isLoggedIn && !sessionLoading && (
        <section className="py-16 px-5 border-b border-neutral-100 dark:border-[#3a3834] bg-gradient-to-b from-white to-[#f4faf6] dark:from-[#1a1915] dark:to-[#12241c] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 rounded-full bg-[#16a34a]/5 dark:bg-[#16a34a]/5 blur-3xl" />
          </div>
          <div className="max-w-md mx-auto text-center relative">
            <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-50 mb-3 tracking-tight leading-tight">
              발굴한 종목을 모으려면?
            </h2>
            <ul className="space-y-2.5 mb-6 text-left inline-block">
              {[
                "관심 종목 영구 보관 및 분석 이력 저장",
                "스크리너 즐겨찾기 및 포트폴리오 저장",
                "신규 저평가 종목 알림 수신",
              ].map(item => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-neutral-600 dark:text-neutral-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div>
              <Link href="/login"
                className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] text-white font-bold text-sm shadow-md shadow-[#16a34a]/20 transition-all hover:-translate-y-0.5"
              >
                카카오로 무료 시작
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
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
