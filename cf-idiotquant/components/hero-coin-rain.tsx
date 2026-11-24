"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useAppSelector } from "@/lib/hooks";
import { selectTheme } from "@/lib/features/control/controlSlice";

function makeGoldStudioEnv(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 512;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.000, "#fff6e2");
  g.addColorStop(0.340, "#ffeec8");
  g.addColorStop(0.470, "#ffdf9e");
  g.addColorStop(0.500, "#fff2cf");
  g.addColorStop(0.505, "#7c5a22");
  g.addColorStop(1.000, "#4d3714");
  x.fillStyle = g;
  x.fillRect(0, 0, 1024, 512);
  x.fillStyle = "#fff8e6";
  for (const [px, py, w, h] of [[120, 60, 300, 110], [560, 30, 230, 80], [860, 150, 170, 70]]) {
    x.fillRect(px, py, w, h);
  }
  const wg = x.createLinearGradient(0, 512, 0, 300);
  wg.addColorStop(0, "rgba(255,196,90,.5)");
  wg.addColorStop(1, "rgba(255,196,90,0)");
  x.fillStyle = wg;
  x.fillRect(0, 300, 1024, 212);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex);
  pmrem.dispose();
  tex.dispose();
  return env;
}

const COIN_BODY = new THREE.Color(0xffdd80);
const COIN_RIM = new THREE.Color(0xc9911d);
function paint(geo: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = color.r; arr[i * 3 + 1] = color.g; arr[i * 3 + 2] = color.b; }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return geo;
}
const COIN_TH = 0.14;
function makeCoinGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    paint(new THREE.CylinderGeometry(1, 1, COIN_TH, 64), COIN_RIM),
    paint(new THREE.CylinderGeometry(0.82, 0.82, COIN_TH * 1.28, 64), COIN_BODY),
  ];
  const merged = mergeGeometries(parts, false)!;
  parts.forEach(p => p.dispose());
  return merged;
}

// 동전은 선택지 가운데와 좌우 가장자리에서 서로 다른 속도로 떨어진다.
const COINS = [
  { lane: 0.13, size: 1, phase: 0.40, duration: 7.5, spin: 0.72 },
  { lane: 0.50, size: 0.78, phase: 0.64, duration: 8.8, spin: -0.58 },
  { lane: 0.87, size: 0.94, phase: 0.30, duration: 8.2, spin: 0.65 },
] as const;

export default function HeroCoinRain({ coinScale = 1 }: { coinScale?: number }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const theme = useAppSelector(selectTheme);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = theme === "dark" ? 0.86 : 1.04;
    renderer.domElement.className = "block h-full w-full";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, 0, 0, 0, 1, 200);
    camera.position.z = 100;
    const environment = makeGoldStudioEnv(renderer);
    scene.environment = environment.texture;

    const geometry = makeCoinGeometry();
    const material = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      metalness: 0.96,
      roughness: 0.25,
      envMapIntensity: 1.65,
      clearcoat: 0.35,
    });
    const coins = new THREE.InstancedMesh(geometry, material, COINS.length);
    coins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    coins.frustumCulled = false;
    scene.add(coins);

    const coin = new THREE.Object3D();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1;
    let height = 1;
    let elapsed = 0;
    let visible = false;
    let frame: number | null = null;
    let previous: number | null = null;

    const draw = () => {
      const radius = THREE.MathUtils.clamp(width * 0.10, 23, 39) * coinScale;
      COINS.forEach(({ lane, size, phase, duration, spin }, index) => {
        const progress = (elapsed / duration + phase) % 1;
        const fall = progress * (0.82 + 0.18 * progress);
        const r = radius * size;
        const x = (lane - 0.5) * width + Math.sin(progress * Math.PI * 2 + index) * 8;
        const y = (0.5 - fall) * (height + 2 * r);
        coin.position.set(x, y, 0);
        coin.rotation.set(1.1 + elapsed * spin + index * 0.24, 0.3 + index * 0.25, elapsed * 0.24 + index);
        coin.scale.setScalar(r);
        coin.updateMatrix();
        coins.setMatrixAt(index, coin.matrix);
      });
      coins.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
    };

    const resize = () => {
      width = mount.clientWidth || 1;
      height = mount.clientHeight || 1;
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      draw();
    };

    const tick = (now: number) => {
      if (previous !== null) elapsed += Math.min((now - previous) / 1000, 0.05);
      previous = now;
      draw();
      frame = requestAnimationFrame(tick);
    };

    const syncPlayback = () => {
      if (visible && !document.hidden && !motion.matches) {
        frame ??= requestAnimationFrame(tick);
      } else if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
        previous = null;
      }
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncPlayback();
    });
    visibilityObserver.observe(mount);
    motion.addEventListener("change", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      motion.removeEventListener("change", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
      coins.dispose();
      geometry.dispose();
      material.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [theme, coinScale]);

  return <div ref={mountRef} className="h-full w-full" aria-hidden="true" />;
}
