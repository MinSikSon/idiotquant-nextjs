"use client";

export type ComparisonChoice = { selected: boolean; disabled: boolean; toggle: () => void };

export function ComparisonCheckbox({ choice, name }: { choice?: ComparisonChoice; name: string }) {
    if (!choice) return null;
    return <input type="checkbox" aria-label={`${name} 비교 선택`} checked={choice.selected}
        disabled={choice.disabled} onChange={choice.toggle}
        onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}
        className="h-5 w-5 shrink-0 cursor-pointer accent-brand disabled:cursor-not-allowed" />;
}
