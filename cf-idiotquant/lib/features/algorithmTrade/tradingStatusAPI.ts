export async function fetchTradingStatus(country: "KR" | "US"): Promise<boolean | null> {
  try {
    const res = await fetch(`/api/proxy/trading/account-status?country=${country}`);
    const json = await res.json();
    if (!json.success) return null;
    return json.data.is_active as boolean;
  } catch {
    return null;
  }
}

export async function setTradingActive(country: "KR" | "US", isActive: boolean): Promise<boolean> {
  const res = await fetch(`/api/proxy/trading/account-status?country=${country}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: isActive }),
  });
  const json = await res.json();
  return json.success === true;
}
