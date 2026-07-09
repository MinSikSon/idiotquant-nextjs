"use client";

import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Search, Calculator, Filter, Lock, ArrowRight,
  TrendingUp, ChevronRight, BarChart3, Zap, Layers, Gamepad2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { safeNum } from "@/lib/utils/numbers";
import { STRATEGY_PRESETS_CLIENT, STRATEGY_BADGE, type StrategyPreset } from "@/lib/constants/strategies";

interface PreviewStock {
  ticker: string;
  name: string;
  ncav_ratio: number;
  pbr: number;
  per: number;
  eps: number;
  bps: number;
  strategies: string[];
  market_cap?: number;
}

// 전략별 "핵심 지표" — 그 전략이 보는 지표와 기준 충족 여부. 종목이 설명에 얼마나 부합하는지 표시.
interface StrategyMetric {
  label: string;
  get: (i: PreviewStock) => number;   // 표시값 (0 이하 = 데이터 없음)
  ok: (v: number) => boolean;         // 전략 기준 충족 여부
  fmt: (v: number) => string;
}

// ROE = EPS / BPS × 100 — 스크리너 전략 필터(clientFilter)와 동일한 계산식
const roePct = (i: PreviewStock) => safeNum(i.bps) > 0 ? safeNum(i.eps) / safeNum(i.bps) * 100 : 0;

const STRATEGY_METRICS: Record<string, StrategyMetric[]> = {
  ncav:           [{ label: "NCAV",    get: i => safeNum(i.ncav_ratio), ok: v => v >= 1.0,            fmt: v => `${v.toFixed(2)}x` }],
  near_ncav:      [{ label: "NCAV",    get: i => safeNum(i.ncav_ratio), ok: v => v >= 0.7 && v < 1.0, fmt: v => `${v.toFixed(2)}x` }],
  low_pbr:        [{ label: "PBR",     get: i => safeNum(i.pbr),        ok: v => v > 0 && v < 0.5,    fmt: v => v.toFixed(2) }],
  low_per:        [{ label: "PER",     get: i => safeNum(i.per),        ok: v => v > 0 && v < 10,     fmt: v => v.toFixed(1) }],
  graham_number:  [{ label: "PER×PBR", get: i => safeNum(i.per) > 0 && safeNum(i.pbr) > 0 ? safeNum(i.per) * safeNum(i.pbr) : 0, ok: v => v > 0 && v < 22.5, fmt: v => v.toFixed(1) }],
  s_rim:          [
    { label: "ROE", get: roePct,            ok: v => v > 8,            fmt: v => `${v.toFixed(1)}%` },
    { label: "PBR", get: i => safeNum(i.pbr), ok: v => v > 0 && v < 1.0, fmt: v => v.toFixed(2) },
  ],
  magic_formula:  [
    { label: "PER", get: i => safeNum(i.per), ok: v => v > 0 && v < 15, fmt: v => v.toFixed(1) },
    { label: "ROE", get: roePct,            ok: v => v > 10,           fmt: v => `${v.toFixed(1)}%` },
  ],
  quality_value:  [
    { label: "ROE", get: roePct,            ok: v => v > 15,           fmt: v => `${v.toFixed(1)}%` },
    { label: "PBR", get: i => safeNum(i.pbr), ok: v => v > 0 && v < 2.0, fmt: v => v.toFixed(2) },
  ],
  balanced_value: [
    { label: "PER", get: i => safeNum(i.per), ok: v => v > 5 && v < 15,  fmt: v => v.toFixed(1) },
    { label: "PBR", get: i => safeNum(i.pbr), ok: v => v > 0 && v < 1.5, fmt: v => v.toFixed(2) },
  ],
};

const NCAV_METRIC: StrategyMetric[] = STRATEGY_METRICS.ncav;

const HOME_MKTCAP_MIN = 500;
const PER_STRATEGY = 2;    // 전략 그룹당 노출 종목 수
const GROUP_PUBLIC = 3;    // 비로그인 시 블러 없이 공개하는 전략 그룹 수

// 전략별 정렬 키 (값이 작을수록 상위). NCAV 계열은 비율이 높을수록 좋으므로 음수.
const STRATEGY_SORT: Record<string, (i: PreviewStock) => number> = {
  ncav:           i => -(i.ncav_ratio ?? 0),
  near_ncav:      i => -(i.ncav_ratio ?? 0),
  low_pbr:        i => i.pbr > 0 ? i.pbr : Infinity,
  s_rim:          i => i.pbr > 0 ? i.pbr : Infinity,
  quality_value:  i => i.pbr > 0 ? i.pbr : Infinity,
  balanced_value: i => i.pbr > 0 ? i.pbr : Infinity,
  graham_number:  i => (i.per > 0 && i.pbr > 0) ? i.per * i.pbr : Infinity,
  low_per:        i => i.per > 0 ? i.per : Infinity,
  magic_formula:  i => i.per > 0 ? i.per : Infinity,
};

const STRATEGY_LABEL: Record<string, string> = {
  ncav: "NCAV", low_pbr: "저PBR", low_per: "저PER", s_rim: "S-RIM",
  graham_number: "그레이엄", magic_formula: "마법공식",
  quality_value: "퀄리티", near_ncav: "NCAV근접", balanced_value: "균형가치",
};

