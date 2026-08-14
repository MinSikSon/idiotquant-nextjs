"use client";
// 종목 발굴 픽셀 스프라이트 — 의존성 없음, canvas 2D만 사용.
// 20×14 도트 그리드에 블록을 직접 찍기 때문에 어떤 배율에서도 선명하다.
// 사용: <SectorSprite sector="철강·금속" color="#16a34a" />
//       <SectorSprite mode="chart" data={[38,34,41,...]} color="#16a34a" />
import { useEffect, useRef } from "react";

const GW = 20, GH = 14;

/** 스프라이트 한 종류당 강조색 하나. 키는 그림 이름이지 업종명이 아니다 — 이름 표기가
    흔들려도(가운뎃점·"업" 접미사·코스피/코스닥 차이) 같은 그림·같은 색이 나오게 하려고
    `spriteKeyFor` 를 거쳐 찾는다. */
export const SECTOR_COLOR: Record<string, string> = {    "철강·금속": "#16a34a", "전기·전자": "#0369a1", "기계·장비": "#c2410c",
    "화학": "#6d28d9", "운수·창고": "#0f766e",
    "의약품": "#e11d48", "음식료품": "#ea580c", "섬유·의복": "#db2777",
    "종이·목재": "#a16207", "건설업": "#d97706", "유통업": "#0d9488",
    "금융업": "#1d4ed8", "증권": "#15803d", "보험": "#4338ca",
    "통신업": "#4f46e5", "전기·가스": "#ca8a04", "서비스업": "#0891b2",
    "IT·소프트웨어": "#0284c7", "반도체": "#7c3aed", "운송장비·부품": "#475569",
    "의료·정밀기기": "#be123c", "비금속광물": "#8a5a3b", "오락·문화": "#c026d3",
    "부동산": "#4d7c0f", "기타제조": "#525252", "출판·매체": "#92400e",
};

// 업종명은 KIS 가 주는 대로(bstp_kor_isnm) 들어와 표기가 일정하지 않다. 정확히 일치할 때만
// 그림을 붙이면 대부분 기본 구로 떨어지므로 낱말로 고른다. 위에서부터 먼저 걸리는 것이 이긴다.
const SPRITE_KEYWORDS: [string, string[]][] = [
    ["철강·금속", ["철강", "금속", "비철"]],
    ["전기·전자", ["전기전자", "전기·전자", "전자부품", "IT부품", "전자"]],
    ["기계·장비", ["기계", "장비", "정보기기"]],
    ["화학", ["화학", "석유", "고무", "플라스틱"]],
    ["운수·창고", ["운수창고", "운수·창고", "운송", "창고", "물류", "해운", "항공"]],
    ["의약품", ["의약", "제약", "바이오", "생물"]],
    ["음식료품", ["음식료", "식품", "담배", "농업", "어업", "축산"]],
    ["섬유·의복", ["섬유", "의복", "의류", "패션", "신발"]],
    ["종이·목재", ["종이", "목재", "펄프", "가구"]],
    ["건설업", ["건설", "토목", "엔지니어링"]],
    ["유통업", ["유통", "도매", "소매", "무역", "백화점"]],
    ["금융업", ["금융", "은행", "지주", "저축"]],
    ["증권", ["증권", "투자"]],
    ["보험", ["보험"]],
    ["통신업", ["통신", "방송", "미디어"]],
    ["전기·가스", ["전기가스", "전기·가스", "가스", "전력", "에너지"]],
    ["서비스업", ["서비스"]],
    ["IT·소프트웨어", ["소프트웨어", "인터넷", "컴퓨터", "디지털", "게임", "IT"]],
    ["반도체", ["반도체", "웨이퍼", "디스플레이"]],
    ["운송장비·부품", ["운송장비", "운수장비", "자동차", "조선", "차부품"]],
    ["의료·정밀기기", ["의료", "정밀", "기기"]],
    ["비금속광물", ["비금속", "광물", "시멘트", "요업", "광업"]],
    ["오락·문화", ["오락", "문화", "레저", "여행", "엔터"]],
    ["부동산", ["부동산", "임대", "리츠"]],
    ["기타제조", ["제조"]],
    ["출판·매체", ["출판", "매체", "인쇄", "교육"]],
];

