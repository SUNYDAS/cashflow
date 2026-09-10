/** An error carrying an HTTP status code, thrown from anywhere in a route. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound = (what: string) => new HttpError(404, `${what} not found`);
export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, details);
