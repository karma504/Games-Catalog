const threshold = () => {
  const n = Number(process.env.SLOW_REQUEST_SECONDS)
  return Number.isFinite(n) && n > 0 ? n : 1
}

export function withTiming<A extends any[]>(handler: (req: Request, ...rest: A) => Promise<Response>) {
  return async (req: Request, ...rest: A): Promise<Response> => {
    const started = performance.now()
    const response = await handler(req, ...rest)
    const elapsed = (performance.now() - started) / 1000
    try {
      response.headers.set('X-Response-Time', `${Math.round(elapsed * 1000)}ms`)
    } catch {
    }
    if (elapsed > threshold()) {
      const url = new URL(req.url)
      console.warn(
        `[повільний запит] ${req.method} ${url.pathname}${url.search} — ${elapsed.toFixed(2)} с (статус ${response.status})`,
      )
    }
    return response
  }
}
