"use client";

// 가치투자 덱빌더 — 런(던전) 상태머신. 층수/조우/아이템 획득/골드/카드 수집을 combatEngine 위에서
// 오케스트레이션. 서버 연동(덱 저장·지갑 동기화)도 여기서 처리(기존 GameContent와 동일 책임 범위).

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { computeValueScore } from "@/lib/utils/valueScore";
import { addDeckCard, getWallet, syncBestStreak, type DeckCardSnapshot } from "@/lib/features/deck/deckAPI";
import {
  buildRunDeck, drawHand, enemyForFloor, playCard as engPlayCard,
  resolveEnemyTurn, useActiveItem as engUseActiveItem, checkOutcome, aggregatePassive,
  bossExtraChoiceChance,
  HAND_SIZE, BASE_HP, VIT_HP_MULTIPLIER,
} from "./combatEngine";
import { ALL_ITEMS, STARTER_DECK, ITEM_OFFER_COUNT, PP_POTION_ITEM_ID, PP_POTION_COST, pickItemChoices, acquireChance } from "./gameData";
import { ACHIEVEMENTS } from "./gameCollectibles";
import { useCharacter } from "./useCharacter";
import { killXpFor, XP_PER_ATTACK } from "./characterEngine";
import type {
  Phase, EncounterType, CombatCard, ItemDef, OwnedItem, EnemyState, PlayerState, ActiveEffect, LogEntry, LogKind,
  CharacterStats, AttackRollResult,
} from "./gameTypes";

const safeNum = (v: any): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

export type DeckItem = DeckCardSnapshot & { count: number };
export const deckTotal = (deck: DeckItem[]) => deck.reduce((a, c) => a + (c.count ?? 1), 0);

export function toCard(it: any): DeckCardSnapshot {
  return {
    ticker: String(it.ticker), name: String(it.name),
    market_cap: safeNum(it.market_cap), last_price: safeNum(it.last_price),
    ncav_ratio: safeNum(it.ncav_ratio), pbr: safeNum(it.pbr), per: safeNum(it.per),
    eps: safeNum(it.eps), bps: safeNum(it.bps),
    tone: computeValueScore(it).tone,
  };
}

export function deckFailReason(res: any): string {
  const s = res?.status;
  if (s === 401) return "로그인이 필요해요 (로그인 후 다시 시도)";
  if (s === 404) return "서버(워커)가 아직 배포되지 않았어요";
  if (s === 500) return "서버 오류 — 덱 테이블(마이그레이션) 확인 필요";
  return res?.error ? String(res.error) : "저장 실패";
}

