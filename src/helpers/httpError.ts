export interface HttpError {
  status: number
  message: string
}

export function toHttpError(err: unknown, defaultMessage: string): HttpError {
  if (err && typeof err === 'object') {
    const e = err as any
    if (typeof e.status === 'number' && typeof e.msg === 'string') {
      return { status: e.status, message: e.msg }
    }
    if (e instanceof Error) {
      return { status: 500, message: e.message }
    }
  }
  if (err instanceof Error) {
    return { status: 500, message: err.message }
  }
  return { status: 500, message: defaultMessage }
}
