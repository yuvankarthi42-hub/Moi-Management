/** Raised when input fails a business rule. Screens surface `.message` as-is. */
export class ValidationError extends Error {
  /** Field the message belongs to, when it maps to one input. */
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} could not be found.`);
    this.name = 'NotFoundError';
  }
}
