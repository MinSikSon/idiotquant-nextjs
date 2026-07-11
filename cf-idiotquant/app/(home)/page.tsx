"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Gamepad2, ArrowRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

// =========================================================================
// 홈 3D 일러스트 (three.js / WebGL)
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

// 게임 스텝용 3D — 심플 글로시 돛단배 아이콘 (isolated 스타일 · 소프트 그림자)
function GameCardArt() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0.2, 1.35, 8.9);
    camera.lookAt(0, 0.75, 0);

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

    scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe6ee, 0.65));
    const sun = new THREE.DirectionalLight(0xfff2dc, 2.4);
    sun.position.set(-4, 6, 5);
    scene.add(sun);
    const fillL = new THREE.DirectionalLight(0xdfeeff, 0.7);
    fillL.position.set(5, 2, 3);
    scene.add(fillL);

    // ── 소프트 그림자 (바닥 대신 · isolated 느낌) ──
    const shadowTex = makeRadialTexture("rgba(16,60,40,0.55)");
    const shadowMat = new THREE.SpriteMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 });
    disposables.push(shadowTex, shadowMat);
    const shadow = new THREE.Sprite(shadowMat);
    shadow.scale.set(5.6, 1.6, 1);
    shadow.position.set(0, -1.05, -0.3);
    scene.add(shadow);

    // ── 심플 글로시 돛단배 ──
    const boat = new THREE.Group();
    const gloss = (color: number, extra: THREE.MeshPhysicalMaterialParameters = {}) => {
      const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.18, ...extra });
      disposables.push(m); return m;
    };

    // 선체 (둥근 플라스틱)
    const hullShape = new THREE.Shape();
    hullShape.moveTo(1.85, 0.42);
    hullShape.lineTo(-1.7, 0.42);
    hullShape.lineTo(-1.5, 0.05);
    hullShape.quadraticCurveTo(0, -0.72, 1.5, 0.05);
    hullShape.lineTo(1.85, 0.42);
    const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 1.15, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.14, bevelSegments: 4, steps: 1, curveSegments: 20 });
    hullGeo.translate(0, 0, -0.575);
    hullGeo.computeVertexNormals();
    disposables.push(hullGeo);
    boat.add(new THREE.Mesh(hullGeo, gloss(0xe0492c, { roughness: 0.28 })));

    // 흰색 갑판 트림
    const trimGeo = roundedBoxGeometry(3.4, 0.16, 1.34, 0.07);
    disposables.push(trimGeo);
    const trim = new THREE.Mesh(trimGeo, gloss(0xfff6ec, { clearcoatRoughness: 0.1 }));
    trim.position.set(0.05, 0.42, 0);
    boat.add(trim);

    // 돛대
    const mastMat = gloss(0xdcbf94, { roughness: 0.5, clearcoat: 0.5 });
    const mastGeo = new THREE.CylinderGeometry(0.06, 0.075, 2.5, 14);
    disposables.push(mastGeo);
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(0.1, 1.6, 0);
    boat.add(mast);

    // 삼각돛 2개 (솔리드 3D 패널)
    const sailMat = gloss(0xfdf1da, { roughness: 0.55, clearcoat: 0.4, side: THREE.DoubleSide });
    const jibMat = gloss(0xffd7c2, { roughness: 0.55, clearcoat: 0.4, side: THREE.DoubleSide });
    const mkSail = (pts: [number, number][], mat: THREE.Material, depth = 0.08) => {
      const s = new THREE.Shape();
      s.moveTo(pts[0][0], pts[0][1]); s.lineTo(pts[1][0], pts[1][1]); s.lineTo(pts[2][0], pts[2][1]); s.lineTo(pts[0][0], pts[0][1]);
      const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, steps: 1 });
      g.translate(0, 0, -depth / 2);
      disposables.push(g);
      const m = new THREE.Mesh(g, mat); m.position.set(0.1, 0, 0);
      boat.add(m);
    };
    mkSail([[0, 0.2], [0, 2.65], [-1.4, 0.25]], sailMat);   // 메인 돛 (뒤)
    mkSail([[0, 0.4], [0, 2.45], [1.3, 0.35]], jibMat);     // 지브 (앞)

    // 깃발
    const flagGeo = new THREE.ConeGeometry(0.13, 0.52, 3);
    disposables.push(flagGeo);
    const flag = new THREE.Mesh(flagGeo, gloss(0x16a34a, { roughness: 0.45 }));
    flag.rotation.z = -Math.PI / 2; flag.position.set(0.35, 2.8, 0);
    boat.add(flag);

    boat.position.set(0, -0.15, 0);
    scene.add(boat);

    // ── 물결 컬 (심플 흰 포말) ──
    const foamTex = makeRadialTexture("rgba(255,255,255,0.9)");
    const foamMat = new THREE.SpriteMaterial({ map: foamTex, transparent: true, depthWrite: false, opacity: 0.85 });
    disposables.push(foamTex, foamMat);
    const foams: { s: THREE.Sprite; by: number; sc: number; ph: number }[] = [];
    ([[1.85, -0.32, 0.66], [-1.75, -0.34, 0.6], [2.2, -0.14, 0.42], [-2.15, -0.18, 0.4]] as [number, number, number][]).forEach(([x, y, sc], i) => {
      const s = new THREE.Sprite(foamMat); s.scale.set(sc, sc * 0.6, 1); s.position.set(x, y, 0.15);
      scene.add(s); foams.push({ s, by: y, sc, ph: i * 1.3 });
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
    const render = () => {
      const t = clock.getElapsedTime();
      boat.position.y = -0.15 + Math.sin(t * 1.4) * 0.08;
      boat.rotation.z = Math.sin(t * 1.1) * 0.05;
      boat.rotation.y = Math.sin(t * 0.35) * 0.16;
      foams.forEach(({ s, by, sc, ph }) => {
        const p = (Math.sin(t * 2.6 + ph) + 1) / 2;
        s.position.y = by + Math.sin(t * 2.0 + ph) * 0.04;
        s.scale.set(sc * (0.85 + p * 0.3), sc * 0.6 * (0.85 + p * 0.3), 1);
      });
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    if (reduce) {
      boat.rotation.y = 0.1;
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

// 순차 온보딩 3단계 — 각 단계는 3D 이미지 + 한 줄 설명 + 단일 CTA
const STEPS: {
  n: string; tag: string; title: string; desc: string; cta: string; href: string;
  art: React.ReactNode; tint: string;
}[] = [
  {
    n: "01", tag: "PLAY", title: "카드 게임으로 시작",
    desc: "두 종목을 비교하는 카드 게임으로 가치투자 감각을 놀이처럼 익혀요. 회원가입 없이 바로 시작합니다.",
    cta: "게임 시작하기", href: "/game", art: <GameCardArt />,
    tint: "from-[#eaf5ee] to-white dark:from-[#0e2019] dark:to-[#161511]",
  },
  {
    n: "02", tag: "DISCOVER", title: "저평가 종목 발굴",
    desc: "게임으로 익힌 감각을 실제 시장에. 검증된 퀀트 전략으로 숨어 있는 저평가 종목을 스캔해요.",
    cta: "종목 발굴하기", href: "/screener?mincap=500", art: <SpinArt kind="coin" />,
    tint: "from-[#fdf6e9] to-white dark:from-[#241d0e] dark:to-[#161511]",
  },
  {
    n: "03", tag: "ANALYZE", title: "적정주가 분석",
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
        {/* 가독성 스크림 */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#f4faf6] via-[#f4faf6]/5 to-[#f4faf6] dark:from-[#12241c] dark:via-transparent dark:to-[#1a1915]" />

        {/* 텍스트 오버레이 */}
        <div className="relative z-10 max-w-3xl mx-auto w-full px-5 pt-20 sm:pt-28 md:pt-32">
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

          <div className="mt-8">
            <Link
              href="/game"
              className="group inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] text-white font-bold text-base shadow-lg shadow-[#16a34a]/25 transition-all hover:-translate-y-0.5"
            >
              <Gamepad2 size={18} strokeWidth={2.5} />
              게임으로 무료 시작
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
              발굴한 카드를 모으려면?
            </h2>
            <ul className="space-y-2.5 mb-6 text-left inline-block">
              {[
                "게임에서 발굴한 종목 카드 영구 보관",
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
              { label: "게임", href: "/game" },
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
