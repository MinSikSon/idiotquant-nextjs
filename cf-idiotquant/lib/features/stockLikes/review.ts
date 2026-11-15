import type { LikedStockItem } from './stockLikesSlice';
import type { WatchSnapshot } from './changes';
import { apiRequest } from '../apiRequest';

export type ReviewBaseline = { revision: number; items: WatchSnapshot[]; confirmedAt: number | null };
export type WatchReview = { items: LikedStockItem[]; baseline: ReviewBaseline };

export const getWatchReview = () => apiRequest('/user/likes/review');
export const confirmWatchReview = (revision: number, items: WatchSnapshot[]) =>
    apiRequest('/user/likes/review', { method: 'POST', body: { revision, items } });