const STRATEGY_BADGE_CLS: Record<string, string> = {
  ncav:           "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
  low_pbr:        "bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#15803d] dark:text-[#16a34a] border-[#bbf7d0] dark:border-[#166534]/60",
  low_per:        "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/60",
  s_rim:          "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800/60",
  graham_number:  "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800/60",
  magic_formula:  "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60",
  quality_value:  "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
  near_ncav:      "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60",
  balanced_value: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/60",
};

const FEATURES = [
  {
    icon: Gamepad2,
    iconCls: "text-[#16a34a] dark:text-[#16a34a]",
    bgCls: "bg-[#f0fdf4] dark:bg-[#052e16]/30",
    title: "종목 카드 게임",
    link: "/game",
    linkLabel: "게임하기",
  },
  {
    icon: Filter,
    iconCls: "text-emerald-600 dark:text-emerald-400",
    bgCls: "bg-emerald-50 dark:bg-emerald-950/30",
    title: "종목 발굴",
    link: "/screener",
    linkLabel: "스크리너 열기",
  },
  {
    icon: Search,
    iconCls: "text-violet-600 dark:text-violet-400",
    bgCls: "bg-violet-50 dark:bg-violet-950/30",
    title: "적정주가 분석",
    link: "/analyze",
    linkLabel: "종목 분석하기",
  },
  {
    icon: Calculator,
    iconCls: "text-emerald-600 dark:text-emerald-400",
    bgCls: "bg-emerald-50 dark:bg-emerald-950/30",
    title: "수익 계산기",
    link: "/calculator",
    linkLabel: "계산해보기",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "카드로 종목 비교", accent: "text-[#16a34a]" },
  { step: "02", title: "등급·지표로 가치 감각", accent: "text-emerald-600 dark:text-emerald-400" },
  { step: "03", title: "실제 데이터로 확인", accent: "text-violet-600 dark:text-violet-400" },
];

