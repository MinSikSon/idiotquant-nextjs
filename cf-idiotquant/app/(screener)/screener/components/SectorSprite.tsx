"use client";
// 종목 발굴 픽셀 스프라이트 — 의존성 없음, canvas 2D만 사용.
// 20×14 도트 그리드에 블록을 직접 찍기 때문에 어떤 배율에서도 선명하다.
// 사용: <SectorSprite sector="철강·금속" color="#16a34a" />
//       <SectorSprite mode="chart" data={[38,34,41,...]} color="#16a34a" />
import { useEffect, useRef } from "react";

const GW = 20, GH = 14;

export const SECTOR_COLOR: Record<string, string> = {
    "철강·금속": "#16a34a",
    "전기·전자": "#0369a1",
    "기계·장비": "#c2410c",
    "화학": "#6d28d9",
    "운수·창고": "#0f766e",
};

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

            const p = palette(color || SECTOR_COLOR[sector ?? ""] || "#16a34a");
            const g = makeGrid();
            if (mode === "chart") chartSprite(g, p, data);
            else (SPRITE[sector ?? ""] || SPRITE._default)(g, p);

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
