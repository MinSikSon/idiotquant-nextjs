/** 공개 발굴 결과만 잠깐 재사용한다. 계좌·인증 응답에는 사용하지 않는다. */
export function createPublicRequestCache<T>(ttlMs = 30_000, capacity = 4, now = Date.now) {
    const entries = new Map<string, { expires: number; promise: Promise<T> }>();
    return async (key: string, load: () => Promise<T>, force = false): Promise<T> => {
        const cached = entries.get(key);
        if (!force && cached && cached.expires > now()) return structuredClone(await cached.promise);
        const entry = { expires: now() + ttlMs, promise: Promise.resolve().then(load) };
        entries.delete(key);
        entries.set(key, entry);
        if (entries.size > capacity) entries.delete(entries.keys().next().value!);
        try {
            const result = await entry.promise;
            entry.expires = now() + ttlMs;
            return structuredClone(result);
        } catch (error) {
            if (entries.get(key) === entry) entries.delete(key);
            throw error;
        }
    };
}
