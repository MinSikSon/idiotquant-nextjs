"use client";

// 좋아요(관심) 종목 기반 "포트폴리오 탄탄함" 3D 레고 타워.
// 종목별 저평가 점수(computeValueScore)로 블록을 만들어, 강한 종목일수록 넓은 블록을 아래(기반)에 쌓는다.
// 색은 게임 등급(메달)과 통일. three.js(WebGL) — 홈 HeroArt 와 동일 패턴.

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { computeValueScore, type ValueTone } from "@/lib/utils/valueScore";
import type { LikedStockItem } from "@/lib/features/stockLikes/stockLikesSlice";

const TIER_HEX: Record<ValueTone, number> = {
  legend: 0x8b5cf6, treasure: 0xf59e0b, diamond: 0x38bdf8, gold: 0xeab308,
  silver: 0xa3a3a3, bronze: 0xf97316, raw: 0xa8a29e, explore: 0xd4d4d4,
};

// 점수 → 블록 폭(스터드 개수). 강할수록 넓은 기반.
const studsFor = (score: number) => (score >= 70 ? 4 : score >= 45 ? 3 : 2);

const MAX_BRICKS = 18; // 타워 높이 상한 (상위 점수 종목 우선)

export default function PortfolioLegoTower({ items }: { items: LikedStockItem[] }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    // 점수 내림차순 → 강한 종목이 아래(기반)
    const bricks = items
      .map(it => ({ tone: computeValueScore(it).tone, score: computeValueScore(it).score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_BRICKS);
    if (bricks.length === 0) return;

    const U = 1;          // 스터드 피치
    const H = 1.15;       // 블록 높이
    const GAP = 0.06;
    const studR = 0.3, studH = 0.24, DEPTH = 2;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
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

    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9a88, 0.55));
    const key = new THREE.DirectionalLight(0xfff4e0, 2.4);
    key.position.set(5, 9, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbfe3ff, 0.9);
    rim.position.set(-6, 4, -5);
    scene.add(rim);

    const tower = new THREE.Group();
    scene.add(tower);

    const studGeo = new THREE.CylinderGeometry(studR, studR, studH, 16);
    disposables.push(studGeo);
    let maxW = 2;

    bricks.forEach((b, i) => {
      const nx = studsFor(b.score);
      maxW = Math.max(maxW, nx);
      const w = nx * U, d = DEPTH * U;
      const color = TIER_HEX[b.tone];
      const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.28 });
      disposables.push(mat);

      const boxGeo = new THREE.BoxGeometry(w - GAP, H - GAP, d - GAP);
      disposables.push(boxGeo);
      const y = i * H + H / 2;
      const brick = new THREE.Mesh(boxGeo, mat);
      brick.position.set(0, y, 0);
      tower.add(brick);

      // 스터드 (nx × 2 격자)
      for (let sx = 0; sx < nx; sx++) {
        for (let sz = 0; sz < DEPTH; sz++) {
          const stud = new THREE.Mesh(studGeo, mat);
          stud.position.set((sx - (nx - 1) / 2) * U, i * H + H + studH / 2 - GAP / 2, (sz - (DEPTH - 1) / 2) * U);
          tower.add(stud);
        }
      }
    });

    const towerH = bricks.length * H;
    tower.position.y = -towerH / 2; // 중앙 정렬

    // 바닥 소프트 섀도
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = shadowCanvas.height = 128;
    const sctx = shadowCanvas.getContext("2d")!;
    const grad = sctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, "rgba(20,40,25,0.5)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    sctx.fillStyle = grad; sctx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    shadowTex.colorSpace = THREE.SRGBColorSpace;
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 });
    const shadowGeo = new THREE.PlaneGeometry(1, 1);
    disposables.push(shadowTex, shadowMat, shadowGeo);
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -towerH / 2 - 0.02;
    shadow.scale.set(maxW * 2.6, DEPTH * 3, 1);
    tower.add(shadow);

    // 카메라 프레이밍 — 타워 높이·폭에 맞춤
    const fit = Math.max(towerH * 0.62, maxW * 1.4);
    const dist = fit / Math.tan((camera.fov * Math.PI) / 180 / 2) + 3.5;
    camera.position.set(dist * 0.05, towerH * 0.08, dist);
    camera.lookAt(0, 0, 0);

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
      tower.rotation.y = t * 0.4;
      tower.position.y = -towerH / 2 + Math.sin(t * 0.8) * 0.12;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    if (reduce) {
      tower.rotation.y = -0.5;
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
  }, [items]);

  return <div ref={mountRef} className="w-full h-full" aria-hidden="true" />;
}
