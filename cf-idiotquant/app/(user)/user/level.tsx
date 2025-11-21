
export function getLevel(point: number) {
    if (100 > point) {
        return "Lv1. 견습생";
    }
    if (200 > point) {
        return "Lv2. 탐험가";
    }
    if (400 > point) {
        return "Lv3. 정착자";
    }
    if (800 > point) {
        return "Lv4. 전문가";
    }
    if (1500 > point) {
        return "Lv5. 베테랑";
    }
    if (3000 > point) {
        return "Lv6. 선봉대";
    }
    if (6000 > point) {
        return "Lv7. 마스터";
    }
    if (12000 > point) {
        return "Lv8. 영웅";
    }
    if (25000 > point) {
        return "Lv9. 천재";
    }
    if (49000 <= point) {
        return "Lv10. 신화";
    }

    return "Lv 0. (신생아)";
}

export function xpBucket(xp: any) {
    if (typeof xp !== "number" || Number.isNaN(xp) || xp < 0) {
        throw new Error("xp must be a non-negative number");
    }

    const n = Math.floor(xp / 100);            // 0,1,2,...
    const k = n <= 0 ? 0 : Math.floor(Math.log2(n)); // n==0 -> k=0
    const denom = 100 * (2 ** k);
    const num = xp % denom;
    const progressRatio = denom === 0 ? 0 : num / denom;

    return { xp, denom, num, progressRatio };
}

export function getBadgeColor(point: number) {
    let color: "primary" | "secondary" | "info" | "success" | "warning" | "error" | undefined = undefined;

    if (100 > point) color = undefined;
    else if (200 > point) color = "info";
    else if (400 > point) color = "success";
    else if (800 > point) color = "warning";
    else if (1500 > point) color = "error";
    else if (3000 > point) color = "primary";
    else if (6000 > point) color = "secondary";
    else if (12000 > point) color = "secondary";
    else if (25000 > point) color = "secondary";
    else if (49000 <= point) color = "secondary";

    return color;
}