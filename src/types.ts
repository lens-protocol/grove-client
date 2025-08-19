import type { StorageClient } from './StorageClient';

export type EvmAddress = `0x${string}`;

export type GenericAcl = {
  template: 'generic_acl';
  chainId: number;
  contractAddress: string;
  functionSig: string;
  // biome-ignore lint/suspicious/noExplicitAny: keep it simple
  params: any[];
};

export type ImmutableAcl = {
  template: 'immutable';
  chainId: number;
};

export type LensAccountAcl = {
  template: 'lens_account';
  lensAccount: EvmAddress;
  chainId: number;
};

export type WalletAddressAcl = {
  template: 'wallet_address';
  walletAddress: EvmAddress;
  chainId: number;
};

export type AclConfig =
  | GenericAcl
  | ImmutableAcl
  | LensAccountAcl
  | WalletAddressAcl;

/**
 * The marker used to identify the address of the signer attempting
 * to update or delete a resource.
 */
export const RECOVERED_ADDRESS_PARAM_MARKER = '<recovered_address>';

export interface Signer {
  signMessage({ message }: { message: string }): Promise<string>;
}

export type AccessOptions = {
  /**
   * The ACL configuration to use for the resource.
   */
  acl: AclConfig;
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

abstract class UploadResponse {
  constructor(
    private readonly resource: Resource,
    private readonly client: StorageClient,
  ) {}
  /**
   * Wait until the resource is fully propagated to the underlying storage infrastructure.
   *
   * Edit and delete operations are only allowed after the resource if fully propagated.
   *
   * @throws a {@link StorageClientError} if the operation fails or times out.
   */
  async waitForPropagation(): Promise<void> {
    return this.client.waitUntilStatus(
      this.resource.storageKey,
      ['done'],
      this.client.env.propagationTimeout,
    );
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

export type DeleteResponse = {
  /**
   * Whether the deletion was successful.
   */
  success: boolean;
};

/**
 * @internal
 */
export type Status =
  | 'available'
  | 'dirty'
  | 'done'
  | 'error_delete'
  | 'error_edit'
  | 'error_upload'
  | 'idle'
  | 'new'
  | 'pending'
  | 'unauthorized';

/**
 * @internal
 */
export type StatusResponse = {
  /**
   * The storage key of the resource.
   */
  storageKey: string;
  /**
   * The current status.
   */
  status: Status;
  /**
   * A percentage value between 0-100 indicating the progress of the resource's persistence.
   *
   * This is not linear and may experience jumps.
   */
  progress: number;
};
