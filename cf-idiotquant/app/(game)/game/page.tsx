import { permanentRedirect } from "next/navigation";

export default async function LegacyGamePage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
        if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
        else if (value !== undefined) params.set(key, value);
    }
    const query = params.toString();
    permanentRedirect(`/games${query ? `?${query}` : ""}`);
}
