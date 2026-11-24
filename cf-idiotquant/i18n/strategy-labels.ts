import { useTranslations } from "next-intl";
import type messages from "../messages/ko.json";

type Strategy = keyof typeof messages.strategies;
type Field = "label" | "formula" | "hint";

export function useStrategyText() {
    const t = useTranslations("strategies");
    return (id: string, field: Field = "label", fallback = id) => {
        const key = `${id as Strategy}.${field}` as const;
        return t.has(key) ? t(key) : fallback;
    };
}
