class BaseError extends Error {

  static async fromResponse(response: Response) {
    try {
      const { message } = await response.clone().json();

      // biome-ignore lint/complexity/noThisInStatic: <explanation>
      return new this(message);
    } catch (error) {
      // biome-ignore lint/complexity/noThisInStatic: <explanation>
      return new this(await response.text());
    }
  }
}

export class AuthorizationError extends BaseError {
  name = "AuthorizationError" as const

  private constructor(message: string) {
    super(message)
  }
}


export class StorageClientError extends BaseError {
  name = 'StorageClientError' as const;

  private constructor(message: string) {
    super(message)
  }
}
