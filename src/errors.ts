class BaseError extends Error {
  static async fromResponse(response: Response) {
    try {
      const { message } = await response.clone().json();

      // biome-ignore lint/complexity/noThisInStatic: need this to create the correct error type
      return new this(message);
    } catch (_) {
      // biome-ignore lint/complexity/noThisInStatic: need this to create the correct error type
      return new this(await response.text());
    }
  }

  static from(args: unknown) {
    if (args instanceof Error) {
      const message = BaseError.formatMessage(args);
      // biome-ignore lint/complexity/noThisInStatic: need this to create the correct error type
      return new this(message, { cause: args });
    }
    // biome-ignore lint/complexity/noThisInStatic: need this to create the correct error type
    return new this(String(args));
  }

  private static formatMessage(cause: Error): string {
    const messages: string[] = [];
    let currentError: unknown = cause;

    while (currentError instanceof Error) {
      messages.push(currentError.message);
      currentError = currentError.cause;
    }

    return messages.join(' due to ');
  }
}

export class AuthorizationError extends BaseError {
  name = 'AuthorizationError' as const;

  private constructor(message: string) {
    super(message);
  }
}

export class StorageClientError extends BaseError {
  name = 'StorageClientError' as const;

  private constructor(message: string) {
    super(message);
  }
}

/**
 * An error that occurs when a task violates a logical condition that is assumed to be true at all times.
 */
export class InvariantError extends Error {
  name = 'InvariantError' as const;
}
