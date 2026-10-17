"use client";

import { useEffect, useState } from "react";
import AssetGoal from "@/components/AssetGoal";

export default function AssetGoalPanel({ storageKey, current, month }: {
    storageKey: string;
    current: number | null;
    month: string;
}) {
    const [target, setTarget] = useState(0);
    const [ready, setReady] = useState(false);
    const [storageFailed, setStorageFailed] = useState(false);
    useEffect(() => {
        try {
            const saved = Number(localStorage.getItem(storageKey));
            if (Number.isFinite(saved) && saved >= 0 && saved <= 1e15) setTarget(saved);
        } catch { setStorageFailed(true); }
        setReady(true);
    }, [storageKey]);

    if (!ready) return null;
    return <AssetGoal target={target} current={current} unit="원" max={1e15}
        format={value => `${Math.round(value).toLocaleString("ko-KR")}원`}
        note={`${month} 순자산 기준 · ${storageFailed ? "브라우저 저장 불가: 이번 화면에서만 유지" : "이 브라우저에만 저장되며 다른 기기·공유 멤버와 동기화되지 않습니다"}`}
        onChange={value => {
            const next = Math.round(value);
            setTarget(next);
            try { localStorage.setItem(storageKey, String(next)); }
            catch { setStorageFailed(true); }
        }} />;
}
