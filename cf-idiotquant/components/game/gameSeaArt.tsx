"use client";

// 게임 플레이 화면 배경용 3D — 대항해시대 바다 (three.js / WebGL).
// 일렁이는 저폴리 바다 + 노을 글로우 + 먼 범선 실루엣 + 옅은 안개로 항해 분위기.
// 카드/버튼 뒤에 깔리는 앰비언스. 클라이언트 전용, prefers-reduced-motion 시 정적.

import { useEffect, useRef } from "react";
import * as THREE from "three";

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

// 먼 범선 실루엣 (평면 도형 · 카메라를 향함)
function makeShip(mat: THREE.Material, disposables: { dispose: () => void }[]): THREE.Group {
  const g = new THREE.Group();
  const hull = new THREE.Shape();
  hull.moveTo(-1.1, 0.12); hull.lineTo(1.1, 0.12); hull.lineTo(0.78, 0.5); hull.lineTo(-0.78, 0.5); hull.closePath();
  const hullGeo = new THREE.ShapeGeometry(hull);
  const mastGeo = new THREE.PlaneGeometry(0.07, 1.7);
  const sailA = new THREE.Shape(); sailA.moveTo(0, 0.55); sailA.lineTo(0, 2.0); sailA.lineTo(-0.85, 0.6); sailA.closePath();
  const sailB = new THREE.Shape(); sailB.moveTo(0.06, 0.65); sailB.lineTo(0.06, 1.85); sailB.lineTo(0.8, 0.7); sailB.closePath();
  const sailAGeo = new THREE.ShapeGeometry(sailA);
  const sailBGeo = new THREE.ShapeGeometry(sailB);
  disposables.push(hullGeo, mastGeo, sailAGeo, sailBGeo);
  const mast = new THREE.Mesh(mastGeo, mat); mast.position.set(0, 1.35, 0);
  g.add(new THREE.Mesh(hullGeo, mat), mast, new THREE.Mesh(sailAGeo, mat), new THREE.Mesh(sailBGeo, mat));
  return g;
}

export default function GameSeaArt() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const dark = document.documentElement.classList.contains("dark");

    const seaColor = dark ? 0x0c5a48 : 0x18a06f;
    const fogColor = dark ? 0x0a1512 : 0xdff0e6;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(fogColor, 9, 30);

    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 120);
    camera.position.set(0, 1.5, 6);
    camera.lookAt(0, 0.7, -10);

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

    scene.add(new THREE.HemisphereLight(0xfff2d0, dark ? 0x08281f : 0x0a3a2c, 0.9));
    const sun = new THREE.DirectionalLight(0xffe0a0, 1.7);
    sun.position.set(0, 5, -12);
    scene.add(sun);

    // ── 바다 (저폴리 웨이브) ──
    const SEG = 64;
    const seaGeo = new THREE.PlaneGeometry(90, 70, SEG, SEG);
    const seaMat = new THREE.MeshStandardMaterial({ color: seaColor, roughness: 0.62, metalness: 0.12, flatShading: true });
    disposables.push(seaGeo, seaMat);
    const sea = new THREE.Mesh(seaGeo, seaMat);
    sea.rotation.x = -Math.PI / 2;
    scene.add(sea);
    const pos = seaGeo.attributes.position as THREE.BufferAttribute;
    const basePlane = Float32Array.from(pos.array as Float32Array);

    // ── 노을 글로우 ──
    const glowTex = radialTexture(dark ? "rgba(255,180,90,0.5)" : "rgba(255,210,120,0.85)");
    const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: dark ? 0.55 : 0.8, fog: false });
    disposables.push(glowTex, glowMat);
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(16, 16, 1);
    glow.position.set(0, 2.2, -24);
    scene.add(glow);

    // ── 먼 범선 실루엣 2척 ──
    const shipMat = new THREE.MeshBasicMaterial({ color: dark ? 0x082019 : 0x0e5a44, transparent: true, opacity: dark ? 0.9 : 0.7, side: THREE.DoubleSide });
    disposables.push(shipMat);
    const ship1 = makeShip(shipMat, disposables); ship1.position.set(-4.5, 0.1, -16); ship1.scale.setScalar(1.15);
    const ship2 = makeShip(shipMat, disposables); ship2.position.set(6, 0.1, -20); ship2.scale.setScalar(0.85);
    scene.add(ship1, ship2);

    const resize = () => {
      const w = mount.clientWidth || 1, h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const applyWaves = (t: number) => {
      for (let i = 0; i < pos.count; i++) {
        const x = basePlane[i * 3], y = basePlane[i * 3 + 1];
        const wave = Math.sin(x * 0.32 + t) * 0.2 + Math.sin(y * 0.5 + t * 0.8) * 0.16 + Math.sin((x + y) * 0.2 - t * 0.6) * 0.1;
        pos.setZ(i, wave);
      }
      pos.needsUpdate = true;
      seaGeo.computeVertexNormals();
    };

    const clock = new THREE.Clock();
    let raf = 0;
    const render = () => {
      const t = clock.getElapsedTime();
      applyWaves(t);
      ship1.position.y = 0.1 + Math.sin(t * 0.7) * 0.06;
      ship1.rotation.z = Math.sin(t * 0.7) * 0.03;
      ship2.position.y = 0.1 + Math.sin(t * 0.6 + 1.5) * 0.05;
      camera.position.x = Math.sin(t * 0.12) * 0.6;
      camera.position.y = 1.5 + Math.sin(t * 0.18) * 0.12;
      camera.lookAt(0, 0.7, -10);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    if (reduce) {
      applyWaves(0.4);
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
