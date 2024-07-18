export function getChangedTicker(oldTicker: any) {
    if ("이라이콤" == oldTicker) {
        return "이엘씨";
    }
    return oldTicker;
}