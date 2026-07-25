"use client";

// 가치투자 덱빌더 — 런(던전) 상태머신. 층수/조우/아이템 획득/골드/카드 수집을 combatEngine 위에서
// 오케스트레이션. 서버 연동(덱 저장·지갑 동기화)도 여기서 처리(기존 GameContent와 동일 책임 범위).

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { computeValueScore } from "@/lib/utils/valueScore";
import { addDeckCard, getWallet, syncBestStreak, type DeckCardSnapshot } from "@/lib/features/deck/deckAPI";
import {
  enemyForFloor, buildParty, monsterSkills, useSkillEffect as engUseSkillEffect,
  resolveEnemyTurn, useActiveItem as engUseActiveItem, checkOutcome, aggregatePassive,
  bossExtraChoiceChance,
  VIT_HP_MULTIPLIER, stageForXp, growthStats, growthMaxHp, STAGE_LABELS, XP_PER_MONSTER_ATTACK, WIN_XP_BONUS,
} from "./combatEngine";
import { ALL_ITEMS, ITEM_OFFER_COUNT, PP_POTION_ITEM_ID, PP_POTION_COST, pickItemChoices, acquireChance } from "./gameData";
import { ACHIEVEMENTS } from "./gameCollectibles";
import { useCharacter } from "./useCharacter";
import { killXpFor, XP_PER_ATTACK } from "./characterEngine";
import type {
  Phase, EncounterType, ItemDef, OwnedItem, EnemyState, PlayerState, ActiveEffect, LogEntry, LogKind,
  CharacterStats, AttackRollResult, SkillState, BattleMenu, PartyMember,
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

// 진행 중인 런 저장 — 다른 페이지를 다녀와도 이어지도록 함. 카드 데이터가 전부 인라인 스냅샷이라
// (pool/deck 참조 없음) 그대로 JSON 직렬화/복원이 됨. packOpening/dropped/dropPrompt/saveFail은
// 진행 중이던 setTimeout·fetch 콜백에 묶인 일시 상태라 저장 대상에서 제외(로드 시 기본값).
// v1(전사 고정 기술 단일 캐릭터) → v2(카드 파티 3마리)로 스키마가 근본적으로 달라져 호환 불가라
// 키 자체를 올렸다 — v1 저장분은 그냥 무시되고 새 런으로 시작한다(고아 키는 무해하게 방치).
const RUN_KEY = "iq:game:run:v2";
type SavedRun = {
  phase: Phase; roundNum: number; encounter: EncounterType; restHealed: boolean;
  gold: number; newBest: boolean;
  ownedItems: OwnedItem[]; itemChoices: ItemDef[] | null; activeBoost: { mult: number; roundsLeft: number } | null;
  party: PartyMember[]; activeIndex: number; playerHp: number; playerBlock: number;
  enemy: EnemyState | null; skillPp: SkillState[]; battleMenu: BattleMenu;
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

  // 파티 — 계정 덱 상위 카드로 던전 입장 시 구성, 런 내내 고정. activeIndex가 지금 전투 중인
  // 몬스터. playerHp/playerBlock은 그 활성 몬스터의 실시간 전투 상태(block은 매 적 턴 리셋).
  const [partyRaw, setParty] = useState<PartyMember[]>([]); // 카드 자체 base만 담은 원본(트레이너 공용 보너스 미포함) — 화면 표시는 아래 파생 party를 쓴다
  const [activeIndex, setActiveIndex] = useState(0);
  const [playerHp, setPlayerHp] = useState(0);
  const [playerBlock, setPlayerBlock] = useState(0);
  const [enemy, setEnemy] = useState<EnemyState | null>(null);
  const [skillPp, setSkillPp] = useState<SkillState[]>([]); // 던전 진행 내내 유지(전투 승리로 안 채워짐) — PP 물약으로만 회복
  const [battleMenu, setBattleMenu] = useState<BattleMenu>("action"); // 전투 중 하위 화면 — 매 내 턴마다 "action"에서 시작
  // 내 행동(또는 적 반격) 결과를 보여준 뒤, 다음 단계(적 반격/행동 메뉴 복귀/강제 교체/게임오버)로
  // 넘어가는 로직을 담아뒀다가 플레이어가 직접 다시 탭해야만(advancePendingAction) 실행되는
  // 함수. null이면 대기 중인 다음 단계가 없다는 뜻(=평소처럼 행동 메뉴 등을 보여줌). 로그가
  // 타이머로 순식간에 지나가버리지 않도록 자동 진행 대신 이 방식을 쓴다.
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const advancePendingAction = useCallback(() => {
    if (!pendingAction) return;
    setPendingAction(null);
    pendingAction();
  }, [pendingAction]);

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

  const activeMember = partyRaw[activeIndex] ?? null;
  const activeStage = activeMember ? stageForXp(activeMember.xp) : 1;
  // 활성 몬스터의 최대 HP = 카드 자체 base를 성장 단계(xp)만큼 보정한 값(growthMaxHp) +
  // 트레이너 공용 보너스(패시브 maxHpBonus + 체력 스탯) — 몬스터를 교체해도 이 공용 보너스는
  // 그대로 따라붙는다. maxHp는 항상 파생값으로만 계산하고 별도 state로 들고 있지 않는다(교체·
  // 성장 시 증분 적용 같은 동기화 버그를 원천 차단하기 위함).
  const passiveVitBonus = passive.maxHpBonus + effectiveStats.vit * VIT_HP_MULTIPLIER;
  const activeMaxHp = activeMember ? growthMaxHp(activeMember.stats, activeMember.xp) + passiveVitBonus : 0;
  const player: PlayerState = useMemo(() => ({ hp: playerHp, maxHp: activeMaxHp, block: playerBlock }), [playerHp, activeMaxHp, playerBlock]);

  // party(state)의 maxHp는 카드 자체 base만 담고 있어(성장·트레이너 공용 보너스 미포함) — 그걸
  // 그대로 파티 화면/HUD에 표시하면 활성 몬스터의 경우 캔버스 HP바(player.maxHp, 보너스 포함)와
  // 숫자가 어긋나 보였다. 화면에 보여줄 땐 각자의 성장 단계(growthMaxHp)에 트레이너 공용
  // 보너스(passiveVitBonus)까지 더한 파생 뷰를 쓴다 — 활성 몬스터는 activeMaxHp와 정확히 같아짐.
  const party: PartyMember[] = useMemo(
    () => partyRaw.map(m => ({ ...m, maxHp: growthMaxHp(m.stats, m.xp) + passiveVitBonus })),
    [partyRaw, passiveVitBonus],
  );

  // 트레이너 공용 보너스(패시브+체력 스탯)가 늘어난 만큼 활성 몬스터 HP도 즉시 채워줌(아이템을
  // 새로 주웠을 때만 반응 — activeMaxHp 자체는 교체할 때도 바뀌므로 이 값에 직접 걸면 교체할
  // 때마다 오작동한다. passiveVitBonus는 어느 몬스터가 나와있든 안 바뀌므로 안전).
  const prevBonusRef = useRef(passiveVitBonus);
  useEffect(() => {
    const delta = passiveVitBonus - prevBonusRef.current;
    if (delta > 0) setPlayerHp(hp => hp > 0 ? Math.min(activeMaxHp, hp + delta) : hp);
    prevBonusRef.current = passiveVitBonus;
  }, [passiveVitBonus, activeMaxHp]);

  const skillDefs = useMemo(
    () => activeMember ? monsterSkills(growthStats(activeMember.stats, activeMember.xp), stageForXp(activeMember.xp)) : [],
    [activeMember],
  );
  const skills = useMemo(() => skillDefs.map(def => ({
    def, pp: skillPp.find(s => s.ownerId === activeMember?.instanceId && s.skillId === def.id)?.pp ?? def.maxPP,
  })), [skillDefs, skillPp, activeMember]);
  const skillDefsByOwner = useMemo(
    () => new Map(partyRaw.map(m => [m.instanceId, monsterSkills(growthStats(m.stats, m.xp), stageForXp(m.xp))])),
    [partyRaw],
  );

  const started = useRef(false); // 자동 새 런 시작 가드 — resumeRun()이 호출되면 true로 설정해 덮어쓰지 않게 함
  const savedRunRef = useRef<SavedRun | null>(null); // 감지된(아직 적용 안 한) 저장된 런 — resumeRun()이 실제로 적용
  const [hasSavedRun, setHasSavedRun] = useState(false);

  // 페이지 재방문 시 이어할 수 있는 런이 있는지만 감지 — 예전엔 감지되면 곧바로 자동 복원해서
  // 파티 설정 화면을 건너뛰고 바로 전투로 돌아갔는데, 그러면 "게임 시작 시 파티를 꾸리고
  // 싶다"는 유저 기대와 어긋난다(특히 파티 설정 기능이 생기기 전에 만들어진 오래된 저장분일수록
  // 더). 이제는 감지만 해두고 파티 설정 화면에 "이어하기" 버튼으로 노출 — 실제 적용은 유저가
  // 그 버튼을 눌러야(resumeRun) 일어난다.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(RUN_KEY);
      if (!raw) return;
      const saved: SavedRun = JSON.parse(raw);
      if (!saved || !saved.party || saved.party.length === 0 || !saved.phase || saved.phase === "over") return;
      savedRunRef.current = saved;
      setHasSavedRun(true);
    } catch { /* 손상된 저장값은 무시하고 새 런으로 진행 */ }
  }, []);

  const resumeRun = useCallback(() => {
    const saved = savedRunRef.current;
    if (!saved) return;
    // 육성(진화) 기능 이전에 저장된 v2 스키마는 party 원소에 xp 필드가 없다 — 없으면 0(유아기)
    // 으로 채워서 복원(스키마 자체를 또 올릴 만큼 큰 변경은 아니라 여기서 방어적으로 보정).
    const restoredParty = saved.party.map(m => ({ ...m, xp: m.xp ?? 0 }));
    setPhase(saved.phase); setRoundNum(saved.roundNum); setEncounter(saved.encounter);
    setRestHealed(saved.restHealed); setGold(saved.gold); setNewBest(saved.newBest ?? false);
    setOwnedItems(saved.ownedItems ?? []);
    setItemChoices(saved.itemChoices ?? null);
    setActiveBoost(saved.activeBoost ?? null);
    setParty(restoredParty); setActiveIndex(saved.activeIndex ?? 0);
    setPlayerHp(saved.playerHp); setPlayerBlock(saved.playerBlock ?? 0);
    setEnemy(saved.enemy);
    // saved.skillPp가 비어있으면(스키마 손상 등) 기술별 PP를 추적할 항목이 하나도 없어 이후
    // .map() 갱신이 대상을 못 찾고 조용히 무시되는 버그가 과거에 있었음(구 단일 캐릭터 스키마
    // 때) — 그때는 복원된 파티 기준으로 풀피 새로 채워서 복원한다.
    setSkillPp(saved.skillPp && saved.skillPp.length > 0 ? saved.skillPp
      : restoredParty.flatMap(m => monsterSkills(growthStats(m.stats, m.xp), stageForXp(m.xp)).map(def => ({ ownerId: m.instanceId, skillId: def.id, pp: def.maxPP }))));
    setBattleMenu(saved.battleMenu ?? "action");
    setLog(saved.log ?? []);
    setLastResult(saved.lastResult ?? null);
    setAcquired(saved.acquired ?? []);
    started.current = true;
  }, []);

  // 육성(진화) — 이번 런에서 몬스터별로 쌓이는 경험치(파티 xp)를 지급. 유아기→청년기→성인
  // 경계를 넘으면 로그를 남긴다(스탯/기술 변화는 growthStats·monsterSkills가 xp를 다시 읽어
  // 자동 반영하므로 여기선 xp 갱신 + 알림만 하면 됨).
  const grantMonsterXp = useCallback((idx: number, amount: number) => {
    const member = partyRaw[idx];
    if (!member) return;
    const prevStage = stageForXp(member.xp);
    const nextXp = member.xp + amount;
    const nextStage = stageForXp(nextXp);
    setParty(prev => prev.map((m, i) => i === idx ? { ...m, xp: nextXp } : m));
    if (nextStage > prevStage) {
      pushLog("system", `✨ ${member.name}이(가) ${STAGE_LABELS[nextStage]}(으)로 진화했습니다! 스탯이 오르고 기술이 강해졌어요.`);
    }
  }, [partyRaw, pushLog]);

  // 승리(층 클리어) 공통 처리 — 최고기록·골드·아이템 제공·카드 수집 판정
  const handleWin = useCallback((beatenEnemy: EnemyState, enc: EncounterType, floor: number) => {
    const nt = floor + 1; // 클리어한 층수(0-indexed floor → 1부터)
    pushLog("system", `🏆 ${beatenEnemy.item?.name ?? "적"}을(를) 처치했습니다!`);
    gainXp(killXpFor(beatenEnemy.item));
    grantMonsterXp(activeIndex, WIN_XP_BONUS);
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
  }, [best, isLoggedIn, availableItemPool, unlockedLegendItems, setDeck, activeBoost, pushLog, gainXp, effectiveStats.luk, activeIndex, grantMonsterXp]);

  // 적의 반격 처리 공통 로직 — 내 행동 직후(resolveTurn) 또는 자발적 파티 교체 직후(switchMember)
  // 양쪽에서 호출. 반격 자체는 즉시 계산해 로그·HP를 반영하지만(전투 화면엔 그 결과가 곧바로
  // 보임), 그다음 단계(행동 메뉴 복귀·강제 교체·런 종료)로 넘어가는 건 pendingAction에 담아둬서
  // 플레이어가 직접 탭해야만 실행되게 한다.
  const applyEnemyTurn = useCallback((afterPlayer: PlayerState, afterEnemy: EnemyState, member: PartyMember, idx: number, currentParty: PartyMember[]) => {
    const { player: finalPlayer, roll, effectiveness } = resolveEnemyTurn(afterPlayer, afterEnemy, passive, afterEnemy.sectorType, member.sectorType);
    setLastEnemyRoll(roll);
    const blocked = Math.min(roll.totalDamage, afterPlayer.block + passive.damageReduce);
    const dmg = Math.max(0, roll.totalDamage - blocked);
    const critTxt = roll.isCrit ? " 💥크리티컬!" : "";
    const effTxt = effectiveness === "super" ? " (업종 상성 우위!)" : effectiveness === "weak" ? " (업종 상성 열세)" : "";
    pushLog("enemy", `${afterEnemy.item?.name ?? "적"}의 공격! 🎲${roll.faces.join("/")}${critTxt}${effTxt} → ⚔${roll.totalDamage} 중 🛡${blocked} 경감 → ${dmg} 피해`);
    setPlayerHp(finalPlayer.hp); setPlayerBlock(finalPlayer.block);
    setParty(prev => prev.map((m, i) => i === idx ? { ...m, hp: finalPlayer.hp } : m));
    if (finalPlayer.hp <= 0) {
      const hasReserve = currentParty.some((m, i) => i !== idx && m.hp > 0);
      setPendingAction(() => () => {
        if (hasReserve) {
          pushLog("system", `💥 ${member.name}이(가) 쓰러졌습니다! 다음 몬스터를 선택하세요.`);
          setBattleMenu("party");
        } else {
          setPhase("over"); setLastResult({ win: false }); pushLog("system", "💀 파티 전원이 쓰러졌습니다...");
        }
      });
      return;
    }
    setPendingAction(() => () => setBattleMenu("action"));
  }, [passive, pushLog]);

  // 내 행동(기술/아이템) 직후 적 턴을 진행 — 1행동=1턴이라 별도 "턴 종료" 버튼이 없고, 기술/
  // 아이템을 쓴 함수들이 마지막에 이 함수 하나로 마무리한다. afterPlayer/afterEnemy는 이미 그
  // 행동의 효과(데미지/블록/회복)까지 반영된 상태 — 그 결과를 먼저 화면에 반영해두고, 적 반격
  // (또는 승리 처리)은 pendingAction으로 넘겨 플레이어가 다시 탭할 때까지 기다린다.
  const resolveTurn = useCallback((afterPlayer: PlayerState, afterEnemy: EnemyState) => {
    setEnemy(afterEnemy);
    const idx = activeIndex, member = partyRaw[idx];
    if (!member) return;
    setParty(prev => prev.map((m, i) => i === idx ? { ...m, hp: afterPlayer.hp } : m));
    setPlayerHp(afterPlayer.hp); setPlayerBlock(afterPlayer.block);
    if (checkOutcome(afterPlayer, afterEnemy) === "win") {
      setPendingAction(() => () => handleWin(afterEnemy, encounter, roundNum));
      return;
    }
    setPendingAction(() => () => applyEnemyTurn(afterPlayer, afterEnemy, member, idx, partyRaw));
  }, [activeIndex, partyRaw, encounter, roundNum, handleWin, applyEnemyTurn]);

  // 기술 발동 — 행동 메뉴에서 "전투"를 고른 뒤 기술 목록에서 탭하면 즉시. PP 소진 시 무시.
  // 공격 기술은 주사위로 굴려서 데미지가 정해지고(+업종 상성 배율), 방어/회복 기술은 고정치를
  // 바로 적용.
  const useSkill = useCallback((skillId: string) => {
    if (phase !== "battling" || !enemy || !activeMember || pendingAction) return;
    const skill = skills.find(s => s.def.id === skillId);
    if (!skill || skill.pp <= 0) return;
    const result = engUseSkillEffect(player, enemy, skill.def, passive, effectiveStats, activeMember.sectorType, enemy.sectorType);
    // 성장으로 기술셋이 바뀌면(성인 진화로 "약공격"→"필살기" 등) skillPp에 그 skillId 항목이
    // 아직 없을 수 있음 — .map()만으론 못 찾아 조용히 무시되므로(과거 PP 버그와 같은 원인)
    // 없으면 새로 추가하는 upsert로 처리.
    setSkillPp(prev => {
      const idx = prev.findIndex(s => s.ownerId === activeMember.instanceId && s.skillId === skillId);
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], pp: next[idx].pp - 1 }; return next; }
      return [...prev, { ownerId: activeMember.instanceId, skillId, pp: skill.def.maxPP - 1 }];
    });
    const nextPp = skill.pp - 1;
    const effTxt = result.effectiveness === "super" ? " 업종 상성 우위!" : result.effectiveness === "weak" ? " 업종 상성 열세..." : "";
    if (result.roll) {
      gainXp(XP_PER_ATTACK);
      setLastPlayerRoll(result.roll);
      const critTxt = result.roll.isCrit ? " 💥크리티컬!" : "";
      pushLog("player", `${activeMember.name}의 ${skill.def.name}! (PP ${nextPp}/${skill.def.maxPP}) — 🎲${result.roll.faces.join("/")}${critTxt}${effTxt} → ⚔${result.roll.totalDamage} 피해`);
      grantMonsterXp(activeIndex, XP_PER_MONSTER_ATTACK);
    } else if (skill.def.effect === "shield") {
      pushLog("player", `${activeMember.name}의 ${skill.def.name}! (PP ${nextPp}/${skill.def.maxPP}) — 🛡${skill.def.power} 방어`);
    } else {
      pushLog("player", `${activeMember.name}의 ${skill.def.name}! (PP ${nextPp}/${skill.def.maxPP}) — ❤️${skill.def.power} 회복`);
    }
    resolveTurn(result.player, result.enemy);
  }, [phase, enemy, activeMember, activeIndex, skills, passive, player, effectiveStats, pendingAction, pushLog, gainXp, grantMonsterXp, resolveTurn]);

  // 액티브 아이템 즉시 발동(1회 소모) — 행동 메뉴에서 "아이템"을 고른 뒤 사용. 기술과 동일하게
  // 사용 즉시 턴을 소모.
  const useOwnedActiveItem = useCallback((instanceId: string) => {
    if (phase !== "battling" || !enemy || pendingAction) return;
    const owned = ownedItems.find(o => o.instanceId === instanceId);
    const def = owned && ALL_ITEMS.find(d => d.id === owned.defId);
    if (!owned || !def || def.kind !== "active") return;
    const r = engUseActiveItem(player, enemy, skillPp, skillDefsByOwner, def.effect as ActiveEffect);
    setSkillPp(r.skills);
    setOwnedItems(prev => prev.filter(o => o.instanceId !== instanceId));
    pushLog("item", `🎒 ${def.name} 사용 — ${def.desc}`);
    resolveTurn(r.player, r.enemy);
  }, [phase, enemy, ownedItems, player, skillPp, skillDefsByOwner, pendingAction, pushLog, resolveTurn]);

  // 파티 교체 — 강제(활성 몬스터 기절 직후, battleMenu==="party"이고 player.hp<=0)면 턴을 소모하지
  // 않고 곧바로 행동 선택으로 복귀. 자발적(행동 메뉴 "파티"에서 직접 선택)이면 실제 기술처럼 턴을
  // 소모해 곧바로 적의 공격을 받는다(교체에 대가가 있어야 유의미한 선택이 됨).
  const switchMember = useCallback((instanceId: string) => {
    if (phase !== "battling" || pendingAction) return;
    const idx = partyRaw.findIndex(m => m.instanceId === instanceId);
    if (idx < 0 || idx === activeIndex) return;
    const member = partyRaw[idx];
    if (member.hp <= 0) return;
    const forced = playerHp <= 0;
    setActiveIndex(idx);
    setPlayerHp(member.hp);
    setPlayerBlock(passive.blockPerTurn);
    pushLog("system", `🔄 ${member.name}이(가) 앞으로 나섭니다!`);
    if (forced) { setBattleMenu("action"); return; }
    if (!enemy) { setBattleMenu("action"); return; }
    // 자발적 교체도 턴을 소모 — "교체됨" 결과를 보여준 뒤 플레이어가 탭해야 적의 반격으로 넘어간다.
    setPendingAction(() => () => applyEnemyTurn({ hp: member.hp, maxHp: growthMaxHp(member.stats, member.xp) + passiveVitBonus, block: passive.blockPerTurn }, enemy, member, idx, partyRaw));
  }, [phase, partyRaw, activeIndex, playerHp, passive, passiveVitBonus, enemy, pendingAction, pushLog, applyEnemyTurn]);

  // 행동 메뉴 선택 — 전투(기술 목록)/파티(교체)/아이템(보유 아이템 목록) 모두 하위 화면 전환만
  // 한다. 도망치기(현재 전투를 그냥 건너뛰는 것과 다를 바 없어) 제거됨 — 던전 나가기(구
  // "월드맵")는 행동 메뉴가 아니라 상단 HUD의 상시 버튼(cashOut)으로 이동했다.
  const selectBattleAction = useCallback((action: "fight" | "party" | "item") => {
    if (phase !== "battling" || pendingAction) return;
    if (action === "fight") setBattleMenu("skills");
    else if (action === "party") setBattleMenu("party");
    else if (action === "item") setBattleMenu("items");
  }, [phase, pendingAction]);
  const backToActionMenu = useCallback(() => { if (playerHp > 0 && !pendingAction) setBattleMenu("action"); }, [playerHp, pendingAction]);

  // 다음 라운드 진입 — 조우 판정 후 배틀(적 생성) 또는 이벤트(휴식). 기술 PP는 손대지 않음
  // (던전 진행 내내 유지, 회복은 상점 물약으로만). 활성 몬스터는 층 클리어 시점에 항상 생존 중
  // 이었으므로(패배했다면 애초에 이 함수까지 못 옴) 별도 소생 처리가 필요 없다.
  const advanceToRound = useCallback((nextRoundNum: number) => {
    const enc = pickEncounter(nextRoundNum);
    setRoundNum(nextRoundNum);
    setEncounter(enc);
    setLastResult(null); setDropped(false); setDropPrompt(false); setSaveFail(null); setPackOpening(false);

    if (enc === "rest") {
      pushLog("system", "🏕️ 잠깐의 휴식.");
      const healed = playerHp < activeMaxHp;
      setRestHealed(healed);
      if (healed) {
        const nextHp = Math.min(activeMaxHp, playerHp + Math.round(activeMaxHp * REST_HEAL_FRAC));
        setPlayerHp(nextHp);
        setParty(prev => prev.map((m, i) => i === activeIndex ? { ...m, hp: nextHp } : m));
      }
      setEnemy(null); setPhase("event"); return;
    }

    const newEnemy = enemyForFloor(pool, nextRoundNum, enc as "battle" | "boss" | "elite");
    setEnemy(newEnemy);
    pushLog("system", `${enc === "boss" ? "👑" : enc === "elite" ? "🗡️" : "🐉"} ${newEnemy.item?.name ?? "적"} 등장! (HP ${newEnemy.maxHp})`);
    setPlayerBlock(passive.blockPerTurn);
    setBattleMenu("action");
    setPhase("battling");
  }, [pool, passive, activeIndex, activeMaxHp, playerHp, pushLog]);

  const nextRound = useCallback(() => { if (phase === "resolved") setPhase("shop"); }, [phase]);
  const proceedFromEvent = useCallback(() => { if (phase === "event") setPhase("shop"); }, [phase]);
  const proceedFromShop = useCallback(() => { if (phase === "shop") advanceToRound(roundNum + 1); }, [phase, roundNum, advanceToRound]);
  // 던전 나가기(상단 HUD의 상시 버튼 및 "여기서 정리" 버튼) — resolved 화면뿐 아니라 진행 중인
  // 어느 시점에서도 호출 가능(런이 이미 끝났거나 로딩 중일 때만 무시).
  const cashOut = useCallback(() => { if (phase !== "over" && phase !== "loading") setPhase("over"); }, [phase]);

  // 매 층 상점 — HP 회복 물약(즉시 회복, 옛 떠돌이 상인 기능 재사용, merchant 조우 게이팅만 제거)
  const buyMerchantHeal = useCallback(() => {
    if (phase !== "shop") return;
    if (playerHp >= activeMaxHp || gold < MERCHANT_HEAL_COST) return;
    setGold(g => g - MERCHANT_HEAL_COST);
    const nextHp = Math.min(activeMaxHp, playerHp + Math.round(activeMaxHp * REST_HEAL_FRAC));
    setPlayerHp(nextHp);
    setParty(prev => prev.map((m, i) => i === activeIndex ? { ...m, hp: nextHp } : m));
  }, [phase, playerHp, activeMaxHp, gold, activeIndex]);

  // 매 층 상점 — PP 회복 물약(구매 시 보유 액티브 아이템으로 추가, 전투 중 쓰면 파티 전원의 기술 PP 회복)
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

  // selectedTickers — 파티 설정 화면에서 유저가 고른 카드(최대 PARTY_SIZE, 순서=선택 순서).
  // 빈 배열이면(덱이 없거나 전부 건너뜀) 전원 스타터로 시작.
  const start = useCallback((selectedTickers: string[] = []) => {
    if (pool.length < 2) return;
    const chosen = selectedTickers.map(t => deck.find(d => d.ticker === t)).filter((c): c is DeckItem => !!c);
    const newParty = buildParty(chosen);
    const newEnemy = enemyForFloor(pool, 0, "battle");
    setParty(newParty);
    setActiveIndex(0);
    setEnemy(newEnemy);
    setSkillPp(newParty.flatMap(m => monsterSkills(m.stats).map(def => ({ ownerId: m.instanceId, skillId: def.id, pp: def.maxPP }))));
    setBattleMenu("action");
    setOwnedItems([]); setItemChoices(null);
    setGold(0); setRoundNum(0); setEncounter("battle"); setRestHealed(false); setNewBest(false);
    setLastResult(null); setDropped(false); setDropPrompt(false); setSaveFail(null); setPackOpening(false); setAcquired([]);
    const startMaxHp = newParty[0].maxHp + effectiveStats.vit * VIT_HP_MULTIPLIER;
    setPlayerHp(startMaxHp); setPlayerBlock(0);
    prevBonusRef.current = effectiveStats.vit * VIT_HP_MULTIPLIER;
    setLog([{ id: "l0", kind: "system", text: `🐉 ${newEnemy.item?.name ?? "적"} 등장! (파티: ${newParty.map(m => m.name).join(" · ")})` }]);
    setPhase("battling");
  }, [pool, deck, effectiveStats.vit]);

  // 준비되면(카드 풀+캐릭터 로드 완료) 곧바로 던전에 들어가지 않고 파티 설정 화면부터 보여준다.
  // 이어할 저장된 런이 있어도 여기서 자동으로 적용하지 않는다 — hasSavedRun을 보고 파티 설정
  // 화면에서 유저가 "이어하기"를 직접 눌러야(resumeRun) 적용된다.
  useEffect(() => { if (!started.current && pool.length >= 2 && characterLoaded) { started.current = true; setPhase("partySetup"); } }, [pool, characterLoaded]);
  // "새 던전 입장" — 곧바로 시작하지 않고 파티를 다시 고를 수 있게 설정 화면으로.
  const promptNewRun = useCallback(() => { if (phase === "over") setPhase("partySetup"); }, [phase]);

  // 진행 중인 런 저장 — 다른 페이지로 이동했다 돌아와도 이어지도록. 런이 끝나면(over) 제거.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (phase === "loading") return;
    if (phase === "over") { try { localStorage.removeItem(RUN_KEY); } catch { } setHasSavedRun(false); return; }
    // party는 트레이너 보너스가 더해진 화면 표시용 파생값이라 저장하지 않는다(복원 시 다시
    // 보너스를 더하면 이중으로 반영됨) — 원본 partyRaw를 저장한다.
    const saved: SavedRun = {
      phase, roundNum, encounter, restHealed, gold, newBest,
      ownedItems, itemChoices, activeBoost, party: partyRaw, activeIndex, playerHp, playerBlock, enemy, skillPp, battleMenu,
      log, lastResult, acquired,
    };
    try { localStorage.setItem(RUN_KEY, JSON.stringify(saved)); } catch { }
  }, [phase, roundNum, encounter, restHealed, gold, newBest, ownedItems, itemChoices, activeBoost, partyRaw, activeIndex, playerHp, playerBlock, enemy, skillPp, battleMenu, log, lastResult, acquired]);

  const acquirePct = enemy ? Math.round(Math.min(0.95, acquireChance(enemy.item, roundNum + 1) * (activeBoost?.mult ?? 1)) * 100) : 0;
  const forcedSwitch = playerHp <= 0; // battleMenu==="party"일 때만 의미 있음(그 외엔 항상 false)

  return {
    phase, roundNum, encounter, restHealed, gold, best, newBest,
    ownedItems, ownedDefs, itemChoices, passive, unlockedLegendItems, activeBoost,
    player, enemy, party, activeIndex, activeStage, passiveVitBonus, forcedSwitch, pending: pendingAction !== null, advance: advancePendingAction, skills, battleMenu, log,
    lastResult, dropped, dropPrompt, saveFail, packOpening, acquired, acquirePct,
    character, effectiveStats, lastPlayerRoll, lastEnemyRoll,
    hasSavedRun, resumeRun,
    start, promptNewRun, useSkill, useOwnedActiveItem, switchMember, selectBattleAction, backToActionMenu, nextRound, proceedFromEvent, proceedFromShop, cashOut,
    buyMerchantHeal, buyPpPotion, buyBoost, pickItem, skipItem,
  };
}
