

export function getYearAndQuarterByDate(date: string) {
    const year = parseInt(date.slice(0, 4));
    const month = date.slice(4, 6);
    const quarter = Math.floor((parseInt(month) - 1) / 3) + 1;
    return { year, quarter };
}

export function getPrevYearAndQuarter(year: number, quarter: number) {
    switch (quarter) {
        case 1:
            year--;
            quarter = 4;
            break;
        case 2:
        case 3:
        case 4:
            quarter--;
            break;
    }

    return { year, quarter };
}