
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
    if (200 > point) targetPoint = 200;
    if (400 > point) targetPoint = 400;
    if (800 > point) targetPoint = 800;
    if (1500 > point) targetPoint = 1500;
    if (3000 > point) targetPoint = 3000;
    if (6000 > point) targetPoint = 6000;
    if (12000 > point) targetPoint = 12000;
    if (25000 > point) targetPoint = 25000;
    if (49000 <= point) targetPoint = point;

    return (point) / targetPoint * 100;
}

export function getBadgeColor(point: number) {
    let color: "primary" | "secondary" | "info" | "success" | "warning" | "error" | undefined = undefined;

    if (100 > point) {
        color = undefined;
    }
    if (200 > point) {
        color = "info";
    }
    if (400 > point) {
        color = "success";
    }
    if (800 > point) {
        color = "warning";
    }
    if (1500 > point) {
        color = "error";
    }
    if (3000 > point) {
        color = "primary";
    }
    if (6000 > point) {
        color = "secondary";
    }
    if (12000 > point) {
        color = "secondary";
    }
    if (25000 > point) {
        color = "secondary";
    }
    if (49000 <= point) {
        color = "secondary";
    }

    return color;
}