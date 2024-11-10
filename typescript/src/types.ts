export type EvmAddress = `0x${string}`;

export type LensAccountAclTemplate = {
  template: 'lens_account';
  lensAccount: EvmAddress;
};

export type GenericAclTemplate = {
  template: 'generic_acl';
  contractAddress: string;
  chainId: number;
  networkType: 'evm'; // | other supported network types
  functionSig: string;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  params: any[];
};

export type AclTemplate = LensAccountAclTemplate | GenericAclTemplate;

export interface Signer {
  signMessage({ message }: { message: string }): Promise<string>;
}

export type AccessOptions = {
  /**
   * The ACL template to use for the resource.
   *
   * @defaultValue if not provided the resource will be immutable
   */
  acl?: AclTemplate;
};

export type UploadFileOptions = AccessOptions;

/**
 * A factory function that, given the list of {@link Resource}s,
 * creates a JSON serializable object that will be used as the
 * directory index file.
 */
export type CreateIndexContent = (urls: Resource[]) => unknown;

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
   * The link hash of the resource.
   */
  linkHash: string;
};

export type UploadFolderResponse = {
  files: Resource[];
  folder: Resource;
};

/**
 * @internal
 */
export type LinkHash = {
  link_hash: string;
};