// 조우 유형 — 보스(10층 고정) 제외, 층이 깊을수록 휴식/정예 확률 증가. 상인은 더 이상 확률
// 조우가 아니라 매 층 클리어 후 항상 뜨는 상점("shop" phase)으로 대체됨.
function pickEncounter(roundNum: number): EncounterType {
  if (roundNum === 0) return "battle";
  if (roundNum % 10 === 0) return "boss";
  const specialChance = Math.min(0.35, 0.05 + Math.floor(roundNum / 5) * 0.05);
  if (Math.random() < specialChance) {
    const pool: EncounterType[] = roundNum >= 5 ? ["rest", "elite"] : ["rest"];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return "battle";
}

export const MERCHANT_HEAL_COST = 8;
const REST_HEAL_FRAC = 0.3;

type Pile = { draw: CombatCard[]; hand: CombatCard[]; discard: CombatCard[] };

// 진행 중인 런 저장 — 다른 페이지를 다녀와도 이어지도록 함. 카드 데이터가 전부 인라인 스냅샷이라
// (pool/deck 참조 없음) 그대로 JSON 직렬화/복원이 됨. packOpening/dropped/dropPrompt/saveFail은
// 진행 중이던 setTimeout·fetch 콜백에 묶인 일시 상태라 저장 대상에서 제외(로드 시 기본값).
const RUN_KEY = "iq:game:run:v1";
type SavedRun = {
  phase: Phase; roundNum: number; encounter: EncounterType; restHealed: boolean;
  gold: number; newBest: boolean;
  ownedItems: OwnedItem[]; itemChoices: ItemDef[] | null; activeBoost: { mult: number; roundsLeft: number } | null;
  player: PlayerState; enemy: EnemyState | null; pile: Pile;
  log: LogEntry[]; lastResult: { win: boolean; goldGain?: number } | null;
  acquired: DeckCardSnapshot[];
};

export function useGameRun(params: { pool: any[]; deck: DeckItem[]; setDeck: (fn: (prev: DeckItem[]) => DeckItem[]) => void; isLoggedIn: boolean }) {
  const { pool, deck, setDeck, isLoggedIn } = params;

  const [phase, setPhase] = useState<Phase>("loading");
  const [roundNum, setRoundNum] = useState(0);
  const [encounter, setEncounter] = useState<EncounterType>("battle");
  const [restHealed, setRestHealed] = useState(false);
  const [gold, setGold] = useState(0);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);

  const [ownedItems, setOwnedItems] = useState<OwnedItem[]>([]);
  const [itemChoices, setItemChoices] = useState<ItemDef[] | null>(null);
  const [activeBoost, setActiveBoost] = useState<{ mult: number; roundsLeft: number } | null>(null); // 상점 확률 부스트(세션 로컬, 층 클리어마다 소진)

  const [player, setPlayer] = useState<PlayerState>({ hp: BASE_HP, maxHp: BASE_HP, block: 0 });
  const [enemy, setEnemy] = useState<EnemyState | null>(null);
  const [pile, setPile] = useState<Pile>({ draw: [], hand: [], discard: [] });

  const { character, characterLoaded, gainXp } = useCharacter();
  const [lastPlayerRoll, setLastPlayerRoll] = useState<AttackRollResult | null>(null);
  const [lastEnemyRoll, setLastEnemyRoll] = useState<AttackRollResult | null>(null);

  const [log, setLog] = useState<LogEntry[]>([]);
  const pushLog = useCallback((kind: LogKind, text: string) => {
    setLog(prev => [...prev.slice(-49), { id: `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, kind, text }]);
  }, []);

  const [lastResult, setLastResult] = useState<{ win: boolean; goldGain?: number } | null>(null);
  const [dropped, setDropped] = useState(false);
  const [dropPrompt, setDropPrompt] = useState(false);
  const [saveFail, setSaveFail] = useState<string | null>(null);
  const [packOpening, setPackOpening] = useState(false);
  const [acquired, setAcquired] = useState<DeckCardSnapshot[]>([]);

  const bestKey = "iq:game:best:hl:market_cap"; // 기존 기록 키 그대로 재사용(의미: 최고 도달 층수)
  useEffect(() => { setBest(b => Math.max(b, safeNum(typeof window !== "undefined" ? localStorage.getItem(bestKey) : 0))); }, []);
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    getWallet().then(res => { if (!cancelled && res?.success) setBest(b => Math.max(b, res.best_streak ?? 0)); }).catch(() => { });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  // 업적 해금 전설 아이템 — 기존 achievementId 매핑 그대로 재사용
  const unlockedLegendItems = useMemo(() => {
    const unlockedIds = new Set(ACHIEVEMENTS.filter(a => a.done({ deck, best, catalogTotal: pool.length })).map(a => a.id));
    return ALL_ITEMS.filter(i => i.achievementId && unlockedIds.has(i.achievementId));
  }, [deck, best, pool.length]);
  const availableItemPool = useMemo(() => [...ALL_ITEMS.filter(i => !i.isLegend), ...unlockedLegendItems], [unlockedLegendItems]);

  const ownedDefs = useMemo(() => ownedItems.map(o => ALL_ITEMS.find(d => d.id === o.defId)!).filter(Boolean), [ownedItems]);
  const passive = useMemo(() => aggregatePassive(ownedDefs), [ownedDefs]);
  // 캐릭터(영구) 스탯 + 이번 런에서 주운 아이템 보너스 = 실제 전투 계산에 쓰이는 유효 스탯.
  const effectiveStats = useMemo<CharacterStats>(() => ({
    str: character.stats.str + passive.strBonus,
    dex: character.stats.dex + passive.dexBonus,
    luk: character.stats.luk + passive.lukBonus,
    vit: character.stats.vit + passive.vitBonus,
  }), [character.stats, passive]);
  const maxHp = BASE_HP + effectiveStats.vit * VIT_HP_MULTIPLIER + passive.maxHpBonus;

  // 아이템 보너스로 maxHp가 늘면 그만큼 현재 HP도 즉시 채워줌(줄어드는 경우는 없음)
  const prevMaxHpRef = useRef(maxHp);
  useEffect(() => {
    const delta = maxHp - prevMaxHpRef.current;
    setPlayer(p => ({ ...p, maxHp, hp: delta > 0 ? Math.min(maxHp, p.hp + delta) : p.hp }));
    prevMaxHpRef.current = maxHp;
  }, [maxHp]);

  const started = useRef(false); // 자동 새 런 시작 가드 — 아래 복원이 성공하면 true로 설정해 덮어쓰지 않게 함

  // 페이지 재방문 시 진행 중이던 런 복원 — 저장된 스냅샷은 카드 데이터가 전부 인라인이라
  // pool/deck 로딩을 기다릴 필요 없이 마운트 즉시 복원 가능.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(RUN_KEY);
      if (!raw) return;
      const saved: SavedRun = JSON.parse(raw);
      if (!saved || !saved.player || !saved.phase || saved.phase === "over") return;
      setPhase(saved.phase); setRoundNum(saved.roundNum); setEncounter(saved.encounter);
      setRestHealed(saved.restHealed); setGold(saved.gold); setNewBest(saved.newBest ?? false);
      setOwnedItems(saved.ownedItems ?? []);
      setItemChoices(saved.itemChoices ?? null);
      setActiveBoost(saved.activeBoost ?? null);
      setPlayer(saved.player); setEnemy(saved.enemy);
      setPile(saved.pile ?? { draw: [], hand: [], discard: [] });
      setLog(saved.log ?? []);
      setLastResult(saved.lastResult ?? null);
      setAcquired(saved.acquired ?? []);
      prevMaxHpRef.current = saved.player.maxHp;
      started.current = true;
    } catch { /* 손상된 저장값은 무시하고 새 런으로 진행 */ }
  }, []);

  // 승리(층 클리어) 공통 처리 — 최고기록·골드·아이템 제공·카드 수집 판정
  const handleWin = useCallback((beatenEnemy: EnemyState, enc: EncounterType, floor: number) => {
    const nt = floor + 1; // 클리어한 층수(0-indexed floor → 1부터)
    pushLog("system", `🏆 ${beatenEnemy.item?.name ?? "적"}을(를) 처치했습니다!`);
    gainXp(killXpFor(beatenEnemy.item));
    if (nt > best) {
      setBest(nt); setNewBest(true);
      try { localStorage.setItem(bestKey, String(nt)); } catch { }
      if (isLoggedIn) syncBestStreak(nt).catch(() => { });
    }
    const isBossRound = enc === "boss", isEliteRound = enc === "elite";
    const goldGain = 3 + (isBossRound ? 15 : 0) + (isEliteRound ? 8 : 0);
    setGold(g => g + goldGain);
    setLastResult({ win: true, goldGain });
    setPhase("resolved");

    const isItemRound = floor > 0 && floor % 3 === 0 && enc === "battle";
    if (isItemRound || isBossRound) {
      const offerPool = isBossRound && unlockedLegendItems.length > 0 ? unlockedLegendItems : availableItemPool;
      // 보스는 행운 수치에 따라 낮은 확률로 3택 대신 4택을 제공
      const offerCount = isBossRound && Math.random() < bossExtraChoiceChance(effectiveStats.luk) ? ITEM_OFFER_COUNT + 1 : ITEM_OFFER_COUNT;
      setItemChoices(pickItemChoices(offerPool, offerCount));
    }

    // 상점에서 산 확률 부스트는 세션 로컬로만 추적 — 층 클리어마다 1씩 소진
    if (activeBoost) setActiveBoost(b => (b && b.roundsLeft > 1) ? { ...b, roundsLeft: b.roundsLeft - 1 } : null);

    const chance = Math.min(0.95, acquireChance(beatenEnemy.item, nt) * (activeBoost?.mult ?? 1));
    const willDrop = Math.random() < chance;
    if (!willDrop) return;
    const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setPackOpening(true);
    setTimeout(() => setPackOpening(false), reduceMotion ? 50 : 650);
    if (!isLoggedIn) { setDropPrompt(true); return; }
    const snap = toCard(beatenEnemy.item);
    addDeckCard(snap).then(res => {
      if (res?.added) {
        setDropped(true);
        pushLog("system", `✨ ${snap.name} 카드를 획득했습니다!`);
        setAcquired(prev => [snap, ...prev]);
        setDeck(prev => {
          const i = prev.findIndex(c => c.ticker === snap.ticker);
          if (i >= 0) { const next = [...prev]; next[i] = { ...next[i], count: res.count ?? next[i].count + 1 }; return next; }
          return [{ ...snap, count: res.count ?? 1 }, ...prev];
        });
      } else if (res?.success !== true) {
        setSaveFail(deckFailReason(res));
      }
    }).catch(() => setSaveFail("네트워크 오류"));
  }, [best, isLoggedIn, availableItemPool, unlockedLegendItems, setDeck, activeBoost, pushLog, gainXp, effectiveStats.luk]);

  // 내 행동(기술/아이템/패스) 직후 곧바로 적 턴을 진행 — 1행동=1턴이라 별도 "턴 종료" 버튼이
  // 없고, 카드/아이템을 쓴 함수들이 마지막에 이 함수 하나로 마무리한다. afterPlayer/afterEnemy는
  // 이미 그 행동의 효과(데미지/블록/회복)까지 반영된 상태.
  const resolveTurn = useCallback((afterPlayer: PlayerState, afterEnemy: EnemyState) => {
    setEnemy(afterEnemy);
    if (checkOutcome(afterPlayer, afterEnemy) === "win") { setPlayer(afterPlayer); handleWin(afterEnemy, encounter, roundNum); return; }
    const { player: finalPlayer, roll } = resolveEnemyTurn(afterPlayer, afterEnemy, passive);
    setLastEnemyRoll(roll);
    const blocked = Math.min(roll.totalDamage, afterPlayer.block + passive.damageReduce);
    const dmg = Math.max(0, roll.totalDamage - blocked);
    const critTxt = roll.isCrit ? " 💥크리티컬!" : "";
    pushLog("enemy", `${afterEnemy.item?.name ?? "적"}의 공격! 🎲${roll.faces.join("/")}${critTxt} → ⚔${roll.totalDamage} 중 🛡${blocked} 경감 → ${dmg} 피해`);
    setPlayer(finalPlayer);
    if (finalPlayer.hp <= 0) { setPhase("over"); setLastResult({ win: false }); pushLog("system", "💀 쓰러졌습니다..."); }
  }, [encounter, roundNum, passive, handleWin, pushLog]);

  // 기술(카드) 발동 — 탭하면 즉시. PP(usesLeft) 소진 시 무시. 공격력은 주사위로 굴려서 정해짐.
  const playHandCard = useCallback((instanceId: string) => {
    if (phase !== "battling" || !enemy) return;
    const card = pile.hand.find(c => c.instanceId === instanceId);
    if (!card || card.usesLeft <= 0) return;
    const result = engPlayCard(player, enemy, card, passive, effectiveStats);
    setPile(p => ({ ...p, hand: p.hand.map(c => c.instanceId === instanceId ? { ...c, usesLeft: c.usesLeft - 1 } : c) }));
    gainXp(XP_PER_ATTACK);
    setLastPlayerRoll(result.roll);
    const critTxt = result.roll.isCrit ? " 💥크리티컬!" : "";
    const parts = [`🎲${result.roll.faces.join("/")}${critTxt} → ⚔${result.roll.totalDamage} 피해`];
    if (card.stats.shield > 0) parts.push(`🛡${card.stats.shield} 방어`);
    pushLog("player", `${card.name} 발동 (PP ${card.usesLeft - 1}/${card.stats.maxUses}) — ${parts.join(", ")}`);
    resolveTurn(result.player, result.enemy);
  }, [phase, enemy, pile.hand, passive, player, effectiveStats, pushLog, gainXp, resolveTurn]);

  // 액티브 아이템 즉시 발동(1회 소모) — 기술과 동일하게 사용 즉시 턴을 소모.
  const useOwnedActiveItem = useCallback((instanceId: string) => {
    if (phase !== "battling" || !enemy) return;
    const owned = ownedItems.find(o => o.instanceId === instanceId);
    const def = owned && ALL_ITEMS.find(d => d.id === owned.defId);
    if (!owned || !def || def.kind !== "active") return;
    const r = engUseActiveItem(player, enemy, pile.hand, def.effect as ActiveEffect);
    setPile(p => ({ ...p, hand: r.hand }));
    setOwnedItems(prev => prev.filter(o => o.instanceId !== instanceId));
    pushLog("item", `🎒 ${def.name} 사용 — ${def.desc}`);
    resolveTurn(r.player, r.enemy);
  }, [phase, enemy, ownedItems, player, pile.hand, pushLog, resolveTurn]);

  // 모든 기술 PP 소진 + 쓸 아이템도 없는 극단적 상황에서만 노출되는 패스 — 아무 효과 없이 턴만 넘김.
  const passTurn = useCallback(() => {
    if (phase !== "battling" || !enemy) return;
    pushLog("system", "쓸 수 있는 기술/아이템이 없어 턴을 넘깁니다.");
    resolveTurn(player, enemy);
  }, [phase, enemy, player, pushLog, resolveTurn]);

  // 다음 라운드 진입 — 조우 판정 후 배틀(적 생성+기술셋 새로 드로우) 또는 이벤트(휴식)
  const advanceToRound = useCallback((nextRoundNum: number) => {
    const enc = pickEncounter(nextRoundNum);
    setRoundNum(nextRoundNum);
    setEncounter(enc);
    setLastResult(null); setDropped(false); setDropPrompt(false); setSaveFail(null); setPackOpening(false);

    if (enc === "rest") {
      pushLog("system", "🏕️ 잠깐의 휴식.");
      setPlayer(p => {
        const healed = p.hp < p.maxHp;
        setRestHealed(healed);
        return healed ? { ...p, hp: Math.min(p.maxHp, p.hp + Math.round(p.maxHp * REST_HEAL_FRAC)) } : p;
      });
      setEnemy(null); setPhase("event"); return;
    }

    const newEnemy = enemyForFloor(pool, nextRoundNum, enc as "battle" | "boss" | "elite");
    setEnemy(newEnemy);
    pushLog("system", `${enc === "boss" ? "👑" : enc === "elite" ? "🗡️" : "🐉"} ${newEnemy.item?.name ?? "적"} 등장! (HP ${newEnemy.maxHp})`);
    setPile(prev => {
      const carryDiscard = [...prev.discard, ...prev.hand];
      const r = drawHand(prev.draw, carryDiscard, HAND_SIZE + passive.drawBonus);
      return { draw: r.drawPile, hand: r.hand, discard: r.discardPile };
    });
    setPlayer(p => ({ ...p, block: passive.blockPerTurn }));
    setPhase("battling");
  }, [pool, passive, pushLog]);

  const nextRound = useCallback(() => { if (phase === "resolved") setPhase("shop"); }, [phase]);
  const proceedFromEvent = useCallback(() => { if (phase === "event") setPhase("shop"); }, [phase]);
  const proceedFromShop = useCallback(() => { if (phase === "shop") advanceToRound(roundNum + 1); }, [phase, roundNum, advanceToRound]);
  const cashOut = useCallback(() => { if (phase === "resolved") setPhase("over"); }, [phase]);

  // 매 층 상점 — HP 회복 물약(즉시 회복, 옛 떠돌이 상인 기능 재사용, merchant 조우 게이팅만 제거)
  const buyMerchantHeal = useCallback(() => {
    if (phase !== "shop") return;
    if (player.hp >= player.maxHp || gold < MERCHANT_HEAL_COST) return;
    setGold(g => g - MERCHANT_HEAL_COST);
    setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + Math.round(p.maxHp * REST_HEAL_FRAC)) }));
  }, [phase, player, gold]);

  // 매 층 상점 — PP 회복 물약(구매 시 보유 액티브 아이템으로 추가, 전투 중 쓰면 모든 기술 PP 회복)
  const buyPpPotion = useCallback(() => {
    if (phase !== "shop" || gold < PP_POTION_COST) return;
    setGold(g => g - PP_POTION_COST);
    const instanceId = `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    setOwnedItems(prev => [...prev, { instanceId, defId: PP_POTION_ITEM_ID }]);
  }, [phase, gold]);

  const buyBoost = useCallback((item: { mult: number; rounds: number }) => {
    setActiveBoost({ mult: item.mult, roundsLeft: item.rounds });
  }, []);

  const pickItem = useCallback((id: string) => {
    const instanceId = `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    setOwnedItems(prev => [...prev, { instanceId, defId: id }]);
    setItemChoices(null);
  }, []);
  const skipItem = useCallback(() => setItemChoices(null), []);

  const start = useCallback(() => {
    if (pool.length < 2) return;
    const runDeck = buildRunDeck(deck, STARTER_DECK);
    const newEnemy = enemyForFloor(pool, 0, "battle");
    const r = drawHand(runDeck, [], HAND_SIZE);
    setEnemy(newEnemy);
    setPile({ draw: r.drawPile, hand: r.hand, discard: r.discardPile });
    setOwnedItems([]); setItemChoices(null);
    setGold(0); setRoundNum(0); setEncounter("battle"); setRestHealed(false); setNewBest(false);
    setLastResult(null); setDropped(false); setDropPrompt(false); setSaveFail(null); setPackOpening(false); setAcquired([]);
    setPlayer({ hp: maxHp, maxHp, block: 0 });
    prevMaxHpRef.current = maxHp;
    setLog([{ id: "l0", kind: "system", text: `🐉 ${newEnemy.item?.name ?? "적"} 등장! (HP ${newEnemy.maxHp})` }]);
    setPhase("battling");
  }, [pool, deck, maxHp]);

  useEffect(() => { if (!started.current && pool.length >= 2 && characterLoaded) { started.current = true; start(); } }, [pool, characterLoaded, start]);

  // 진행 중인 런 저장 — 다른 페이지로 이동했다 돌아와도 이어지도록. 런이 끝나면(over) 제거.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (phase === "loading") return;
    if (phase === "over") { try { localStorage.removeItem(RUN_KEY); } catch { } return; }
    const saved: SavedRun = {
      phase, roundNum, encounter, restHealed, gold, newBest,
      ownedItems, itemChoices, activeBoost, player, enemy, pile,
      log, lastResult, acquired,
    };
    try { localStorage.setItem(RUN_KEY, JSON.stringify(saved)); } catch { }
  }, [phase, roundNum, encounter, restHealed, gold, newBest, ownedItems, itemChoices, activeBoost, player, enemy, pile, log, lastResult, acquired]);

  const acquirePct = enemy ? Math.round(Math.min(0.95, acquireChance(enemy.item, roundNum + 1) * (activeBoost?.mult ?? 1)) * 100) : 0;

  return {
    phase, roundNum, encounter, restHealed, gold, best, newBest,
    ownedItems, ownedDefs, itemChoices, passive, maxHp, unlockedLegendItems, activeBoost,
    player, enemy, hand: pile.hand, drawCount: pile.draw.length, log,
    lastResult, dropped, dropPrompt, saveFail, packOpening, acquired, acquirePct,
    character, effectiveStats, lastPlayerRoll, lastEnemyRoll,
    start, playHandCard, useOwnedActiveItem, passTurn, nextRound, proceedFromEvent, proceedFromShop, cashOut,
    buyMerchantHeal, buyPpPotion, buyBoost, pickItem, skipItem,
  };
}
