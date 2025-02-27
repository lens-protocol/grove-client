import type { EnvironmentConfig } from './environments';
import { InvariantError } from './errors';
import type { AclTemplate, CreateIndexContent, Resource } from './types';

/**
 * Asserts that the given condition is truthy
 * @internal
 *
 * @param condition - Either truthy or falsy value
 * @param message - An error message
 */
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new InvariantError(message);
  }
}

/**
 * @internal
 */
export function never(message = 'Unexpected call to never()'): never {
  throw new InvariantError(message);
}

/**
 * @internal
 */
export type MultipartEntry = {
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

async function* multipartStream(entries: readonly MultipartEntry[], boundary: string) {
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

    yield '\r\n';
  }

  yield `--${boundary}--\r\n`;
}

function createMultipartStream(entries: readonly MultipartEntry[]): MultipartFormDataStream {
  const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;

  return {
    stream: new ReadableStream({
      async start(controller) {
        for await (const chunk of multipartStream(entries, boundary)) {
          if (typeof chunk === 'string') {
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

async function detectStreamSupport(): Promise<boolean> {
  try {
    const testStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([0])); // Minimal stream chunk
        controller.close();
      },
    });

    const request = new Request('data:text/plain;charset=utf-8,42', {
      method: 'POST',
      body: testStream,
      // Required for streaming request body in some browsers,
      // or it will fail and assume it's not supported
      // @ts-ignore
      duplex: 'half',
    });

    // If fails to handle fetch(Request), it's likely not a native implementation of
    // Fetch API, so it's not supported.
    await fetch(request.clone());

    const body = await request.text();
    // if different from '\x00', it's likely not supported
    return body === '\x00';
  } catch {
    return false;
  }
}

function createFormData(entries: readonly MultipartEntry[]): FormData {
  const formData = new FormData();

  for (const { name, file } of entries) {
    formData.append(name, file, file.name);
  }

  return formData;
}

function computeMultipartSize(entries: readonly MultipartEntry[], boundary: string): number {
  let size = 0;
  const encoder = new TextEncoder();

  for (const { name, file } of entries) {
    // Each part starts with the boundary
    size += encoder.encode(`--${boundary}\r\n`).length;

    // Content-Disposition header
    size += encoder.encode(
      `Content-Disposition: form-data; name="${name}"; filename="${file.name}"\r\n`,
    ).length;

    // Content-Type header
    size += encoder.encode(`Content-Type: ${file.type}\r\n\r\n`).length;

    // File content size
    size += file.size;

    // CRLF after file content
    size += encoder.encode('\r\n').length;
  }

  // Final boundary
  size += encoder.encode(`--${boundary}--\r\n`).length;

  return size;
}

/**
 * Creates a multipart/form-data RequestInit object from a list of entries.
 *
 * @internal
 */
export async function createMultipartRequestInit(
  method: 'POST' | 'PUT',
  entries: readonly MultipartEntry[],
): Promise<RequestInit> {
  if (await detectStreamSupport()) {
    const { stream, boundary } = createMultipartStream(entries);

    return {
      method,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': computeMultipartSize(entries, boundary).toString(),
      },
      body: stream,
      // @ts-ignore
      duplex: 'half', // Required for streaming request body in some browsers
    };
  }

  // Fallback to FormData for browsers without ReadableStream support as Fetch body
  const formData = createFormData(entries);

  return {
    method,
    body: formData,
  };
}

/**
 * The Lens URI scheme.
 */
export const LENS_SCHEME = 'lens';

const LENS_URI_SUFFIX = `${LENS_SCHEME}://`;

/**
 * @internal
 */
export function extractStorageKey(storageKeyOrUri: string): string {
  if (storageKeyOrUri.startsWith(LENS_URI_SUFFIX)) {
    return storageKeyOrUri.slice(LENS_URI_SUFFIX.length);
  }
  return storageKeyOrUri;
}

/**
 * @internal
 */
export function resourceFrom(storageKey: string, env: EnvironmentConfig): Resource {
  return {
    storageKey,
    gatewayUrl: `${env.backend}/${storageKey}`,
    uri: `${LENS_SCHEME}://${storageKey}`,
  };
}

function createAclTemplateContent(acl: AclTemplate): Record<string, unknown> {
  switch (acl.template) {
    case 'generic_acl':
      return {
        template: acl.template,
        contract_address: acl.contractAddress,
        chain_id: acl.chainId,
        network_type: 'evm',
        function_sig: acl.functionSig,
        params: acl.params,
      };
    case 'lens_account':
      return {
        template: acl.template,
        lens_account: acl.lensAccount,
        chain_id: acl.chainId,
      };
    case 'wallet_address':
      return {
        template: acl.template,
        wallet_address: acl.walletAddress,
        chain_id: acl.chainId,
      };
    case 'immutable':
      return {
        template: acl.template,
        chain_id: acl.chainId,
      };

    default:
      never(`Unknown ACL template: ${acl}`);
  }
}

function createAclEntry(template: AclTemplate): MultipartEntry {
  const name = 'lens-acl.json';
  const content = createAclTemplateContent(template);

  return {
    name,
    file: new File([JSON.stringify(content)], name, {
      type: 'application/json',
    }),
  };
}

function createDefaultIndexContent(files: readonly Resource[]): Record<string, unknown> {
  return {
    files: files.map((file) => file.storageKey),
  };
}

function createIndexFile(content: unknown): File {
  return new File([JSON.stringify(content)], 'index.json', {
    type: 'application/json',
  });
}

/**
 * @internal
 */
export class MultipartEntriesBuilder {
  private idx = 0;
  private entries: MultipartEntry[] = [];

  private constructor(private readonly allocations: readonly Resource[]) {}

  static from(allocations: readonly Resource[]): MultipartEntriesBuilder {
    return new MultipartEntriesBuilder(allocations);
  }

  withFile(file: File): MultipartEntriesBuilder {
    this.entries.push({
      name:
        this.allocations[this.idx++]?.storageKey ??
        never('Unexpected file, no storage key available'),
      file,
    });
    return this;
  }

  withFiles(files: readonly File[]): MultipartEntriesBuilder {
    for (const file of files) {
      this.withFile(file);
    }
    return this;
  }

  withAclTemplate(template: AclTemplate): MultipartEntriesBuilder {
    this.entries.push(createAclEntry(template));
    return this;
  }

  withIndexFile(index: CreateIndexContent | File | true): MultipartEntriesBuilder {
    const file =
      index instanceof File
        ? index
        : createIndexFile(
            index === true
              ? createDefaultIndexContent(this.allocations)
              : index.call(null, this.allocations.slice()), // shallow copy
          );

    invariant(file.name === 'index.json', "Index file must be named 'index.json'");

    return this.withFile(file);
  }

  build(): ReadonlyArray<MultipartEntry> {
    return this.entries;
  }
}