// =========================================================================
// 홈 3D 일러스트 (three.js / WebGL) — 진짜 3D
// 금속 금화(단위 표시 없음) 2개가 회전하고, 3D 캔들 박스 2개가 좌우에서 떠 움직인다.
// 클라이언트에서만 마운트, prefers-reduced-motion 시 정적 렌더.
// =========================================================================
// 둥근 모서리 3D 슬래브 (core three: Shape + ExtrudeGeometry)
function roundedBoxGeometry(w: number, h: number, d: number, r: number): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const bevel = Math.min(0.045, d * 0.4, r * 0.6);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(0.001, d - bevel * 2), bevelEnabled: true,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1, curveSegments: 14,
  });
  geo.translate(0, 0, -d / 2);
  geo.computeVertexNormals();
  return geo;
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
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    mount.appendChild(canvas);

    const disposables: { dispose: () => void }[] = [];

    // 프리미엄 반사용 실내 환경맵 (PMREM)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();
    disposables.push(envRT.texture);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7a72, 0.6));
    const key = new THREE.DirectionalLight(0xfff2d0, 2.6);
    key.position.set(5, 9, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x86efc0, 1.2);
    rim.position.set(-7, 3, -4);
    scene.add(rim);

    const root = new THREE.Group();
    scene.add(root);
    const BASE = -2;

    // 공용 재질 · 지오메트리
    const upMat = new THREE.MeshPhysicalMaterial({ color: 0x18a94e, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.22, emissive: 0x0b5a2a, emissiveIntensity: 0.14 });
    const dnMat = new THREE.MeshPhysicalMaterial({ color: 0xf04458, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.22, emissive: 0x7a1626, emissiveIntensity: 0.14 });
    const wickMat = new THREE.MeshStandardMaterial({ color: 0x9aa3af, metalness: 0.1, roughness: 0.6 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffca3d, metalness: 0.95, roughness: 0.14, emissive: 0x5a3d06, emissiveIntensity: 0.16 });
    const shadowTex = makeRadialTexture("rgba(3,18,10,0.5)");
    const shGeo = new THREE.PlaneGeometry(1, 1);
    const shMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 });
    const glowTex = makeRadialTexture("rgba(255,205,80,0.55)");
    const haloMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 });
    disposables.push(upMat, dnMat, wickMat, goldMat, shadowTex, shGeo, shMat, glowTex, haloMat);

    // 캔들 스카이라인 — 좌→우 상승 추세, 깊이(z) 배치로 원근감
    const candles: { g: THREE.Group; phase: number }[] = [];
    const N = 15;
    let prev = 1.0;
    for (let i = 0; i < N; i++) {
      const trend = 0.9 + i * 0.12;
      const noise = Math.sin(i * 1.7) * 0.4 + (Math.random() - 0.5) * 0.35;
      const h = Math.max(0.6, trend + noise);
      const up = h >= prev; prev = h;
      const x = (i - (N - 1) / 2) * 1.15;
      const z = -1.5 + Math.sin(i * 0.9) * 1.3 + (Math.random() - 0.5) * 0.6;
      const geo = roundedBoxGeometry(0.5, h, 0.5, 0.09);
      const wickGeo = new THREE.CylinderGeometry(0.03, 0.03, h + 0.7, 8);
      disposables.push(geo, wickGeo);
      const g = new THREE.Group();
      const body = new THREE.Mesh(geo, up ? upMat : dnMat); body.position.y = h / 2;
      const wick = new THREE.Mesh(wickGeo, wickMat); wick.position.y = h / 2;
      const sh = new THREE.Mesh(shGeo, shMat); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.01; sh.scale.set(1.5, 1.5, 1);
      g.add(sh, wick, body);
      g.position.set(x, BASE, z);
      root.add(g);
      candles.push({ g, phase: i * 0.5 });
    }

    // 금화 여러 개 (깊이·크기 다양) — 회전 + 부유 + 글로우 스프라이트
    const coins: { parent: THREE.Group; disc: THREE.Group; spin: number; baseY: number; phase: number }[] = [];
    const coinData: [number, number, number, number][] = [
      [-5.5, 2.6, 1.5, 0.55], [3.4, 3.5, -1.0, 0.42], [6.2, 1.9, 0.4, 0.5],
      [-2.6, 3.9, 0.2, 0.34], [0.8, 3.0, 2.4, 0.38],
    ];
    coinData.forEach(([x, y, z, r], i) => {
      const th = r * 0.22;
      const baseGeo = new THREE.CylinderGeometry(r, r, th, 48);
      const fieldGeo = new THREE.CylinderGeometry(r * 0.8, r * 0.8, th * 1.35, 48);
      disposables.push(baseGeo, fieldGeo);
      const disc = new THREE.Group();
      disc.add(new THREE.Mesh(baseGeo, goldMat), new THREE.Mesh(fieldGeo, goldMat));
      disc.rotation.x = Math.PI / 2;
      const halo = new THREE.Sprite(haloMat);
      halo.scale.set(r * 5, r * 5, 1);
      const g = new THREE.Group();
      g.add(halo, disc);
      g.position.set(x, BASE + y, z);
      root.add(g);
      coins.push({ parent: g, disc, spin: 1.1 + i * 0.25, baseY: BASE + y, phase: i });
    });

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
      const t = clock.getElapsedTime();
      candles.forEach(({ g, phase }) => { g.position.y = BASE + Math.sin(t * 0.9 + phase) * 0.05; });
      coins.forEach(({ parent, disc, spin, baseY, phase }) => {
        disc.rotation.y = t * spin;
        parent.position.y = baseY + Math.sin(t * 0.8 + phase) * 0.18;
      });
      // 완만한 카메라 드리프트(패럴랙스)로 화면 전체가 살아 있게
      camera.position.x = Math.sin(t * 0.08) * 2.4;
      camera.position.y = 2.6 + Math.sin(t * 0.05) * 0.5;
      camera.lookAt(0, 0.4, -1);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    if (reduce) {
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

// 게임 버튼용 3D — 대항해시대 범선 (저폴리 파도·부푼 돛·금화·햇살)
function GameCardArt() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0.4, 1.7, 8.6);
    camera.lookAt(0, 0.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
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

    scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x1c6b3e, 0.7));
    const sun = new THREE.DirectionalLight(0xffe6b0, 2.6);
    sun.position.set(-5, 5, 3);
    scene.add(sun);
    const fillL = new THREE.DirectionalLight(0x9be7bd, 0.9);
    fillL.position.set(4, 2, 4);
    scene.add(fillL);

    // ── 바다 (저폴리 파도) ──
    const seaGeo = new THREE.PlaneGeometry(24, 16, 40, 24);
    const seaMat = new THREE.MeshStandardMaterial({ color: 0x12a35b, roughness: 0.45, flatShading: true });
    disposables.push(seaGeo, seaMat);
    const sea = new THREE.Mesh(seaGeo, seaMat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.55;
    scene.add(sea);
    const seaPos = seaGeo.attributes.position as THREE.BufferAttribute;

    // ── 태양 (뒤 글로우) ──
    const sunGlowTex = makeRadialTexture("rgba(255,213,130,0.9)");
    const sunGlowMat = new THREE.SpriteMaterial({ map: sunGlowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 });
    disposables.push(sunGlowTex, sunGlowMat);
    const sunGlow = new THREE.Sprite(sunGlowMat);
    sunGlow.scale.set(4.4, 4.4, 1);
    sunGlow.position.set(-3.2, 2.5, -4);
    scene.add(sunGlow);
    const sunDiscGeo = new THREE.SphereGeometry(0.55, 24, 16);
    const sunDiscMat = new THREE.MeshBasicMaterial({ color: 0xffdf8a });
    disposables.push(sunDiscGeo, sunDiscMat);
    const sunDisc = new THREE.Mesh(sunDiscGeo, sunDiscMat);
    sunDisc.position.copy(sunGlow.position);
    scene.add(sunDisc);

    // ── 범선 (갤리온) ──
    const ship = new THREE.Group();
    const hullShape = new THREE.Shape();
    hullShape.moveTo(2.5, 0.34);
    hullShape.lineTo(-1.7, 0.12);
    hullShape.lineTo(-2.05, 0.3);
    hullShape.lineTo(-2.35, 0.98);
    hullShape.lineTo(-2.64, 0.92);
    hullShape.lineTo(-2.35, -0.5);
    hullShape.quadraticCurveTo(0.1, -0.96, 2.05, -0.34);
    hullShape.quadraticCurveTo(2.95, -0.04, 2.5, 0.34);
    const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 1.25, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.09, bevelSegments: 2, steps: 1, curveSegments: 18 });
    hullGeo.translate(0, 0, -0.625);
    hullGeo.computeVertexNormals();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x6a3f1e, roughness: 0.55, metalness: 0.05 });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x8a5a2c, roughness: 0.6 });
    disposables.push(hullGeo, hullMat, deckMat);
    ship.add(new THREE.Mesh(hullGeo, hullMat));

    // 선미루(aftcastle)
    const castleGeo = roundedBoxGeometry(0.7, 0.5, 1.1, 0.06);
    disposables.push(castleGeo);
    const castle = new THREE.Mesh(castleGeo, deckMat);
    castle.position.set(-2.1, 0.6, 0);
    ship.add(castle);

    // 금색 현측 장식선 2줄
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xffca3d, metalness: 0.9, roughness: 0.25, emissive: 0x5a3d06, emissiveIntensity: 0.15 });
    disposables.push(trimMat);
    [0.18, 0.0].forEach(ty => {
      const tGeo = new THREE.BoxGeometry(4.9, 0.05, 1.3);
      disposables.push(tGeo);
      const tm = new THREE.Mesh(tGeo, trimMat); tm.position.set(-0.1, ty, 0);
      ship.add(tm);
    });

    // 돛대 · 활대 · 사각돛
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x4a2f16, roughness: 0.6 });
    const sailMat = new THREE.MeshStandardMaterial({ color: 0xf4ead0, roughness: 0.72, side: THREE.DoubleSide });
    disposables.push(mastMat, sailMat);
    const addSail = (parent: THREE.Group, cy: number, w: number, h: number) => {
      const sg = new THREE.PlaneGeometry(w, h, 14, 10);
      const sp = sg.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < sp.count; i++) { const u = sp.getX(i) / w + 0.5, v = sp.getY(i) / h + 0.5; sp.setZ(i, Math.sin(u * Math.PI) * (0.35 + v * 0.25) * 0.62); }
      sg.computeVertexNormals();
      const yardGeo = new THREE.CylinderGeometry(0.03, 0.03, w + 0.24, 8);
      disposables.push(sg, yardGeo);
      const yard = new THREE.Mesh(yardGeo, mastMat); yard.rotation.x = Math.PI / 2; yard.position.y = cy + h / 2;
      const sail = new THREE.Mesh(sg, sailMat); sail.rotation.y = Math.PI / 2; sail.position.y = cy;
      parent.add(yard, sail);
    };
    const makeMast = (x: number, mh: number, specs: [number, number, number][]) => {
      const g = new THREE.Group();
      const mastGeo = new THREE.CylinderGeometry(0.045, 0.06, mh, 10);
      disposables.push(mastGeo);
      const mast = new THREE.Mesh(mastGeo, mastMat); mast.position.y = mh / 2;
      g.add(mast);
      specs.forEach(([cy, w, h]) => addSail(g, cy, w, h));
      g.position.set(x, 0.26, 0);
      ship.add(g);
    };
    makeMast(1.35, 2.35, [[0.98, 1.28, 1.02], [1.92, 0.9, 0.66]]);  // 앞돛대: 큰돛 + 윗돛
    makeMast(0.15, 3.0, [[1.12, 1.55, 1.28], [2.35, 1.05, 0.78]]);  // 주돛대(제일 큼)
    makeMast(-1.05, 2.15, [[0.95, 1.12, 0.94]]);                    // 뒷돛대

    // 선수 사장(bowsprit) + 삼각 지브
    const bspGeo = new THREE.CylinderGeometry(0.03, 0.045, 1.5, 8);
    disposables.push(bspGeo);
    const bowsprit = new THREE.Mesh(bspGeo, mastMat);
    bowsprit.position.set(2.95, 0.55, 0); bowsprit.rotation.z = Math.PI / 2 - 0.55;
    ship.add(bowsprit);
    const jibShape = new THREE.Shape();
    jibShape.moveTo(0, 0); jibShape.lineTo(1.1, 0.1); jibShape.lineTo(0.1, 1.05); jibShape.lineTo(0, 0);
    const jibGeo = new THREE.ShapeGeometry(jibShape);
    disposables.push(jibGeo);
    const jib = new THREE.Mesh(jibGeo, sailMat);
    jib.position.set(1.95, 0.55, 0); jib.rotation.y = Math.PI / 2;
    ship.add(jib);

    // 페넌트 깃발
    const flagGeo = new THREE.ConeGeometry(0.11, 0.5, 3);
    const flagMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5, side: THREE.DoubleSide });
    disposables.push(flagGeo, flagMat);
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.rotation.z = -Math.PI / 2; flag.position.set(0.15, 3.5, 0);
    ship.add(flag);

    ship.position.set(0.1, -0.12, 0);
    ship.rotation.y = -0.32;
    ship.rotation.z = 0.04;
    scene.add(ship);

    // ── 뱃머리 물보라 & 항적 (흰 포말 스프라이트) ──
    const foamTex = makeRadialTexture("rgba(255,255,255,0.92)");
    const foamMat = new THREE.SpriteMaterial({ map: foamTex, transparent: true, depthWrite: false, opacity: 0.85 });
    const wakeMat = new THREE.SpriteMaterial({ map: foamTex, transparent: true, depthWrite: false, opacity: 0.5 });
    disposables.push(foamTex, foamMat, wakeMat);
    const foams: { s: THREE.Sprite; by: number; sc: number; ph: number }[] = [];
    // 뱃머리 물보라 (선수에서 크게 부서지는 하얀 파도)
    ([[2.95, -0.18, 1.25, 0.35], [2.6, -0.3, 1.05, 0.0], [3.15, -0.32, 0.85, -0.4], [2.35, -0.36, 0.9, 0.6], [3.05, 0.05, 0.7, 0.1]] as [number, number, number, number][]).forEach(([x, y, sc, z], i) => {
      const s = new THREE.Sprite(foamMat); s.scale.set(sc, sc * 0.7, 1); s.position.set(x, y, z);
      scene.add(s); foams.push({ s, by: y, sc, ph: i * 1.1 });
    });
    // 항적 (선미 뒤로 길게 퍼지는 흰 물줄기)
    ([[-2.5, -0.32, 0.85, 0.15], [-3.2, -0.34, 0.72, -0.45], [-3.95, -0.36, 0.58, 0.3], [-4.7, -0.38, 0.44, -0.2], [-5.4, -0.4, 0.32, 0.1]] as [number, number, number, number][]).forEach(([x, y, sc, z], i) => {
      const s = new THREE.Sprite(wakeMat); s.scale.set(sc, sc * 0.5, 1); s.position.set(x, y, z);
      scene.add(s); foams.push({ s, by: y, sc, ph: 2 + i * 0.9 });
    });

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
    const animateSea = (t: number) => {
      for (let i = 0; i < seaPos.count; i++) {
        const x = seaPos.getX(i), y = seaPos.getY(i);
        seaPos.setZ(i, Math.sin(x * 0.7 + t) * 0.16 + Math.sin(y * 0.9 + t * 0.8) * 0.12);
      }
      seaPos.needsUpdate = true;
      seaGeo.computeVertexNormals();
    };
    const render = () => {
      const t = clock.getElapsedTime();
      animateSea(t);
      ship.position.y = -0.12 + Math.sin(t * 1.3) * 0.05;
      ship.rotation.z = 0.04 + Math.sin(t * 0.9) * 0.03;
      ship.rotation.x = Math.sin(t * 0.7 + 1) * 0.025;
      ship.rotation.y = -0.32 + Math.sin(t * 0.12) * 0.06;
      foams.forEach(({ s, by, sc, ph }) => {
        const p = (Math.sin(t * 2.4 + ph) + 1) / 2;
        s.position.y = by + Math.sin(t * 1.8 + ph) * 0.05;
        s.scale.set(sc * (0.85 + p * 0.3), sc * 0.7 * (0.85 + p * 0.3), 1);
      });
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    if (reduce) {
      animateSea(0.6);
      ship.rotation.y = -0.3;
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

// 1단계: 여러 종목 중 좋은 하나를 돋보기로 집어냄
function StepScanArt() {
  const dots = [[14, 14], [26, 14], [38, 14], [14, 26], [26, 26], [38, 26], [14, 38], [26, 38]];
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="w-11 h-11 shrink-0 text-neutral-300 dark:text-neutral-600">
      {dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="currentColor" />)}
      <circle cx="40" cy="40" r="3.2" fill="#16a34a" />
      <circle cx="40" cy="40" r="13" stroke="#16a34a" strokeWidth="3.5" fill="none" />
      <line x1="49" y1="49" x2="57" y2="57" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

// 2단계: 많은 후보를 걸러 좋은 종목만 통과 (깔때기 + 체크)
function StepFunnelArt() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="w-11 h-11 shrink-0 text-neutral-300 dark:text-neutral-600">
      <circle cx="20" cy="12" r="3" fill="currentColor" />
      <circle cx="32" cy="12" r="3" fill="currentColor" />
      <circle cx="44" cy="12" r="3" fill="currentColor" />
      <path d="M14,22 H50 L38,38 V46 H26 V38 Z" stroke="#16a34a" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="32" cy="54" r="8" fill="#16a34a" />
      <path d="M28,54 l3,3 l5,-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 3단계: 적정주가(₩) 확인 완료 (체크)
function StepTagArt() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="w-11 h-11 shrink-0 text-neutral-300 dark:text-neutral-600">
      <circle cx="28" cy="30" r="16" stroke="currentColor" strokeWidth="2.5" />
      <text x="28" y="36" textAnchor="middle" fontSize="17" fontWeight="800" fill="#16a34a" fontFamily="sans-serif">₩</text>
      <circle cx="46" cy="44" r="9" fill="#16a34a" />
      <path d="M42,44 l3,3 l5,-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STEP_ARTS = [StepScanArt, StepFunnelArt, StepTagArt];

function useCountUp(target: number, duration = 1000) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * ease));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return count;
}

