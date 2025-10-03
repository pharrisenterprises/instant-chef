async function postJSON<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // Try JSON, but fall back to text to avoid “Unexpected end of JSON input”
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  let data: any = null;
  try { data = ct.includes("application/json") ? JSON.parse(text) : JSON.parse(text); }
  catch { /* text wasn’t JSON */ }

  if (!res.ok) {
    throw new Error(
      data?.error
        ? `${data.error}${data.details ? `: ${data.details}` : ""}`
        : `Request failed (${res.status}) ${text?.slice(0, 200) || ""}`
    );
  }
  if (data == null) throw new Error("Empty response from server");
  return data as T;
}
