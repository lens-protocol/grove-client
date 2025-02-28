import type { StorageClient } from './StorageClient';
import { StorageClientError } from './errors';
import { delay } from './utils';

export type EvmAddress = `0x${string}`;

export type GenericAclTemplate = {
  template: 'generic_acl';
  chainId: number;
  contractAddress: string;
  functionSig: string;
  // biome-ignore lint/suspicious/noExplicitAny: keep it simple
  params: any[];
};

export type ImmutableAclTemplate = {
  template: 'immutable';
  chainId: number;
};

export type LensAccountAclTemplate = {
  template: 'lens_account';
  lensAccount: EvmAddress;
  chainId: number;
};

export type WalletAddressAclTemplate = {
  template: 'wallet_address';
  walletAddress: EvmAddress;
  chainId: number;
};

export type AclTemplate =
  | GenericAclTemplate
  | ImmutableAclTemplate
  | LensAccountAclTemplate
  | WalletAddressAclTemplate;

export interface Signer {
  signMessage({ message }: { message: string }): Promise<string>;
}

export type AccessOptions = {
  /**
   * The ACL template to use for the resource.
   *
   * @defaultValue {@link ImmutableAclTemplate} bound to the Lens Chain ID
   */
  acl?: AclTemplate;
};

export type UploadFileOptions = AccessOptions;

export type UploadJsonOptions = UploadFileOptions & {
  /**
   * The name of the file.
   *
   * @defaultValue `data.json`
   */
  name?: string;
};

/**
 * A factory function that, given the list of {@link Resource},
 * creates a JSON serializable object that will be used as the
 * directory index file.
 */
export type CreateIndexContent = (files: Resource[]) => unknown;

export type UploadFolderOptions = AccessOptions & {
  /**
   * Whether accession the resource URI should serve an folder indexing response.
   * - If a {@link CreateIndexContent} function is provided, it will be called with the list of files in the folder. The returned file will be used as the directory index file.
   * - If a `File` is provided, the file content will be used as the directory index file.
   * - If `true`, it will server the default directory indexing response.
   * - If `false`, it will server the folder's manifest file.
   */
  index?: CreateIndexContent | File | boolean;
};

export type EditFileOptions = AccessOptions;

export type Resource = {
  /**
   * The `lens://…` URI of the resource.
   */
  uri: string;

  /**
   * The storage key of the resource.
   */
  storageKey: string;

  /**
   * The gateway URL of this resource.
   */
  gatewayUrl: string;
};

export type UploadFolderResponse = {
  files: Resource[];
  folder: Resource;
};

/**
 * @internal
 */
abstract class UploadResponse {
  constructor(
    private readonly resource: Resource,
    private readonly client: StorageClient,
  ) {}
  /**
   * Wait until the resource is persisted in long term storage.
   *
   * Edit and delete operations are only allowed after the resource is fully persisted.
   */
  async waitUntilPersisted(): Promise<void> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < this.client.env.persistanceTimeout) {
      try {
        const { status } = await this.client.status(this.resource.storageKey);

        switch (status) {
          case 'done':
            return;

          case 'error_upload':
          case 'error_edit':
          case 'error_delete':
          case 'unauthorized':
            throw StorageClientError.from(
              `The resource ${this.resource.storageKey} has returned a '${status}' status.`,
            );

          default: // new, pending, idle
            await delay(this.client.env.persistancePollingInterval);
            break;
        }
      } catch (error) {
        throw StorageClientError.from(error);
      }
    }
    throw StorageClientError.from(`Timeout waiting for ${this.resource.uri} to be persisted.`);
  }
}

export class FileUploadResponse extends UploadResponse {
  /**
   * The `lens://…` URI of the file.
   */
  public uri: string;

  /**
   * The storage key of the file.
   */
  public storageKey: string;

  /**
   * The gateway URL of this file.
   */
  public gatewayUrl: string;

  constructor(resource: Resource, client: StorageClient) {
    super(resource, client);
    this.uri = resource.uri;
    this.storageKey = resource.storageKey;
    this.gatewayUrl = resource.gatewayUrl;
  }
}

export type Status = {
  /**
   * The storage key of the resource.
   */
  storageKey: string;
  /**
   * The current status.
   */
  status: 'done' | 'new' | 'unauthorized' | 'error_upload' | 'error_edit' | 'error_delete';
  /**
   * A percentage value between 0-100 indicating the progress of the resource's persistence.
   *
   * This is not linear and may experience jumps.
   */
  progress: number;
};
