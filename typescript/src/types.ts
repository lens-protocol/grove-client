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
export type Status = {
  storageKey: string;
  status: string;
  progress: number;
};
