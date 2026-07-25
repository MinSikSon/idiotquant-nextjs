"use client";

// Phaser 전투 캔버스 — 상태(enemy/player props)를 지켜보다가 변화가 생기면 이펙트만 재생하는
// 순수 표시 레이어. 판정 로직은 combatEngine/useGameRun에 있고 여기선 절대 계산하지 않는다.
// page.tsx에서 dynamic(..., { ssr:false })로 불러와야 함(Phaser가 window/document를 참조).

import { useEffect, useRef } from "react";
import type { EnemyState, PlayerState } from "@/app/(game)/game/gameTypes";

export default function PhaserCombatCanvas({ enemy, player, playerName, introLabel, stage }: {
  enemy: EnemyState | null;
  player: PlayerState;
  playerName: string; // 좌하단 내 캐릭터 정보 박스에 표시(클래스명, 예: "전사")
  introLabel: string | null; // 조우 진입 시 부모가 짧게(한 렌더) 세팅 — 보스/정예만
  stage: number; // 활성 몬스터의 육성 단계(0=유아기/1=청년기/2=성인) — 실루엣 크기에 반영
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<import("./CombatScene").default | null>(null);
  const gameRef = useRef<any>(null);
  const prevEnemyTicker = useRef<string | null>(null);
  const prevEnemyHp = useRef<number>(0);
  const prevPlayerHp = useRef<number>(player.hp);
  const prevPlayerBlock = useRef<number>(player.block);
  const latestEnemyRef = useRef(enemy);
  latestEnemyRef.current = enemy;
  const latestPlayerRef = useRef(player);
  latestPlayerRef.current = player;
  const latestPlayerNameRef = useRef(playerName);
  latestPlayerNameRef.current = playerName;
  const latestStageRef = useRef(stage);
  latestStageRef.current = stage;

  useEffect(() => {
    let disposed = false;
    (async () => {
      const Phaser = (await import("phaser")).default;
      const CombatScene = (await import("./CombatScene")).default;
      if (disposed || !containerRef.current) return;
      const el = containerRef.current;
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        transparent: true,
        parent: el,
        width: el.clientWidth || 320,
        height: el.clientHeight || 220,
        scene: [CombatScene],
        banner: false,
      });
      gameRef.current = game;
      game.events.once(Phaser.Core.Events.READY, () => {
        const scene = game.scene.getScene("combat") as any;
        sceneRef.current = scene;
        // 씬이 준비되기 전에 이미 적/플레이어 상태가 정해져 있었을 수 있음(마운트 시점 경쟁) —
        // 놓치지 않게 즉시 반영.
        const e = latestEnemyRef.current;
        if (e) {
          scene.setEnemy?.(String(e.item?.name ?? "몬스터"), e.hp, e.maxHp, e.encounter);
          prevEnemyTicker.current = e.item?.ticker ?? null;
          prevEnemyHp.current = e.hp;
        }
        scene.setPlayerName?.(latestPlayerNameRef.current);
        scene.setPlayerHp?.(latestPlayerRef.current.hp, latestPlayerRef.current.maxHp);
        scene.setPlayerStage?.(latestStageRef.current);
      });
      const ro = new ResizeObserver(() => {
        if (!containerRef.current) return;
        game.scale.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      });
      ro.observe(el);
      (game as any).__ro = ro;
    })();
    return () => {
      disposed = true;
      (gameRef.current as any)?.__ro?.disconnect();
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  // 적 등장/변경
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !enemy) return;
    const id = requestAnimationFrame(() => {
      if (enemy.item?.ticker !== prevEnemyTicker.current) {
        const name = String(enemy.item?.name ?? "몬스터");
        scene.setEnemy?.(name, enemy.hp, enemy.maxHp, enemy.encounter);
        // 보스/정예는 부모가 넘겨준 전용 문구, 그 외 모든 조우도 포켓몬처럼 매번 등장 배너를 띄움.
        scene.showIntro?.(introLabel ?? `${name} 등장!`);
        prevEnemyTicker.current = enemy.item?.ticker ?? null;
        prevEnemyHp.current = enemy.hp;
        return;
      }
      if (enemy.hp < prevEnemyHp.current) scene.flashEnemyHit?.(prevEnemyHp.current - enemy.hp);
      scene.setEnemyHp?.(enemy.hp, enemy.maxHp);
      prevEnemyHp.current = enemy.hp;
    });
    return () => cancelAnimationFrame(id);
  }, [enemy, enemy?.hp, introLabel]);

  // 이름 변경(사실상 초기 1회) — 좌하단 정보 박스 라벨
  useEffect(() => { sceneRef.current?.setPlayerName?.(playerName); }, [playerName]);

  // 육성 단계 변화 — 진화 시 실루엣 크기 변경 + 플래시(최초 마운트 값 반영 시엔 무연출).
  useEffect(() => { sceneRef.current?.setPlayerStage?.(stage); }, [stage]);

  // 플레이어 HP/블록 변화 → 피격/방어 이펙트 + HP바 갱신
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (player.hp < prevPlayerHp.current) scene.flashPlayerHit?.(prevPlayerHp.current - player.hp);
    else if (player.hp > prevPlayerHp.current) scene.playHeal?.(player.hp - prevPlayerHp.current);
    if (player.block > prevPlayerBlock.current) scene.flashPlayerBlock?.(player.block - prevPlayerBlock.current);
    scene.setPlayerHp?.(player.hp, player.maxHp);
    prevPlayerHp.current = player.hp;
    prevPlayerBlock.current = player.block;
  }, [player.hp, player.maxHp, player.block]);

  return <div ref={containerRef} className="w-full h-full" />;
}
