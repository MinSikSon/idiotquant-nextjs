"use client";

// 게임 종료(항해 종료) 화면용 3D — 대항해시대 보물상자 (three.js / WebGL).
// 뚜껑이 열린 나무 상자 + 금화 + 황금빛 글로우로 "발굴한 보물(수집 카드)"을 표현.
// 클라이언트 전용, prefers-reduced-motion 시 정적 렌더.

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

function radialTexture(inner: string): THREE.CanvasTexture {
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

export default function VoyageArt() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 2.1, 6.2);
    camera.lookAt(0, 0.25, 0);

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

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a5a, 0.55));
    const key = new THREE.DirectionalLight(0xfff0d0, 2.6);
    key.position.set(4, 8, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffd27a, 1.1);
    rim.position.set(-5, 3, -3);
    scene.add(rim);

    // ── 재질 ──
    const wood = new THREE.MeshPhysicalMaterial({ color: 0x7a4a24, roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.5 });
    const iron = new THREE.MeshStandardMaterial({ color: 0x3a3630, metalness: 0.85, roughness: 0.38 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xffca3d, metalness: 0.95, roughness: 0.16, emissive: 0x6a4a08, emissiveIntensity: 0.35 });
    disposables.push(wood, iron, gold);

    const chest = new THREE.Group();
    scene.add(chest);

    const W = 2.6, H = 1.15, D = 1.7;

    // 상자 몸통
    const baseGeo = new THREE.BoxGeometry(W, H, D);
    disposables.push(baseGeo);
    const base = new THREE.Mesh(baseGeo, wood);
    base.position.y = H / 2;
    chest.add(base);

    // 철제 밴드 (앞면 세로 2줄) + 자물쇠
    const bandGeo = new THREE.BoxGeometry(0.18, H + 0.04, D + 0.04);
    disposables.push(bandGeo);
    [-0.7, 0.7].forEach(x => {
      const b = new THREE.Mesh(bandGeo, iron);
      b.position.set(x, H / 2, 0);
      chest.add(b);
    });
    const lockGeo = new THREE.BoxGeometry(0.34, 0.34, 0.12);
    disposables.push(lockGeo);
    const lock = new THREE.Mesh(lockGeo, gold);
    lock.position.set(0, H * 0.5, D / 2 + 0.02);
    chest.add(lock);

    // 뚜껑 (뒤쪽 상단 모서리를 축으로 열림)
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, H, -D / 2);
    const lidGeo = new THREE.BoxGeometry(W, 0.5, D);
    disposables.push(lidGeo);
    const lid = new THREE.Mesh(lidGeo, wood);
    lid.position.set(0, 0.25, D / 2);
    lidPivot.add(lid);
    const lidBand = new THREE.Mesh(bandGeo, iron); // 밴드 재사용(세로) 눕혀서 뚜껑 위
    lidBand.scale.set(1, 0.5 / (H + 0.04), 1);
    lidBand.position.set(0.7, 0.25, D / 2);
    lidPivot.add(lidBand.clone());
    lidBand.position.x = -0.7;
    lidPivot.add(lidBand);
    lidPivot.rotation.x = -1.15; // 열림
    chest.add(lidPivot);

    // 금화 (상자 안에서 넘치는 보물)
    const coinGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.09, 28);
    disposables.push(coinGeo);
    const coinData: [number, number, number, number][] = [
      [-0.5, H + 0.05, 0.2, 0.5], [0.35, H + 0.12, -0.1, -0.4], [0.0, H + 0.2, 0.35, 0.2],
      [-0.15, H + 0.32, -0.2, 1.0], [0.5, H + 0.28, 0.25, -0.7], [-0.55, H + 0.45, -0.05, 0.3],
    ];
    const coins: { m: THREE.Mesh; baseY: number; ph: number }[] = [];
    coinData.forEach(([x, y, z, rot], i) => {
      const m = new THREE.Mesh(coinGeo, gold);
      m.position.set(x, y, z);
      m.rotation.set(Math.PI / 2 - 0.3, rot, rot * 0.5);
      chest.add(m);
      coins.push({ m, baseY: y, ph: i * 1.1 });
    });

    // 황금 글로우 (상자 입구에서 새어나오는 보물빛)
    const glowTex = radialTexture("rgba(255,205,90,0.8)");
    const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.75 });
    disposables.push(glowTex, glowMat);
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(4.2, 4.2, 1);
    glow.position.set(0, H + 0.35, 0.1);
    chest.add(glow);

    // 바닥 소프트 그림자
    const shTex = radialTexture("rgba(30,20,6,0.5)");
    const shMat = new THREE.SpriteMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: 0.5 });
    disposables.push(shTex, shMat);
    const shadow = new THREE.Sprite(shMat);
    shadow.scale.set(5, 1.5, 1);
    shadow.position.set(0, 0.02, 0.2);
    scene.add(shadow);

    chest.position.y = -0.55;

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
      chest.rotation.y = Math.sin(t * 0.5) * 0.28;
      chest.position.y = -0.55 + Math.sin(t * 1.1) * 0.06;
      coins.forEach(({ m, baseY, ph }) => { m.position.y = baseY + Math.sin(t * 1.8 + ph) * 0.05; m.rotation.z += 0.004; });
      glowMat.opacity = 0.6 + Math.sin(t * 2.2) * 0.18;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    if (reduce) {
      chest.rotation.y = 0.28;
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
