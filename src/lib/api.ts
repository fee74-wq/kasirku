export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiError("Kamu sedang offline. Perubahan disimpan di perangkat dulu ya.", 0, "offline");
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError("Balasan server tidak dikenali.", res.status);
  }
  if (!res.ok) {
    const err = (data ?? {}) as { error?: string; code?: string };
    throw new ApiError(err.error ?? "Terjadi kesalahan.", res.status, err.code);
  }
  return (data ?? {}) as T;
}
