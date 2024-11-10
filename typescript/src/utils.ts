/**
 * An error that occurs when a task violates a logical condition that is assumed to be true at all times.
 */
export class InvariantError extends Error {
  name = "InvariantError" as const;
}

/**
 * Asserts that the given condition is truthy
 * @internal
 *
 * @param condition - Either truthy or falsy value
 * @param message - An error message
 */
export function invariant(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new InvariantError(message);
  }
}

/**
 * @internal
 */
export function never(message = "Unexpected call to never()"): never {
  throw new InvariantError(message);
}

export type NameFilePair = {
  name: string;
  file: File;
};

/**
 * @internal
 */
export type MultipartFormDataStream = {
  boundary: string;
  stream: ReadableStream<Uint8Array>;
};

async function* fileListToMultipartStream(
  entries: NameFilePair[],
  boundary: string,
) {
  for (const { name, file } of entries) {
    yield `--${boundary}\r\n`;

    yield `Content-Disposition: form-data; name="${name}"; filename="${file.name}"\r\n`;
    yield `Content-Type: ${file.type}\r\n\r\n`;

    const reader = file.stream().getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield value;
    }

    yield "\r\n";
  }

  yield `--${boundary}--\r\n`;
}

/**
 * Creates a multipart/form-data stream from a list of files.
 *
 * @internal
 * @param entries - The list of files to create the stream from
 * @returns The multipart/form-data stream and the boundary string
 */
export function createMultipartFormDataStream(
  entries: NameFilePair[],
): MultipartFormDataStream {
  const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;

  return {
    stream: new ReadableStream({
      async start(controller) {
        for await (const chunk of fileListToMultipartStream(
          entries,
          boundary,
        )) {
          if (typeof chunk === "string") {
            controller.enqueue(new TextEncoder().encode(chunk));
          } else {
            controller.enqueue(chunk); // Enqueue Uint8Array chunks directly
          }
        }
        controller.close();
      },
    }),
    boundary,
  };
}

/**
 * The Lens URI scheme.
 */
export const LENS_SCHEME = "lens";

const LENS_URI_SUFFIX = `${LENS_SCHEME}://`;

export function extractLinkHash(linkHashOrUri: string): string {
  if (linkHashOrUri.startsWith(LENS_URI_SUFFIX)) {
    return linkHashOrUri.slice(LENS_URI_SUFFIX.length);
  }
  return linkHashOrUri;
}
