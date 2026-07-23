"use client";

// Phaser 전투 캔버스 — 상태(enemy/player props)를 지켜보다가 변화가 생기면 이펙트만 재생하는
// 순수 표시 레이어. 판정 로직은 combatEngine/useGameRun에 있고 여기선 절대 계산하지 않는다.
// page.tsx에서 dynamic(..., { ssr:false })로 불러와야 함(Phaser가 window/document를 참조).

import { useEffect, useRef } from "react";
import type { EnemyState, PlayerState } from "@/app/(game)/game/gameTypes";

export default function PhaserCombatCanvas({ enemy, player, introLabel }: {
  enemy: EnemyState | null;
  player: PlayerState;
  introLabel: string | null; // 조우 진입 시 부모가 짧게(한 렌더) 세팅 — 보스/정예만
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<import("./CombatScene").default | null>(null);
  const gameRef = useRef<any>(null);
  const prevEnemyTicker = useRef<string | null>(null);
  const prevEnemyHp = useRef<number>(0);
  const prevPlayerHp = useRef<number>(player.hp);
  const prevPlayerBlock = useRef<number>(player.block);

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
        sceneRef.current = game.scene.getScene("combat") as any;
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
        scene.setEnemy?.(String(enemy.item?.name ?? "몬스터"), enemy.hp, enemy.maxHp);
        if (introLabel) scene.showIntro?.(introLabel);
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

  // 플레이어 HP/블록 변화 → 피격/방어 이펙트
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (player.hp < prevPlayerHp.current) scene.flashPlayerHit?.(prevPlayerHp.current - player.hp);
    else if (player.hp > prevPlayerHp.current) scene.playHeal?.(player.hp - prevPlayerHp.current);
    if (player.block > prevPlayerBlock.current) scene.flashPlayerBlock?.(player.block - prevPlayerBlock.current);
    prevPlayerHp.current = player.hp;
    prevPlayerBlock.current = player.block;
  }, [player.hp, player.block]);

  return <div ref={containerRef} className="w-full h-full" />;
}
