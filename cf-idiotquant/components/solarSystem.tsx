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
        // 우주 느낌을 주기 위해 아주 어두운 남색 배경 설정
        scene.clearColor = new BABYLON.Color4(0, 0, 0.01, 1);

        // 2. 카메라 설정: 사용자가 마우스로 중심을 축으로 회전하며 볼 수 있는 카메라
        const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3, 1000, BABYLON.Vector3.Zero(), scene);
        camera.attachControl(canvasRef.current, true);
        // 우주 크기가 크므로 카메라가 볼 수 있는 최대 거리(Far Clip Plane)를 10만 유닛으로 대폭 확장
        camera.maxZ = 100000;

        // 3. 조명 및 시각 효과
        // 태양 위치(0,0,0)에서 빛이 퍼져나가는 점광원 생성
        const light = new BABYLON.PointLight("sunLight", BABYLON.Vector3.Zero(), scene);
        light.intensity = 2; // 광도 설정

        // 빛나는 효과(Bloom)를 주는 글로우 레이어 추가 (태양과 궤적을 빛나게 함)
        const gl = new BABYLON.GlowLayer("glow", scene);
        gl.intensity = 1.5;

        // 4. 행성 데이터 정의: 모든 행성의 속성을 배열로 관리 (유지보수 용이)
        const planetsData = [
            { name: "Mercury", dist: 50, size: 0.5, rev: 88, color: new BABYLON.Color3(0.6, 0.6, 0.6) },
            { name: "Venus", dist: 80, size: 0.9, rev: 224, color: new BABYLON.Color3(0.9, 0.8, 0.2) },
            { name: "Earth", dist: 120, size: 1.0, rev: 365, color: new BABYLON.Color3(0.2, 0.4, 1.0), hasMoon: true },
            { name: "Mars", dist: 170, size: 0.6, rev: 687, color: new BABYLON.Color3(0.9, 0.3, 0.2) },
            // 거대 가스 행성들 (Ring 속성 포함)
            { name: "Jupiter", dist: 280, size: 11.2, rev: 4333, color: new BABYLON.Color3(0.8, 0.7, 0.5), hasRing: true, ringColor: new BABYLON.Color3(0.5, 0.4, 0.3) },
            { name: "Saturn", dist: 400, size: 9.4, rev: 10759, color: new BABYLON.Color3(0.9, 0.8, 0.6), hasRing: true, ringColor: new BABYLON.Color3(0.7, 0.6, 0.5) },
            { name: "Uranus", dist: 520, size: 4.0, rev: 30687, color: new BABYLON.Color3(0.6, 0.9, 0.9), hasRing: true, ringColor: new BABYLON.Color3(0.4, 0.5, 0.6) },
            { name: "Neptune", dist: 630, size: 3.8, rev: 60190, color: new BABYLON.Color3(0.3, 0.3, 0.9) },
            // 명왕성: 비스듬한 공전 궤도(tilt) 적용
            { name: "Pluto", dist: 750, size: 0.3, rev: 90560, color: new BABYLON.Color3(0.5, 0.4, 0.3), tilt: BABYLON.Tools.ToRadians(17) }
        ];

        // 5. 태양 객체 생성
        const sun = BABYLON.MeshBuilder.CreateSphere("sun", { diameter: 40 }, scene);
        const sunMat = new BABYLON.StandardMaterial("sunMat", scene);
        // 태양은 스스로 빛나므로 emissiveColor(발광색) 사용
        sunMat.emissiveColor = new BABYLON.Color3(1, 0.4, 0.1);
        sun.material = sunMat;

        // 애니메이션 업데이트를 위해 행성 피벗들을 담을 배열
        var planetElements = [];

        // 6. 행성 생성 루프: 위 배열 데이터를 바탕으로 실제 메쉬 생성
        planetsData.forEach((data) => {
            // [중요] 피벗 노드: 행성 자체가 아닌 이 노드를 회전시켜 공전을 구현함
            var orbitPivot = new BABYLON.TransformNode(data.name + "Pivot");
            // 명왕성 같은 경우 궤도 자체를 기울임
            if (data.tilt) orbitPivot.rotation.z = data.tilt;

            // 행성 메쉬 생성 (diameter는 반지름*2)
            var planet = BABYLON.MeshBuilder.CreateSphere(data.name, { diameter: data.size * 2 }, scene);
            planet.parent = orbitPivot; // 피벗의 자식으로 설정
            planet.position.x = data.dist; // 태양으로부터의 거리만큼 이동

            // 행성 재질 설정
            var mat = new BABYLON.StandardMaterial(data.name + "Mat", scene);
            mat.diffuseColor = data.color;
            planet.material = mat;

            // 보조 시각 효과: 궤도 원선 그리기
            createOrbitCircle(data.dist, scene, orbitPivot);

            // 보조 시각 효과: 행성이 지나간 자리에 남는 꼬리(Trail) 생성
            new BABYLON.TrailMesh(data.name + "Trail", planet, scene, 0.3, 300, true);

            // 고리가 있는 행성 처리 (토성 등)
            if (data.hasRing) {
                var ring = BABYLON.MeshBuilder.CreateTorus(data.name + "Ring", {
                    diameter: data.size * 4.5,
                    thickness: 0.2,
                    tessellation: 64
                }, scene);
                ring.parent = planet; // 행성을 따라다니도록 설정
                ring.scaling.y = 0.05; // 도넛 형태를 얇게 눌러 고리 모양으로 만듦
                var ringMat = new BABYLON.StandardMaterial(data.name + "RingMat", scene);
                ringMat.diffuseColor = data.ringColor;
                ringMat.alpha = 0.6; // 투명도 부여
                ring.material = ringMat;
            }

            // 지구의 달 처리
            if (data.hasMoon) {
                var moonPivot = new BABYLON.TransformNode("MoonPivot");
                moonPivot.parent = orbitPivot; // 지구의 공전 피벗을 따름
                moonPivot.position.x = data.dist; // 지구의 위치에 피벗 배치
                var moon = BABYLON.MeshBuilder.CreateSphere("Moon", { diameter: 0.6 }, scene);
                moon.parent = moonPivot;
                moon.position.x = 4; // 지구로부터의 거리
                // 달의 공전 속도 정보 저장
                planetElements.push({ pivot: moonPivot, revSpeed: 1 / 27 });
            }

            // 행성의 공전 속도 정보 저장 (1/공전주기)
            planetElements.push({ pivot: orbitPivot, revSpeed: 1 / data.rev });
        });

        // 7. 카이퍼 벨트 (태양계 외곽 소행성 지대)
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

        // 8. 궤도 가이드 라인 생성 함수
        function createOrbitCircle(radius: number, scene: any, parent: any) {
            const points = [];
            for (let i = 0; i <= 360; i++) {
                const angle = BABYLON.Tools.ToRadians(i);
                points.push(new BABYLON.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
            }
            // 선(Line)을 생성하여 부모 피벗에 붙임
            const lines = BABYLON.MeshBuilder.CreateLines("orbit", { points }, scene);
            lines.color = new BABYLON.Color3(0.1, 0.1, 0.1); // 아주 연한 회색
            lines.parent = parent;
        }

        // 9. 실시간 애니메이션 연산
        // timeScale: 공전 속도를 일괄적으로 조절하는 배율
        let timeScale = 0.2;
        scene.onBeforeRenderObservable.add(() => {
            // 프레임 간 경과 시간(deltaTime)에 속도 상수를 곱함
            const deltaTime = scene.getEngine().getDeltaTime() * 0.1 * timeScale;
            planetElements.forEach(p => {
                // 각 피벗 노드를 Y축(수직축) 기준으로 회전시켜 공전 구현
                p.pivot.rotation.y += p.revSpeed * deltaTime;
            });
        });

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