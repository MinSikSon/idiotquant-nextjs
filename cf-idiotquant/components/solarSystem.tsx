"use client"; // Next.js 클라이언트 컴포넌트 선언

import React, { useEffect, useRef } from "react";
import * as BABYLON from "@babylonjs/core";

const SolarSystem = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // --- 엔진 및 씬 초기화 ---
        const engine = new BABYLON.Engine(canvasRef.current, true);
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0, 0, 0.01, 1);

        // 카메라 & 조명
        const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3, 1000, BABYLON.Vector3.Zero(), scene);
        camera.attachControl(canvasRef.current, true);
        camera.maxZ = 200000;

        const light = new BABYLON.PointLight("sunLight", BABYLON.Vector3.Zero(), scene);
        light.intensity = 2;

        const gl = new BABYLON.GlowLayer("glow", scene);
        gl.intensity = 1.2;

        // --- 태양 생성 ---
        const sun = BABYLON.MeshBuilder.CreateSphere("sun", { diameter: 40 }, scene);
        const sunMat = new BABYLON.StandardMaterial("sunMat", scene);
        sunMat.emissiveColor = new BABYLON.Color3(1, 0.4, 0.1);
        sun.material = sunMat;

        // --- 카이퍼 벨트 (SPS 방식 적용) ---
        const createKuiperBelt = () => {
            const count = 700;
            const sps = new BABYLON.SolidParticleSystem("sps", scene);
            const asteroidBox = BABYLON.MeshBuilder.CreateBox("b", { size: 1.5 }, scene);
            sps.addShape(asteroidBox, count);
            asteroidBox.dispose();

            sps.initParticles = () => {
                for (let p = 0; p < sps.nbParticles; p++) {
                    const particle = sps.particles[p];
                    const angle = Math.random() * Math.PI * 2;
                    const radius = 1000 + Math.random() * 300;
                    particle.position = new BABYLON.Vector3(Math.cos(angle) * radius, (Math.random() - 0.5) * 40, Math.sin(angle) * radius);
                    const s = Math.random() * 1.2 + 0.6;
                    particle.scaling = new BABYLON.Vector3(s, s, s);
                    particle.color = new BABYLON.Color4(0.6 + Math.random() * 0.3, 0.3, 0.9, 1);
                }
            };
            const mesh = sps.buildMesh();
            sps.initParticles();
            sps.setParticles();

            const kMat = new BABYLON.StandardMaterial("kMat", scene);
            kMat.disableLighting = true;
            kMat.emissiveColor = new BABYLON.Color3(0.5, 0.2, 0.8);
            mesh.material = kMat;
            mesh.freezeWorldMatrix();
        };
        createKuiperBelt();

        // --- 애니메이션 루프 실행 ---
        engine.runRenderLoop(() => {
            scene.render();
        });

        // --- 윈도우 리사이즈 대응 ---
        const handleResize = () => engine.resize();
        window.addEventListener("resize", handleResize);

        // --- 클린업 (컴포넌트 언마운트 시 메모리 해제) ---
        return () => {
            window.removeEventListener("resize", handleResize);
            engine.dispose();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100vh", display: "block", outline: "none" }}
        />
    );
};

export default SolarSystem;