/** 업종명 → 스프라이트 키. 걸리는 낱말이 없으면 null(기본 구). */
export function spriteKeyFor(sector?: string): string | null {
    const s = String(sector ?? "").replace(/[\s·.\-()]/g, "");
    if (!s) return null;
    for (const [key, words] of SPRITE_KEYWORDS) {
        if (words.some(w => s.includes(w.replace(/[\s·.\-]/g, "")))) return key;
    }
    return null;
}

/** 업종 강조색. 표기가 달라도 같은 색이 나오도록 스프라이트 키를 거친다. */
export const sectorAccent = (sector?: string): string | undefined =>
    SECTOR_COLOR[spriteKeyFor(sector) ?? ""];

type Pal = Record<"A" | "L" | "D" | "K" | "N" | "H" | "S" | "O", string>;

function hex(h: string): [number, number, number] {
    let s = h.replace("#", "");
    if (s.length === 3) s = s.split("").map(c => c + c).join("");
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
const mix = (a: number[], b: number[], t: number) =>
    `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;

function palette(accent: string): Pal {
    const a = hex(accent), W = [255, 255, 255], B = [12, 12, 12];
    return {
        A: mix(a, W, 0), L: mix(a, W, 0.42), D: mix(a, B, 0.34), K: mix(a, B, 0.62),
        N: "rgb(190,186,176)", H: "rgb(226,223,214)", S: "rgb(150,146,137)", O: "rgb(96,94,89)",
    };
}

function makeGrid() {
    const cells: (string | null)[] = new Array(GW * GH).fill(null);
    const px = (x: number, y: number, c: string) => {
        x = Math.round(x); y = Math.round(y);
        if (x >= 0 && y >= 0 && x < GW && y < GH && c) cells[y * GW + x] = c;
    };
    const g = {
        cells, px,
        rect(x: number, y: number, w: number, h: number, c: string) {
            for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c);
        },
        slab(x: number, y: number, w: number, h: number, p: Pal, accent: boolean) {
            g.rect(x, y, w, 1, accent ? p.L : p.H);
            if (h > 2) g.rect(x, y + 1, w, h - 2, accent ? p.A : p.N);
            if (h > 1) g.rect(x, y + h - 1, w, 1, accent ? p.D : p.S);
            g.rect(x - 1, y + 1, 1, Math.max(h - 1, 1), accent ? p.K : p.O);
            g.rect(x + w, y + 1, 1, Math.max(h - 1, 1), accent ? p.K : p.O);
        },
        disc(cx: number, cy: number, r: number, c: string) {
            for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
                for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
                    if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.12) px(x, y, c);
        },
        ring(cx: number, cy: number, ro: number, ri: number, c: string) {
            for (let y = Math.floor(cy - ro); y <= Math.ceil(cy + ro); y++)
                for (let x = Math.floor(cx - ro); x <= Math.ceil(cx + ro); x++) {
                    const d = (x - cx) ** 2 + (y - cy) ** 2;
                    if (d <= ro * ro + 0.12 && d >= ri * ri - 0.12) px(x, y, c);
                }
        },
        line(x0: number, y0: number, x1: number, y1: number, c: string) {
            const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
            for (let i = 0; i <= n; i++) px(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c);
        },
    };
    return g;
}
type Grid = ReturnType<typeof makeGrid>;

const SPRITE: Record<string, (g: Grid, p: Pal) => void> = {
    "철강·금속": (g, p) => {                      // 압연 슬래브
        g.slab(3, 2, 13, 3, p, true);
        g.slab(2, 6, 15, 3, p, false);
        g.slab(4, 10, 11, 3, p, false);
        g.rect(4, 13, 11, 1, p.O);
    },
    "전기·전자": (g, p) => {                      // 기판 + 칩
        g.rect(2, 9, 16, 1, p.H); g.rect(2, 10, 16, 2, p.N); g.rect(2, 12, 16, 1, p.O);
        for (let x = 3; x < 18; x += 2) g.rect(x, 11, 1, 1, p.K);
        g.rect(5, 2, 7, 1, p.L); g.rect(5, 3, 7, 4, p.A); g.rect(5, 7, 7, 1, p.D);
        g.rect(7, 4, 3, 2, p.K);
        for (let y = 3; y < 8; y += 2) { g.rect(4, y, 1, 1, p.O); g.rect(12, y, 1, 1, p.O); }
        g.rect(14, 4, 3, 1, p.H); g.rect(14, 5, 3, 2, p.N); g.rect(14, 7, 3, 1, p.S);
    },
    "기계·장비": (g, p) => {                      // 맞물린 기어
        g.ring(7, 6, 5.2, 3.4, p.A);
        g.ring(7, 6, 5.2, 4.6, p.L);
        g.disc(7, 6, 1.6, p.D);
        ([[7, 0], [7, 12], [1, 6], [13, 6], [3, 2], [11, 2], [3, 10], [11, 10]] as const)
            .forEach(([x, y]) => g.rect(x - 1, y - 1, 2, 2, p.K));
        g.ring(15, 10, 3.1, 1.8, p.N);
        ([[15, 6.5], [15, 13], [11.5, 10], [18, 10]] as const)
            .forEach(([x, y]) => g.rect(x - 1, y - 1, 2, 2, p.O));
    },
    "화학": (g, p) => {                           // 분자 결합
        g.line(6, 5, 13, 4, p.O);
        g.line(6, 6, 8, 11, p.O);
        g.disc(6, 6, 3.1, p.A);
        g.disc(5, 5, 1.4, p.L);
        g.disc(6, 8, 1.2, p.D);
        g.disc(14, 4, 2.1, p.N);
        g.disc(13.4, 3.4, 0.9, p.H);
        g.disc(10, 11, 1.9, p.N);
        g.disc(9.5, 10.5, 0.8, p.H);
    },
    "운수·창고": (g, p) => {                      // 적재 컨테이너
        const box = (x: number, y: number, w: number, accent: boolean) => {
            g.rect(x, y, w, 1, accent ? p.L : p.H);
            g.rect(x, y + 1, w, 2, accent ? p.A : p.N);
            g.rect(x, y + 3, w, 1, accent ? p.D : p.S);
            for (let i = x + 1; i < x + w; i += 2) g.rect(i, y + 1, 1, 2, accent ? p.K : p.S);
        };
        box(5, 2, 9, true); box(2, 7, 7, false); box(11, 7, 7, false);
        g.rect(2, 11, 16, 1, p.O); g.rect(4, 12, 12, 1, p.O);
    },

    "의약품": (g, p) => {                          // 캡슐 + 알약
        g.disc(6, 5, 3, p.A); g.rect(6, 2, 4, 7, p.A);
        g.disc(13, 5, 3, p.N); g.rect(10, 2, 4, 7, p.N);
        g.rect(6, 2, 4, 1, p.L); g.disc(4.4, 3.6, 1.3, p.L);
        g.rect(10, 2, 4, 1, p.H); g.disc(14.6, 3.6, 1.2, p.H);
        g.rect(6, 8, 4, 1, p.D); g.rect(10, 8, 4, 1, p.S);
        g.line(10, 2, 10, 8, p.K);
        g.rect(4, 11, 1, 2, p.A); g.rect(9, 11, 1, 2, p.A);
        g.rect(5, 11, 4, 1, p.L); g.rect(5, 12, 4, 1, p.A); g.rect(5, 13, 4, 1, p.D);
        g.rect(12, 11, 1, 2, p.N); g.rect(17, 11, 1, 2, p.N);
        g.rect(13, 11, 4, 1, p.H); g.rect(13, 12, 4, 1, p.N); g.rect(13, 13, 4, 1, p.S);
    },
    "음식료품": (g, p) => {                        // 캔 + 사과
        g.rect(3, 2, 6, 1, p.L); g.rect(3, 3, 6, 9, p.A); g.rect(3, 12, 6, 1, p.D);
        g.rect(2, 3, 1, 9, p.K); g.rect(9, 3, 1, 9, p.K);
        g.rect(3, 6, 6, 3, p.H); g.rect(4, 7, 4, 1, p.S);
        g.disc(14.5, 9, 3.5, p.N); g.disc(13, 7.4, 1.4, p.H);
        g.rect(14, 4, 1, 2, p.O); g.rect(15, 4, 2, 1, p.S); g.rect(16, 3, 1, 1, p.S);
        g.rect(11, 12, 7, 1, p.O);
    },
    "섬유·의복": (g, p) => {                       // 티셔츠
        g.rect(6, 2, 8, 1, p.L);
        g.rect(2, 3, 4, 1, p.L); g.rect(2, 4, 4, 3, p.A); g.rect(2, 7, 4, 1, p.D);
        g.rect(14, 3, 4, 1, p.L); g.rect(14, 4, 4, 3, p.A); g.rect(14, 7, 4, 1, p.D);
        g.rect(6, 3, 8, 9, p.A); g.rect(6, 12, 8, 1, p.D);
        g.rect(5, 3, 1, 10, p.K); g.rect(14, 3, 1, 10, p.K);
        g.rect(8, 2, 4, 1, p.K); g.rect(9, 3, 2, 1, p.K);
        g.rect(7, 5, 1, 6, p.L); g.rect(12, 5, 1, 6, p.D);
    },
    "종이·목재": (g, p) => {                       // 통나무 단면
        g.disc(5, 4, 3.2, p.A); g.ring(5, 4, 2, 1.4, p.L); g.disc(5, 4, 0.6, p.L);
        g.disc(13, 4, 3.2, p.N); g.ring(13, 4, 2, 1.4, p.H); g.disc(13, 4, 0.6, p.H);
        g.disc(9, 10, 3.4, p.N); g.ring(9, 10, 2.1, 1.5, p.H); g.disc(9, 10, 0.6, p.H);
        g.rect(2, 13, 16, 1, p.O);
        g.rect(15, 9, 4, 1, p.S); g.rect(15, 10, 4, 2, p.N); g.rect(15, 12, 4, 1, p.O);
    },
    "건설업": (g, p) => {                          // 타워 크레인
        g.rect(2, 2, 17, 1, p.L); g.rect(2, 3, 17, 1, p.A);
        for (let x = 3; x < 19; x += 3) g.rect(x, 4, 1, 1, p.K);
        g.rect(5, 4, 3, 1, p.L); g.rect(5, 5, 3, 8, p.A);
        g.rect(4, 5, 1, 8, p.K); g.rect(8, 5, 1, 8, p.K);
        for (let y = 6; y < 13; y += 2) g.rect(5, y, 3, 1, p.D);
        g.rect(3, 13, 8, 1, p.O);
        g.line(15, 4, 15, 8, p.O);
        g.rect(14, 8, 3, 1, p.H); g.rect(14, 9, 3, 2, p.N); g.rect(14, 11, 3, 1, p.S);
    },
    "유통업": (g, p) => {                          // 쇼핑카트
        g.line(1, 3, 4, 3, p.O); g.line(4, 3, 5, 5, p.O);
        g.rect(5, 4, 13, 1, p.L); g.rect(5, 5, 13, 3, p.A); g.rect(6, 8, 11, 1, p.D);
        g.rect(7, 9, 9, 1, p.K);
        for (let x = 8; x < 17; x += 3) g.rect(x, 5, 1, 3, p.K);
        g.disc(8, 12, 1.6, p.N); g.disc(8, 12, 0.6, p.O);
        g.disc(15, 12, 1.6, p.N); g.disc(15, 12, 0.6, p.O);
    },
    "금융업": (g, p) => {                          // 기둥 건물
        for (let i = 0; i < 6; i++) g.rect(4 + i, 2 + i, 12 - i * 2, 1, i === 0 ? p.L : p.A);
        g.rect(2, 5, 16, 1, p.L); g.rect(2, 6, 16, 1, p.A);
        [3, 7, 11, 15].forEach(x => {
            g.rect(x, 7, 2, 1, p.L); g.rect(x, 8, 2, 3, p.A); g.rect(x, 11, 2, 1, p.D);
        });
        g.rect(2, 12, 16, 1, p.H); g.rect(2, 13, 16, 1, p.S);
    },
    "증권": (g, p) => {                            // 촛대 차트
        const candle = (x: number, top: number, h: number, up: boolean) => {
            g.line(x + 1, top - 2, x + 1, top + h + 1, p.O);
            g.rect(x, top, 3, 1, up ? p.L : p.H);
            g.rect(x, top + 1, 3, h - 1, up ? p.A : p.N);
            g.rect(x, top + h, 3, 1, up ? p.D : p.S);
        };
        candle(3, 7, 4, false); candle(8, 4, 5, true); candle(13, 6, 4, true);
        g.rect(1, 13, 18, 1, p.O);
    },
    "보험": (g, p) => {                            // 방패
        g.rect(5, 2, 10, 1, p.L);
        g.rect(5, 3, 10, 5, p.A);
        g.rect(6, 8, 8, 2, p.A);
        g.rect(7, 10, 6, 1, p.D);
        g.rect(8, 11, 4, 1, p.D);
        g.rect(9, 12, 2, 1, p.K);
        g.rect(4, 3, 1, 5, p.K); g.rect(15, 3, 1, 5, p.K);
        g.rect(9, 4, 2, 6, p.H); g.rect(7, 6, 6, 2, p.H);
    },
    "통신업": (g, p) => {                          // 안테나 + 전파
        g.ring(10, 4, 4.4, 3.6, p.N); g.ring(10, 4, 7, 6.2, p.S);
        g.line(6, 13, 9.4, 3, p.A); g.line(13, 13, 9.6, 3, p.A);
        g.rect(8, 6, 4, 1, p.D); g.rect(7, 9, 6, 1, p.D);
        g.rect(9, 1, 2, 3, p.L);
        g.rect(5, 13, 10, 1, p.O);
    },
    "전기·가스": (g, p) => {                       // 송전탑 + 번개
        g.line(2, 13, 5.5, 2, p.N); g.line(9, 13, 5.5, 2, p.N);
        g.rect(3, 6, 6, 1, p.S); g.rect(2, 9, 8, 1, p.S);
        g.rect(1, 4, 3, 1, p.S); g.rect(7, 4, 3, 1, p.S);
        g.rect(5, 1, 2, 1, p.H);
        g.rect(15, 2, 3, 1, p.L); g.rect(14, 3, 3, 1, p.A);
        g.rect(13, 4, 3, 1, p.A); g.rect(12, 5, 4, 1, p.A);
        g.rect(13, 6, 5, 1, p.L); g.rect(13, 7, 3, 1, p.A);
        g.rect(12, 8, 3, 1, p.A); g.rect(11, 9, 3, 1, p.D); g.rect(11, 10, 2, 1, p.D);
        g.rect(1, 13, 18, 1, p.O);
    },
    "서비스업": (g, p) => {                        // 안내 벨
        g.rect(9, 1, 2, 4, p.L);
        g.disc(10, 9, 5, p.A); g.rect(5, 9, 11, 2, p.A);
        g.disc(7.6, 6.6, 1.8, p.L);
        g.rect(4, 10, 13, 1, p.D);
        g.rect(2, 11, 17, 1, p.H); g.rect(2, 12, 17, 1, p.N); g.rect(2, 13, 17, 1, p.S);
    },
    "IT·소프트웨어": (g, p) => {                    // 모니터 + 코드
        g.rect(2, 2, 16, 1, p.L); g.rect(2, 3, 16, 7, p.A); g.rect(2, 10, 16, 1, p.D);
        g.rect(3, 4, 14, 5, p.K);
        g.line(7, 5, 5, 6.5, p.L); g.line(5, 6.5, 7, 8, p.L);
        g.line(13, 5, 15, 6.5, p.L); g.line(15, 6.5, 13, 8, p.L);
        g.line(11, 5, 9, 8, p.H);
        g.rect(8, 11, 4, 1, p.N); g.rect(5, 12, 10, 1, p.H); g.rect(5, 13, 10, 1, p.S);
    },
    "반도체": (g, p) => {                          // 웨이퍼
        g.disc(10, 7, 6.2, p.A);
        g.ring(10, 7, 6.2, 5.3, p.L);
        for (let x = 5; x <= 15; x += 3) g.line(x, 1, x, 13, p.D);
        for (let y = 3; y <= 12; y += 3) g.line(3, y, 17, y, p.D);
        g.disc(7, 4, 1.5, p.L);
        g.rect(9, 12, 3, 1, p.K); g.rect(10, 13, 1, 1, p.K);
    },
    "운송장비·부품": (g, p) => {                    // 자동차
        g.rect(6, 3, 8, 1, p.L); g.rect(5, 4, 10, 2, p.A);
        g.rect(2, 6, 16, 1, p.L); g.rect(2, 7, 16, 3, p.A); g.rect(2, 10, 16, 1, p.D);
        g.rect(6, 4, 3, 2, p.H); g.rect(11, 4, 3, 2, p.H);
        g.rect(1, 8, 1, 1, p.H); g.rect(18, 8, 1, 1, p.H);
        g.disc(6, 11, 2.2, p.O); g.disc(6, 11, 0.9, p.N);
        g.disc(14, 11, 2.2, p.O); g.disc(14, 11, 0.9, p.N);
        g.rect(2, 13, 16, 1, p.S);
    },
    "의료·정밀기기": (g, p) => {                    // 계기 + 십자
        g.disc(8, 7, 6, p.N); g.ring(8, 7, 6, 5, p.S);
        g.rect(6, 3, 4, 9, p.A); g.rect(3, 5, 10, 4, p.A);
        g.rect(6, 3, 4, 1, p.L); g.rect(3, 5, 3, 1, p.L); g.rect(10, 5, 3, 1, p.L);
        g.rect(6, 11, 4, 1, p.D); g.rect(3, 8, 3, 1, p.D); g.rect(10, 8, 3, 1, p.D);
        g.rect(16, 3, 3, 1, p.H); g.rect(16, 4, 3, 7, p.N); g.rect(16, 11, 3, 1, p.S);
        for (let y = 5; y < 11; y += 2) g.rect(16, y, 2, 1, p.O);
    },
    "비금속광물": (g, p) => {                      // 벽돌
        const brick = (x: number, y: number, w: number, accent: boolean) => {
            g.rect(x, y, w, 1, accent ? p.L : p.H);
            g.rect(x, y + 1, w, 1, accent ? p.A : p.N);
            g.rect(x, y + 2, w, 1, accent ? p.D : p.S);
        };
        brick(2, 2, 7, true); brick(10, 2, 7, false);
        brick(2, 6, 3, false); brick(6, 6, 7, true); brick(14, 6, 4, false);
        brick(2, 10, 7, false); brick(10, 10, 7, true);
        g.rect(1, 13, 18, 1, p.O);
    },
    "오락·문화": (g, p) => {                       // 필름 릴 + 필름
        g.disc(6, 7, 5.4, p.A); g.ring(6, 7, 5.4, 4.5, p.L);
        g.disc(6, 7, 1.5, p.K);
        [[6, 3.6], [6, 10.4], [2.6, 7], [9.4, 7]].forEach(([x, y]) => g.disc(x, y, 1.3, p.K));
        g.rect(12, 3, 7, 1, p.S); g.rect(12, 4, 7, 6, p.N); g.rect(12, 10, 7, 1, p.S);
        for (let y = 4; y < 10; y += 2) { g.rect(12, y, 1, 1, p.O); g.rect(18, y, 1, 1, p.O); }
        g.rect(14, 5, 3, 4, p.H);
    },
    "부동산": (g, p) => {                          // 집
        for (let i = 0; i < 5; i++) g.rect(5 - i + 1, 2 + i, 8 + i * 2, 1, i === 0 ? p.L : p.A);
        g.rect(3, 7, 14, 1, p.D);
        g.rect(4, 8, 12, 1, p.H); g.rect(4, 9, 12, 4, p.N); g.rect(4, 13, 12, 1, p.S);
        g.rect(8, 10, 4, 4, p.K); g.rect(8, 10, 4, 1, p.D);
        g.rect(5, 10, 2, 2, p.H); g.rect(13, 10, 2, 2, p.H);
    },
    "기타제조": (g, p) => {                        // 공장
        g.rect(3, 6, 1, 1, p.L); g.rect(3, 7, 1, 2, p.A);
        g.rect(6, 4, 2, 1, p.L); g.rect(6, 5, 2, 4, p.A);
        g.rect(10, 6, 2, 1, p.L); g.rect(10, 7, 2, 2, p.A);
        g.disc(7, 2, 1.4, p.N); g.disc(9.6, 1.2, 1, p.H); g.disc(4.4, 2.4, 0.9, p.H);
        g.rect(2, 9, 16, 1, p.L); g.rect(2, 10, 16, 3, p.A); g.rect(2, 13, 16, 1, p.K);
        [4, 8, 12, 16].forEach(x => g.rect(x, 11, 2, 2, p.K));
        g.rect(14, 5, 4, 1, p.H); g.rect(14, 6, 4, 3, p.N); g.rect(14, 9, 4, 1, p.S);
    },
    "출판·매체": (g, p) => {                       // 펼친 책
        g.rect(2, 3, 8, 1, p.H); g.rect(2, 4, 8, 8, p.N); g.rect(2, 12, 8, 1, p.S);
        g.rect(10, 3, 8, 1, p.H); g.rect(10, 4, 8, 8, p.N); g.rect(10, 12, 8, 1, p.S);
        g.rect(9, 2, 2, 1, p.L); g.rect(9, 3, 2, 10, p.A); g.rect(9, 13, 2, 1, p.D);
        [5, 7, 9].forEach(y => { g.rect(4, y, 5, 1, p.S); g.rect(11, y, 5, 1, p.S); });
        g.rect(1, 4, 1, 8, p.O); g.rect(18, 4, 1, 8, p.O);
    },
    _default: (g, p) => {
        g.disc(10, 7, 4.6, p.A);
        g.disc(8.4, 5.4, 2.1, p.L);
        g.ring(10, 7, 6.4, 5.8, p.N);
    },
};

function chartSprite(g: Grid, p: Pal, src: number[]) {
    const base = src.length ? src : [3, 5, 4, 7, 6, 9];
    const n = Math.min(7, base.length);
    const vals = Array.from({ length: n }, (_, i) => base[Math.round(i * (base.length - 1) / (n - 1 || 1))]);
    const max = Math.max(...vals, 1);
    const step = 3, w = 2;
    const left = Math.round((GW - (n * step - 1)) / 2);
    vals.forEach((v, i) => {
        const h = Math.max(1, Math.round((v / max) * 10));
        const x = left + i * step, y = 12 - h, last = i === n - 1;
        g.rect(x, y, w, 1, last ? p.L : p.H);
        if (h > 1) g.rect(x, y + 1, w, h - 1, last ? p.A : p.N);
    });
    g.rect(1, 12, 18, 1, p.O);
}

export default function SectorSprite({
    sector, color, mode = "sector", data = [], tint = "#f5f4f1", className,
}: {
    sector?: string;
    color?: string;
    mode?: "sector" | "chart";
    data?: number[];
    tint?: string;
    className?: string;
}) {
    const hostRef = useRef<HTMLDivElement>(null);
    const cvRef = useRef<HTMLCanvasElement>(null);
    const key = `${sector}|${color}|${mode}|${tint}|${data.join(",")}`;

    useEffect(() => {
        const host = hostRef.current, cv = cvRef.current;
        if (!host || !cv) return;
        const draw = () => {
            const box = host.getBoundingClientRect();
            const w = Math.round(box.width) || 160, h = Math.round(box.height) || 96;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            cv.width = w * dpr; cv.height = h * dpr;
            const ctx = cv.getContext("2d");
            if (!ctx) return;
            ctx.imageSmoothingEnabled = false;
            const bg = ctx.createLinearGradient(0, 0, cv.width, cv.height);
            bg.addColorStop(0, "#ffffff"); bg.addColorStop(1, tint);
            ctx.fillStyle = bg; ctx.fillRect(0, 0, cv.width, cv.height);

            const spriteKey = spriteKeyFor(sector);
            const p = palette(color || SECTOR_COLOR[spriteKey ?? ""] || "#16a34a");
            const g = makeGrid();
            if (mode === "chart") chartSprite(g, p, data);
            else (SPRITE[spriteKey ?? ""] || SPRITE._default)(g, p);

            const block = Math.max(1, Math.floor(Math.min(cv.width / GW, cv.height / GH)));
            const ox = Math.round((cv.width - GW * block) / 2);
            const oy = Math.round((cv.height - GH * block) / 2);
            for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
                const c = g.cells[y * GW + x];
                if (!c) continue;
                ctx.fillStyle = c;
                ctx.fillRect(ox + x * block, oy + y * block, block, block);
            }
        };
        draw();
        const ro = new ResizeObserver(draw);
        ro.observe(host);
        return () => ro.disconnect();
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div ref={hostRef} className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
            <canvas ref={cvRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", imageRendering: "pixelated" }} />
        </div>
    );
}
