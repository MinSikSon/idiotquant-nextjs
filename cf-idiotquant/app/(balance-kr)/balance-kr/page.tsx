import { redirect } from "next/navigation";

// 기존 주소의 계좌 선택 쿼리를 보존하고 국가만 해당 화면으로 고정한다.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach(item => params.append(key, item));
    else if (value !== undefined) params.set(key, value);
  }
  params.set("country", "kr");
  redirect(`/balance?${params.toString()}`);
}
