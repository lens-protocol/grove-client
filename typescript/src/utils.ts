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

/**
 * Creates a multipart/form-data stream from a list of entries.
 *
 * @internal
 * @param entries - The list of files to create the stream from
 * @returns The multipart/form-data stream and the boundary string
 */
export function createMultipartStream(entries: readonly MultipartEntry[]): MultipartFormDataStream {
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

/**
 * The Lens URI scheme.
 */
export const LENS_SCHEME = 'lens';

const LENS_URI_SUFFIX = `${LENS_SCHEME}://`;

/**
 * @internal
 */
export function extractLinkHash(linkHashOrUri: string): string {
  if (linkHashOrUri.startsWith(LENS_URI_SUFFIX)) {
    return linkHashOrUri.slice(LENS_URI_SUFFIX.length);
  }
  return linkHashOrUri;
}

/**
 * @internal
 */
export function resourceFrom(linkHash: string): Resource {
  return {
    linkHash,
    uri: `${LENS_SCHEME}://${linkHash}`,
  };
}

function createAclTemplateContent(
  acl: AclTemplate,
  env: EnvironmentConfig,
): Record<string, unknown> {
  switch (acl.template) {
    case 'generic_acl':
      return {
        template: acl.template,
        contract_address: acl.contractAddress,
        chain_id: env.chainId,
        network_type: 'evm',
        function_sig: acl.functionSig,
        params: acl.params,
      };
    case 'lens_account':
      return {
        template: acl.template,
        lens_account: acl.lensAccount,
      };

    default:
      never(`Unknown ACL template: ${acl}`);
  }
}

function createAclEntry(template: AclTemplate, env: EnvironmentConfig): MultipartEntry {
  const name = 'lens-acl.json';
  const content = createAclTemplateContent(template, env);

  return {
    name,
    file: new File([JSON.stringify(content)], name, {
      type: 'application/json',
    }),
  };
}

function createDefaultIndexContent(fileHashes: readonly string[]): Record<string, unknown> {
  return {
    files: fileHashes,
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

  private constructor(private readonly fileHashes: readonly string[]) {}

  static from(fileHashes: readonly string[]): MultipartEntriesBuilder {
    return new MultipartEntriesBuilder(fileHashes);
  }

  withFile(file: File): MultipartEntriesBuilder {
    this.entries.push({
      name: this.fileHashes[this.idx++] ?? never('Unexpected file, no hash available'),
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

  withAclTemplate(template: AclTemplate, env: EnvironmentConfig): MultipartEntriesBuilder {
    this.entries.push(createAclEntry(template, env));
    return this;
  }

  withIndexFile(index: CreateIndexContent | File | true): MultipartEntriesBuilder {
    const file =
      index instanceof File
        ? index
        : createIndexFile(
            index === true
              ? createDefaultIndexContent(this.fileHashes)
              : index.call(null, this.fileHashes.map(resourceFrom)),
          );

    invariant(file.name === 'index.json', "Index file must be named 'index.json'");

    return this.withFile(file);
  }

  build(): ReadonlyArray<MultipartEntry> {
    return this.entries;
  }
}
