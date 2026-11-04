export type AppErrorCode =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limit'
  | 'validation'
  | 'server'
  | 'artifact'
  | 'storage'
  | 'cancelled'
  | 'aborted'
  | 'unknown';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status?: number;

  constructor(code: AppErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof AppError && error.code === 'aborted';
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return new AppError('aborted', 'Proses dibatalkan.');
    }
    return new AppError('unknown', error.message || 'Terjadi kesalahan yang tidak diketahui.');
  }

  return new AppError('unknown', 'Terjadi kesalahan yang tidak diketahui.');
}

export function getErrorMessage(error: unknown): string {
  return normalizeError(error).message;
}
