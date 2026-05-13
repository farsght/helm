export async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options)
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      message = body.error || body.message || message
    } catch {}
    throw new Error(message)
  }
  return res.json()
}
