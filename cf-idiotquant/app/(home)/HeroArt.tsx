"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useAppSelector } from "@/lib/hooks";
import { selectTheme } from "@/lib/features/control/controlSlice";

// 기존 금화·캔들 씬을 히어로 안에만 성글게 복원한다.
function makeGoldStudioEnv(renderer: THREE.WebGLRenderer): THREE.Texture {
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
  const env = pmrem.fromEquirectangular(tex).texture;
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

const HERO_STAGE = {
  dark: {
    exposure: 0.78,
    hemiSky: 0xc0bcd3, hemiGround: 0x141416, hemiInt: 0.3,
    keyInt: 2.3,
    rimColor: 0x938aca, rimInt: 0.85,
    glintInt: 22,
    candleUp: 0x4c7866, candleDown: 0x825664, candleEnv: 0.4,
  },
  light: {
    exposure: 1.05,
    hemiSky: 0xffffff, hemiGround: 0xf4f4f5, hemiInt: 0.55,
    keyInt: 2.6,
    rimColor: 0xc5c0df, rimInt: 0.5,
    glintInt: 18,
    candleUp: 0x7c988a, candleDown: 0x9e8589, candleEnv: 0.25,
  },
} as const;

export default function HeroArt() {
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

    const narrowVp = mount.clientWidth / Math.max(1, mount.clientHeight) < 0.9;

    const renderer = new THREE.WebGLRenderer({ antialias: !narrowVp, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, narrowVp ? 1.25 : 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = stage.exposure;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    mount.appendChild(canvas);

    const disposables: { dispose: () => void }[] = [];

    const envTex = makeGoldStudioEnv(renderer);
    scene.environment = envTex;
    disposables.push(envTex);

    scene.add(new THREE.HemisphereLight(stage.hemiSky, stage.hemiGround, stage.hemiInt));
    const key = new THREE.DirectionalLight(0xfff2d0, stage.keyInt);
    key.position.set(5, 9, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(stage.rimColor, stage.rimInt);
    rim.position.set(-7, 3, -4);
    scene.add(rim);
    const glint = new THREE.PointLight(0xffffff, stage.glintInt, 40);
    glint.position.set(-3, 7, 6);
    scene.add(glint);

    const root = new THREE.Group();
    scene.add(root);
    const BASE = -2;

    const upMat = new THREE.MeshStandardMaterial({ color: stage.candleUp, roughness: 0.62, metalness: 0.03, envMapIntensity: stage.candleEnv });
    const dnMat = new THREE.MeshStandardMaterial({ color: stage.candleDown, roughness: 0.62, metalness: 0.03, envMapIntensity: stage.candleEnv });
    const goldMat = new THREE.MeshPhysicalMaterial({
      vertexColors: true, metalness: 1.0, roughness: 0.05,
      envMapIntensity: 1.9, clearcoat: 0.5, clearcoatRoughness: 0.04,
    });
    disposables.push(upMat, dnMat, goldMat);

    // 여백을 남기는 밀도: 모바일 2개, 데스크톱 4개의 캔들.
    const CANDLE_N = narrowVp ? 2 : 4;
    const CANDLE_HS = narrowVp ? 0.35 : 0.7;
    const SPAN_X = narrowVp ? 1.95 : 6.2;
    const Y_MIN = narrowVp ? -3.4 : -3.0, Y_MAX = narrowVp ? 3.4 : 3.6;
    const Z_MIN = -2.4, Z_MAX = -0.6;
    const candleGroup = new THREE.Group();
    root.add(candleGroup);

    const CANDLE_BASE_OPACITY = narrowVp ? 0.65 : 0.8;
    upMat.transparent = dnMat.transparent = true;
    upMat.opacity = dnMat.opacity = CANDLE_BASE_OPACITY;

    const floaters: { g: THREE.Group; y0: number; phase: number; bob: number; spin: number }[] = [];
    for (let i = 0; i < CANDLE_N; i++) {
      const h = (0.5 + Math.random() * 0.85) * CANDLE_HS;
      const bw = h * (0.3 + Math.random() * 0.14);
      const mat = Math.random() < 0.7 ? upMat : dnMat;
      const geo = new THREE.BoxGeometry(bw, h, bw);
      const wickGeo = new THREE.BoxGeometry(bw * 0.24, h * 0.28, bw * 0.24);
      disposables.push(geo, wickGeo);
      const g = new THREE.Group();
      g.add(new THREE.Mesh(geo, mat), new THREE.Mesh(wickGeo, mat));
      g.children[1].position.y = h * 0.64;
      const slotW = (SPAN_X * 2) / CANDLE_N;
      const x = -SPAN_X + (i + 0.5) * slotW + (Math.random() - 0.5) * slotW * 0.7;
      const yu = ((i * 0.618034) % 1 + Math.random() * 0.08) % 1;
      g.position.set(x, Y_MIN + yu * (Y_MAX - Y_MIN), Z_MIN + Math.random() * (Z_MAX - Z_MIN));
      g.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * 6.3, (Math.random() - 0.5) * 0.34);
      candleGroup.add(g);
      floaters.push({
        g, y0: g.position.y, phase: Math.random() * 6.3,
        bob: 0.25 + Math.random() * 0.35, spin: (Math.random() - 0.5) * 0.25,
      });
    }

    const STREAM = narrowVp ? 3 : 6;

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const X_MAX = narrowVp ? 1.6 : 6.4;
    const STREAM_X_MIN = narrowVp ? 0.45 : -2.0;
    const BIG_X_MIN = 1.0;
    const R_MAX = narrowVp ? 0.25 : 0.34;

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

    const respawn = (c: Coin) => {
      const x = rnd(STREAM_X_MIN, X_MAX);
      const textZone = x < BIG_X_MIN;
      c.pos.set(x, BASE + rnd(7.2, 12.5), textZone ? rnd(-3.6, -2.6) : rnd(0.1, 1.8));
      c.r = textZone ? rnd(0.14, 0.24) : rnd(R_MAX * 0.5, R_MAX);
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
        c.vy -= 0.9 * dt;
        if (c.vy < -1.5) c.vy = -1.5;
        c.pos.y += c.vy * dt;
        c.pos.x += c.vx * dt;
        c.rot.x += c.rx * dt; c.rot.y += c.ry * dt; c.rot.z += c.rz * dt;
        if (c.pos.y <= BASE - 8) respawn(c);
      }
    };

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
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });
    ro.observe(mount);

    const CANDLE_MAX_ROT = THREE.MathUtils.degToRad(12);
    let candleRotY = 0;
    const FADE_FROM = 0.15, FADE_TO = 0.55;
    let candleFade = 1;
    let heroVisible = true;
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
    });
    visibilityObserver.observe(mount);
    const clock = new THREE.Clock();
    let raf = 0;
    const render = () => {
      // 화면 밖의 장식은 GPU 렌더링을 쉬게 한다.
      if (!heroVisible || document.hidden) {
        clock.getDelta();
        raf = requestAnimationFrame(render);
        return;
      }
      // 낙하·자전·부유 속도를 기존의 절반으로 낮춘다.
      const dt = Math.min(clock.getDelta(), 0.05) * 0.5;
      const t = clock.getElapsedTime() * 0.5;
      stepCoins(dt);
      syncCoins();
      for (const f of floaters) {
        f.g.position.y = f.y0 + Math.sin(t * f.bob + f.phase) * 0.08;
        f.g.rotation.y += f.spin * dt;
      }
      const scrollProgress = Math.min(window.scrollY / Math.max(1, window.innerHeight * 0.9), 1);
      const targetRotY = scrollProgress * CANDLE_MAX_ROT;
      candleRotY += (targetRotY - candleRotY) * (1 - Math.exp(-6 * dt));
      candleGroup.rotation.y = candleRotY;
      const targetFade = 1 - THREE.MathUtils.clamp((scrollProgress - FADE_FROM) / (FADE_TO - FADE_FROM), 0, 1);
      candleFade += (targetFade - candleFade) * (1 - Math.exp(-8 * dt));
      upMat.opacity = dnMat.opacity = candleFade * CANDLE_BASE_OPACITY;
      candleGroup.visible = candleFade > 0.02;
      camera.position.x = Math.sin(t * 0.08) * 0.35;
      camera.position.y = 2.6 + Math.sin(t * 0.05) * 0.15;
      camera.lookAt(0, 0.4, -1);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    let disposed = false;
    if (reduce) {
      camera.position.set(0, 2.6, 11);
      camera.lookAt(0, 0.4, -1);
      renderer.render(scene, camera);
    } else {
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
      visibilityObserver.disconnect();
      disposables.forEach(d => d.dispose());
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [theme]);

  return <div ref={mountRef} className="w-full h-full" aria-hidden="true" />;
}

