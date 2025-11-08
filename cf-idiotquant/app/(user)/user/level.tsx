
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

export function getProgress(point: number) {
    let targetPoint = 49000;
    if (100 > point) targetPoint = 100;
    else if (200 > point) targetPoint = 200;
    else if (400 > point) targetPoint = 400;
    else if (800 > point) targetPoint = 800;
    else if (1600 > point) targetPoint = 1600;
    else if (3200 > point) targetPoint = 3300;
    else if (6400 > point) targetPoint = 6400;
    else if (12800 > point) targetPoint = 12800;
    else if (25600 > point) targetPoint = 25600;
    else if (51200 <= point) targetPoint = point;

    let progress = 0
    if (0 != point) {
        const diff = (100 <= targetPoint) ? targetPoint / 2 : 0;
        progress = Number((100 * (point - diff) / (targetPoint - diff)).toFixed(0));
    }

    // console.log(`point:`, point, `, targetPoint:`, targetPoint, `, progress:`, progress);
    return progress;
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