function StockRow({ item, index, excludeStrategy, metrics }: { item: PreviewStock; index: number; excludeStrategy?: string; metrics: StrategyMetric[] }) {
  const strategies = (item.strategies ?? []).filter(s => s !== excludeStrategy).slice(0, 2);

  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100 dark:border-[#35332e] last:border-0 transition-colors">
      <span className="w-4 text-[10px] font-black text-neutral-300 dark:text-neutral-600 tabular-nums shrink-0">
        {index + 1}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-50 truncate leading-tight">
            {item.name}
          </p>
          {strategies.map(s => (
            <span key={s} className={cn(
              "text-[9px] font-extrabold px-1.5 py-0.5 rounded border leading-none",
              STRATEGY_BADGE_CLS[s] ?? "bg-neutral-100 text-neutral-500 border-neutral-200"
            )}>
              {STRATEGY_LABEL[s] ?? s}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-neutral-400 font-mono">{item.ticker}</p>
      </div>

      {/* 전략 핵심 지표 — 기준 충족 시 초록, 미달 회색, 데이터 없으면 — */}
      <div className="shrink-0 flex items-center gap-3 sm:gap-4">
        {metrics.map(m => {
          const v = m.get(item);
          const has = v > 0;
          const ok = has && m.ok(v);
          return (
            <div key={m.label} className="text-right min-w-[48px]">
              <p className={cn(
                "text-sm font-black font-mono tabular-nums",
                !has ? "text-neutral-300 dark:text-neutral-600"
                  : ok ? "text-emerald-600 dark:text-emerald-400"
                  : "text-neutral-500 dark:text-neutral-400"
              )}>
                {has ? m.fmt(v) : "—"}
              </p>
              <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">{m.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StrategyGroup({ preset, stocks }: { preset: StrategyPreset; stocks: PreviewStock[] }) {
  const metrics = STRATEGY_METRICS[preset.id] ?? NCAV_METRIC;
  return (
    <div className="border-b border-neutral-100 dark:border-[#35332e] last:border-0">
      <div className="px-4 py-2.5 bg-[#fcfaf7] dark:bg-[#1f1e1b] flex items-center gap-2">
        <span className={cn(
          "text-[11px] font-extrabold px-2 py-0.5 rounded shrink-0",
          STRATEGY_BADGE[preset.id] ?? "bg-neutral-100 text-neutral-500"
        )}>
          {preset.label}
        </span>
        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate break-keep">
          {preset.plain}
        </span>
      </div>
      {stocks.map((item, i) => (
        <StockRow key={`${preset.id}-${item.ticker}`} item={item} index={i} excludeStrategy={preset.id} metrics={metrics} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const isLoggedIn = !!session;
  const sessionLoading = status === "loading";

  const [preview, setPreview] = useState<{
    items: PreviewStock[];
    total: number;
    filteredTotal: number;
    scanDate: string | null;
    loading: boolean;
  }>({ items: [], total: 0, filteredTotal: 0, scanDate: null, loading: true });

  useEffect(() => {
    fetch("/api/proxy/scan/daily?strategy=all&limit=2500&sort=ncav_ratio&order=desc")
      .then(r => r.json())
      .then((data: any) => {
        if (data.success) {
          const all: PreviewStock[] = data.data;
          const filtered = all.filter(item => (item.market_cap ?? 0) >= HOME_MKTCAP_MIN);
          setPreview({
            items: filtered,
            total: data.meta.total,
            filteredTotal: filtered.length,
            scanDate: data.meta.scanDate,
            loading: false,
          });
        } else {
          setPreview(p => ({ ...p, loading: false }));
        }
      })
      .catch(() => setPreview(p => ({ ...p, loading: false })));
  }, []);

  // 전략별 상위 PER_STRATEGY개 그룹 (종목 없는 전략은 제외)
  const groups = STRATEGY_PRESETS_CLIENT.map(preset => {
    const sortFn = STRATEGY_SORT[preset.id] ?? (i => -(i.ncav_ratio ?? 0));
    const stocks = preview.items
      .filter(it => it.strategies?.includes(preset.id))
      .sort((a, b) => sortFn(a) - sortFn(b))
      .slice(0, PER_STRATEGY);
    return { preset, stocks };
  }).filter(g => g.stocks.length > 0);

  const visibleGroups = isLoggedIn ? groups : groups.slice(0, GROUP_PUBLIC);
  const lockedGroups = isLoggedIn ? [] : groups.slice(GROUP_PUBLIC);

  const formattedDate = preview.scanDate
    ? `${preview.scanDate.slice(0, 4)}.${preview.scanDate.slice(4, 6)}.${preview.scanDate.slice(6, 8)}`
    : null;

  const animatedTotal = useCountUp(preview.loading ? 0 : preview.total);
  const animatedFiltered = useCountUp(preview.loading ? 0 : preview.filteredTotal);

  return (
    <div className="min-h-screen">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[86vh] flex flex-col border-b border-neutral-200/70 dark:border-[#3a3834] bg-gradient-to-b from-[#f4faf6] to-white dark:from-[#12241c] dark:to-[#1a1915]">
        {/* 풀블리드 3D 씬 (화면 전체) */}
        <div className="absolute inset-0">
          <HeroArt />
        </div>
        {/* 가독성 스크림 — 위·아래는 배경색, 가운데는 투명해 3D가 보이게 */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#f4faf6] via-[#f4faf6]/5 to-[#f4faf6] dark:from-[#12241c] dark:via-transparent dark:to-[#1a1915]" />

        {/* 텍스트 오버레이 (상단) */}
        <div className="relative z-10 max-w-3xl mx-auto w-full px-5 pt-16 sm:pt-24 md:pt-28">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 dark:bg-[#242320]/70 backdrop-blur border border-neutral-200 dark:border-[#35332e] mb-5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            게임으로 배우는 주식·경제
          </div>

          <h1 className="text-[2.3rem] sm:text-[3.2rem] md:text-[4rem] font-black leading-[1.06] tracking-tight mb-4 text-neutral-900 dark:text-neutral-50">
            주식이 게임처럼,<br />
            <span className="bg-gradient-to-r from-[#16a34a] to-emerald-500 dark:from-[#22c55e] dark:to-emerald-400 bg-clip-text text-transparent">쉽고 재미있게.</span>
          </h1>

          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 font-medium break-keep max-w-md">
            종목 카드 게임으로 시작해, 실제 시장 데이터로 주식·경제 감각을 키웁니다.
          </p>
        </div>

        {/* 스탯 (하단 오버레이) */}
        <div className="relative z-10 mt-auto">
          {!preview.loading && preview.total > 0 && (
            <div className="max-w-3xl mx-auto px-5 pb-9 pt-4 grid grid-cols-3 gap-2.5 sm:gap-3">
              <div className="rounded-2xl bg-white/70 dark:bg-[#242320]/70 backdrop-blur border border-neutral-200/70 dark:border-[#35332e] shadow-sm px-2 py-4 text-center">
                <p className="text-xl sm:text-2xl font-black text-[#16a34a] dark:text-[#16a34a] tabular-nums leading-none">
                  {animatedTotal.toLocaleString()}
                </p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium mt-1.5">최근 발굴 종목</p>
              </div>
              <div className="rounded-2xl bg-white/70 dark:bg-[#242320]/70 backdrop-blur border border-neutral-200/70 dark:border-[#35332e] shadow-sm px-2 py-4 text-center">
                <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
                  {animatedFiltered.toLocaleString()}
                </p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium mt-1.5">시총 500억+</p>
              </div>
              <div className="rounded-2xl bg-white/70 dark:bg-[#242320]/70 backdrop-blur border border-neutral-200/70 dark:border-[#35332e] shadow-sm px-2 py-4 text-center">
                <p className="text-base sm:text-lg font-black text-neutral-700 dark:text-neutral-200 tabular-nums leading-none mt-1">
                  {formattedDate ?? "—"}
                </p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium mt-1.5">업데이트</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── GAME BANNER (3D 종목 카드 · 게임 입구) ─────────────────── */}
      <Link href="/game" className="group relative flex h-44 sm:h-60 overflow-hidden border-b border-neutral-200/70 dark:border-[#3a3834] bg-gradient-to-b from-[#eaf5ee] to-white dark:from-[#0e2019] dark:to-[#1a1915]">
        <GameCardArt />
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/85 dark:bg-[#242320]/85 backdrop-blur border border-neutral-200 dark:border-[#35332e] text-xs font-black text-[#15803d] dark:text-[#16a34a] shadow-sm group-hover:scale-105 transition-transform">
          ⛵ 가치를 향한 항해 — 종목 카드 게임 <ChevronRight size={13} />
        </span>
      </Link>

      {/* ── TODAY'S PICKS ─────────────────────────────────────────── */}
      <section className="py-10 px-5 md:py-14">
        <div className="max-w-3xl mx-auto">

          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-neutral-900 dark:text-neutral-50">
                  최근 발굴 종목
                </h2>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#16a34a] text-white">
                  500억+
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1 break-keep">게임 카드로도 만나는 실제 저평가 종목</p>
            </div>
            <Link
              href="/screener?mincap=500"
              className="flex items-center gap-0.5 text-xs font-bold text-[#16a34a] dark:text-[#16a34a] whitespace-nowrap"
            >
              전체 보기 <ChevronRight size={13} />
            </Link>
          </div>

          {/* Stock list card */}
          <div className="rounded-2xl border border-neutral-200 dark:border-[#35332e] overflow-hidden bg-white dark:bg-[#242320] shadow-sm">
            {/* Column headers */}
            <div className="px-4 py-2 bg-[#fcfaf7] dark:bg-[#1f1e1b] border-b border-neutral-100 dark:border-[#35332e] flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">종목</span>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">전략 지표</span>
            </div>

            {preview.loading ? (
              <div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100 dark:border-[#35332e] last:border-0">
                    <div className="w-4 h-3 rounded bg-neutral-100 dark:bg-[#2c2b27] animate-pulse shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="h-3.5 w-32 rounded bg-neutral-200/80 dark:bg-[#35332e] animate-pulse" />
                      <div className="h-2.5 w-16 rounded bg-neutral-100 dark:bg-[#2c2b27] animate-pulse" />
                    </div>
                    <div className="h-7 w-12 rounded-md bg-neutral-200/80 dark:bg-[#35332e] animate-pulse shrink-0" />
                  </div>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="py-10 text-center">
                <BarChart3 size={24} className="text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                <p className="text-xs text-neutral-400">스캔 데이터가 없습니다.</p>
              </div>
            ) : (
              <>
                {visibleGroups.map(g => (
                  <StrategyGroup key={g.preset.id} preset={g.preset} stocks={g.stocks} />
                ))}

                {/* Locked groups */}
                {lockedGroups.length > 0 && (
                  <div className="relative">
                    <div className="blur-sm select-none pointer-events-none">
                      {lockedGroups.map(g => (
                        <StrategyGroup key={g.preset.id} preset={g.preset} stocks={g.stocks} />
                      ))}
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/40 to-white/90 dark:from-[#242320]/40 dark:to-[#242320]/95">
                      <Link
                        href="/login"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-bold shadow-md shadow-[#16a34a]/20 transition-all"
                      >
                        <Lock size={13} />
                        로그인하여 {groups.length}개 전략 전체 확인
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                )}

                {isLoggedIn && (
                  <div className="px-4 py-3 bg-[#f0fdf4] dark:bg-[#052e16]/20 border-t border-[#dcfce7] dark:border-[#14532d]/40 flex items-center justify-between gap-3">
                    <p className="text-xs text-[#15803d] dark:text-[#16a34a] font-medium">
                      전체 <span className="font-black">{preview.filteredTotal}개</span> 종목을 필터·정렬로 탐색하세요.
                    </p>
                    <Link
                      href="/screener?mincap=500"
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#16a34a] text-white text-xs font-bold hover:bg-[#15803d] transition-colors whitespace-nowrap"
                    >
                      스크리너 <ChevronRight size={10} />
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── STRATEGIES ───────────────────────────────────────────── */}
      <section className="py-10 px-5 md:py-14 border-t border-neutral-100 dark:border-[#3a3834]">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-5 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers size={13} className="text-[#16a34a]" strokeWidth={2.5} />
                <h2 className="text-base font-black text-neutral-900 dark:text-neutral-50">9가지 퀀트 전략</h2>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STRATEGY_PRESETS_CLIENT.map(s => (
              <Link
                key={s.id}
                href={`/screener?strategies=${s.id}&mincap=500`}
                className="group p-4 rounded-2xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] hover:border-[#16a34a]/50 dark:hover:border-[#16a34a]/40 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-[11px] font-extrabold px-2 py-0.5 rounded",
                    STRATEGY_BADGE[s.id] ?? "bg-neutral-100 text-neutral-500"
                  )}>
                    {s.label}
                  </span>
                  <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600 group-hover:text-[#16a34a] group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-neutral-700 dark:text-neutral-200 font-medium leading-relaxed break-keep">
                  {s.plain}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="py-10 px-5 md:py-14 border-t border-neutral-100 dark:border-[#3a3834] bg-[#faf9f7] dark:bg-[#1a1917]">
        <div className="max-w-3xl mx-auto">
          <div className="mb-7">
            <div className="flex items-center gap-2">
              <Zap size={13} className="text-[#16a34a]" strokeWidth={2.5} />
              <h2 className="text-base font-black text-neutral-900 dark:text-neutral-50">이렇게 배웁니다</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((step, i) => {
              const Art = STEP_ARTS[i];
              return (
                <div key={i} className="p-5 rounded-2xl bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e]">
                  <div className="flex items-center gap-3 mb-3">
                    <Art />
                    <span className={cn("text-xs font-black tabular-nums", step.accent)}>{step.step}</span>
                  </div>
                  <p className="text-sm font-black text-neutral-900 dark:text-neutral-50">{step.title}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section className="py-10 px-5 md:py-14 border-t border-neutral-100 dark:border-[#3a3834]">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h2 className="text-base font-black text-neutral-900 dark:text-neutral-50">주요 기능</h2>
          </div>

          {/* Mobile: horizontal scroll, Desktop: 3-col grid */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="shrink-0 w-56 sm:w-auto bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] p-5 flex flex-col gap-4"
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", f.bgCls)}>
                    <Icon size={16} className={f.iconCls} strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-neutral-900 dark:text-neutral-50">{f.title}</p>
                  </div>
                  <Link href={f.link}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#16a34a] dark:text-[#16a34a]"
                  >
                    {f.linkLabel} <ChevronRight size={11} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CONVERSION CTA (비로그인) ─────────────────────────────── */}
      {!isLoggedIn && !sessionLoading && (
        <section className="py-16 px-5 border-t border-neutral-100 dark:border-[#3a3834] bg-gradient-to-b from-[#faf9f7] to-white dark:from-[#1a1917] dark:to-[#1f1e1b] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 rounded-full bg-[#16a34a]/5 dark:bg-[#16a34a]/4 blur-3xl" />
          </div>
          <div className="max-w-3xl mx-auto text-center relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0fdf4] dark:bg-[#052e16]/40 border border-[#dcfce7] dark:border-[#14532d]/60 mb-4 text-[11px] font-semibold text-[#15803d] dark:text-[#16a34a]">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16a34a] opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#16a34a]" />
              </span>
              무료로 시작하세요
            </div>
            <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-50 mb-6 tracking-tight leading-tight">
              지금 바로 게임으로<br />주식·경제를 배워보세요
            </h2>
            <Link href="/login"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] text-white font-bold text-sm shadow-md shadow-[#16a34a]/20 transition-all"
            >
              카카오로 무료 시작
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-100 dark:border-[#3a3834] bg-white dark:bg-[#1f1e1b]">
        <div className="max-w-3xl mx-auto px-5 py-6 flex items-center justify-between gap-4">
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
              { label: "🃏 게임", href: "/game" },
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
