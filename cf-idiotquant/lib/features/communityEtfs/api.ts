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
export type CommunityEtfInput = CommunityEtfDraft & { name: string; idea: string };

export async function getCommunityEtfs(limit = 20, offset = 0) {
    return apiRequest(`/community/etfs?limit=${limit}&offset=${offset}`) as Promise<{ success: boolean; data?: CommunityEtf[]; error?: string }>;
}

export async function createCommunityEtf(body: CommunityEtfInput) {
    return apiRequest("/community/etfs", { method: "POST", body }) as Promise<{ success: boolean; data?: CommunityEtf; error?: string }>;
}

export async function setCommunityEtfLike(id: string, liked: boolean) {
    return apiRequest(`/community/etfs/${encodeURIComponent(id)}/like`, { method: liked ? "POST" : "DELETE" }) as Promise<{ success: boolean; liked?: boolean; likeCount?: number; error?: string }>;
}
