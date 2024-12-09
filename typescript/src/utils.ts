import type { EnvironmentConfig } from './environments';
import { InvariantError } from './errors';
import type {
  AclTemplate,
  CreateIndexContent,
  EvmAddress,
  GenericAclTemplate,
  LensAccountAclTemplate,
  Resource,
  WalletAddressAclTemplate,
} from './types';

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

/**
 * @internal
 */
export function parseResource(data: Record<string, string>): Resource {
  return {
    storageKey: data.storage_key ?? never('Missing storage key'),
    gatewayUrl: data.gateway_url ?? never('Missing gateway URL'),
    uri: data.uri ?? never('Missing URI'),
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
    case 'wallet_address':
      return {
        template: acl.template,
        wallet_address: acl.walletAddress,
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

interface Builder<T> {
  reset(): void;
  build(): T;
  isValid(acl: Partial<T>): boolean;
}

/**
 * This ACL template restricts access to any given Wallet Address.
 */
export function walletOnly(address: EvmAddress) {
  return new WalletAddressAclBuilder().setWalletAddress(address).build();
}

class WalletAddressAclBuilder implements Builder<WalletAddressAclTemplate> {
  private acl: Partial<WalletAddressAclTemplate> = { template: 'wallet_address' };

  reset(): void {
    this.acl = { template: 'wallet_address' };
  }

  setWalletAddress(walletAddress: EvmAddress): this {
    this.acl.walletAddress = walletAddress;
    return this;
  }

  build(): WalletAddressAclTemplate {
    if (!this.isValid(this.acl)) {
      throw new Error('WalletAddressAclTemplate is missing required fields');
    }
    return this.acl as WalletAddressAclTemplate;
  }

  isValid(acl: Partial<WalletAddressAclTemplate>): acl is WalletAddressAclTemplate {
    return !!(acl.template === 'wallet_address' && acl.walletAddress);
  }
}

/**
 * This ACL template restricts access to any given Lens Account.
 */
export function lensAccountOnly(account: EvmAddress) {
  return new LensAccountAclTemplateBuilder().setLensAccount(account).build();
}

class LensAccountAclTemplateBuilder implements Builder<LensAccountAclTemplate> {
  private acl: Partial<LensAccountAclTemplate> = { template: 'lens_account' };

  reset(): void {
    this.acl = { template: 'lens_account' };
  }

  setLensAccount(lensAccount: EvmAddress): this {
    this.acl.lensAccount = lensAccount;
    return this;
  }

  build(): LensAccountAclTemplate {
    if (!this.isValid(this.acl)) {
      throw new Error('LensAccountAclTemplate is missing required fields');
    }
    return this.acl as LensAccountAclTemplate;
  }

  isValid(acl: Partial<LensAccountAclTemplate>): acl is LensAccountAclTemplate {
    return !!(acl.template === 'lens_account' && acl.lensAccount);
  }
}

/**
 * This ACL template restricts access to any given address that satisfies the contract call evaluation.
 * When using this template, the contractAddress, functionSig and params parameters must be set.
 */
export function genericAcl(contractAddress: EvmAddress, functionSig: string, params: string[]) {
  return new GenericAclTemplateBuilder()
    .setContractAddress(contractAddress)
    .setFunctionSig(functionSig)
    .setParams(params)
    .build();
}

class GenericAclTemplateBuilder implements Builder<GenericAclTemplate> {
  private acl: Partial<GenericAclTemplate> = { template: 'generic_acl' };

  reset(): void {
    this.acl = { template: 'generic_acl' };
  }

  setContractAddress(contractAddress: EvmAddress): this {
    this.acl.contractAddress = contractAddress;
    return this;
  }

  setFunctionSig(functionSig: string): this {
    this.acl.functionSig = functionSig;
    return this;
  }

  setParams(params: string[]): this {
    this.acl.params = params;
    return this;
  }

  build(): GenericAclTemplate {
    if (!this.isValid(this.acl)) {
      throw new Error('GenericAclTemplate is missing required fields');
    }
    return this.acl as GenericAclTemplate;
  }

  isValid(acl: Partial<GenericAclTemplate>): acl is GenericAclTemplate {
    return !!(
      acl.template === 'generic_acl' &&
      acl.contractAddress &&
      acl.functionSig &&
      acl.params
    );
  }
}
