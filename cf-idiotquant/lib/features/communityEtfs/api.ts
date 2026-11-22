import { apiRequest } from "@/lib/features/apiRequest";

export type EtfMarket = "KR" | "US";
export type CommunityEtfHolding = { ticker: string; name: string };
export type CommunityEtf = {
    id: string;
    creator: { name: string };
    market: EtfMarket;
    name: string;
    idea: string;
    holdings: CommunityEtfHolding[];
    createdAt: number;
    likeCount: number;
    likedByMe: boolean;
};
export type CommunityEtfDraft = {
    market: EtfMarket;
    holdings: CommunityEtfHolding[];
};
export type CommunityEtfDescription = Pick<CommunityEtf, "name" | "idea">;
export type CommunityEtfInput = CommunityEtfDraft & CommunityEtfDescription;

export async function getCommunityEtfs(limit = 20, offset = 0, mine = false) {
    return apiRequest(`/community/etfs?limit=${limit}&offset=${offset}${mine ? "&mine=1" : ""}`) as Promise<{ success: boolean; data?: CommunityEtf[]; error?: string }>;
}

export async function createCommunityEtf(body: CommunityEtfInput) {
    return apiRequest("/community/etfs", { method: "POST", body }) as Promise<{ success: boolean; data?: CommunityEtf; error?: string }>;
}

export async function setCommunityEtfLike(id: string, liked: boolean) {
    return apiRequest(`/community/etfs/${encodeURIComponent(id)}/like`, { method: liked ? "POST" : "DELETE" }) as Promise<{ success: boolean; liked?: boolean; likeCount?: number; error?: string }>;
}

export async function updateCommunityEtf(id: string, body: CommunityEtfDescription) {
    return apiRequest(`/community/etfs/${encodeURIComponent(id)}`, { method: "PATCH", body }) as Promise<{ success: boolean; data?: CommunityEtfDescription; error?: string }>;
}

export async function deleteCommunityEtf(id: string) {
    return apiRequest(`/community/etfs/${encodeURIComponent(id)}`, { method: "DELETE" }) as Promise<{ success: boolean; error?: string }>;
}
