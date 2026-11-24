import { useTranslations } from "next-intl";

export function LockedAnalysisValue() {
  const t = useTranslations("analysis");
  return (
    <>
      <span className="sr-only">{t("locked")}</span>
      <span aria-hidden="true" className="inline-block select-none text-neutral-500 blur-[3px] dark:text-neutral-400">0000</span>
    </>
  );
}
