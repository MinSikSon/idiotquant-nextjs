/** PeerJS의 종료된 기본 TURN 서비스 대신 서버에서 발급한 단기 인증을 쓴다. */
export const DIRECT_ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:stun.l.google.com:19302" },
];

export async function loadOnlineConfig(): Promise<{ config: RTCConfiguration; relay: boolean }> {
    try {
        const response = await fetch("/api/public/games/ice", {
            method: "POST", cache: "no-store", signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.iceServers) && data.iceServers.length) {
                return { config: { iceServers: data.iceServers }, relay: data.relay === true };
            }
        }
    } catch { /* 중계 설정 요청 실패가 같은 망의 직접 연결까지 막지는 않는다. */ }
    return { config: { iceServers: DIRECT_ICE_SERVERS }, relay: false };
}

export function onlineErrorMessage(type: string, relay: boolean): string {
    if (type === "peer-unavailable") return "방을 찾지 못했습니다. 방 번호와 방장의 접속 상태를 확인해 주세요.";
    if (type === "browser-incompatible") return "이 브라우저는 온라인 연결을 지원하지 않습니다. Safari나 Chrome으로 열어 주세요.";
    if (type === "unavailable-id") return "방 번호가 이미 사용 중입니다. 기존 방장 탭을 닫거나 새 방을 만들어 주세요.";
    if (type === "room-timeout") return "방장에게 연결됐지만 방 정보를 받지 못했습니다. 방장 화면을 확인해 주세요.";
    if (type === "webrtc") return relay
        ? "기기 사이 연결에 실패했습니다. 네트워크를 바꾸거나 잠시 후 다시 시도해 주세요."
        : "기기 사이 직접 연결에 실패했고 우회 연결을 사용할 수 없습니다. 같은 와이파이에서 다시 시도해 주세요.";
    return "온라인 연결 서버에 접속하지 못했습니다. 인터넷 연결을 확인해 주세요.";
}
