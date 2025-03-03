import { type Authorization, AuthorizationService } from './AuthorizationService';
import { immutable } from './builders';
import { type EnvironmentConfig, production } from './environments';
import { AuthorizationError, StorageClientError } from './errors';
import {
  type AccessOptions,
  type AclConfig,
  type DeleteResponse,
  type EditFileOptions,
  FileUploadResponse,
  type ImmutableAcl,
  type Resource,
  type Signer,
  type Status,
  type UploadFileOptions,
  type UploadFolderOptions,
  type UploadFolderResponse,
  type UploadJsonOptions,
} from './types';
import {
  MultipartEntriesBuilder,
  type MultipartEntry,
  createMultipartRequestInit,
  extractStorageKey,
  invariant,
  never,
  resourceFrom,
  statusFrom,
} from './utils';

export class StorageClient {
  private readonly authorization: AuthorizationService;

  private constructor(public readonly env: EnvironmentConfig) {
    this.authorization = new AuthorizationService(env);
  }

  /**
   * Creates a new instance of the `Storage` client.
   *
   * @param env - the environment configuration
   * @returns The `Storage` client instance
   */
  static create(env: EnvironmentConfig = production): StorageClient {
    return new StorageClient(env);
  }

  /**
   * Uploads a file to the storage.
   *
   * @throws a {@link StorageClientError} if uploading the file fails
   * @param file - The file to upload
   * @param options - Any additional options for the upload
   * @returns The {@link FileUploadResponse} to the uploaded file
   */
  async uploadFile(file: File, options: UploadFileOptions): Promise<FileUploadResponse>;
  /**
   *
   * @deprecated use `uploadFile(file: File, options: UploadFileOptions): Promise<FileUploadResponse>` instead
   */
  async uploadFile(file: File, options?: UploadFileOptions): Promise<FileUploadResponse>;
  async uploadFile(file: File, options: UploadFileOptions = {}): Promise<FileUploadResponse> {
    const acl = this.resolveAcl(options);

    const resource =
      acl.template === 'immutable'
        ? await this.uploadImmutableFile(file, acl)
        : await this.uploadMutableFile(file, acl);

    return new FileUploadResponse(resource, this);
  }

  /**
   * Uploads a JSON object to the storage.
   *
   * This is a convenience method that serializes the JSON object to a string before uploading it. The code is equivalent to:
   * ```ts
   * const file = new File([JSON.stringify(json)], 'data.json', { type: 'application/json' });
   *
   * const { uri } = await client.uploadFile(file);
   * ```
   *
   * @throws a {@link StorageClientError} if uploading the JSON fails
   * @param json - The JSON object to upload
   * @param options - Upload options including the ACL configuration
   * @returns The {@link FileUploadResponse} to the uploaded JSON
   */
  async uploadAsJson(json: unknown, options?: UploadJsonOptions): Promise<FileUploadResponse>;
  /**
   * @deprecated use `uploadAsJson(json: unknown, options: UploadJsonOptions): Promise<FileUploadResponse>` instead
   */
  async uploadAsJson(json: unknown, options?: UploadJsonOptions): Promise<FileUploadResponse>;
  async uploadAsJson(json: unknown, options: UploadJsonOptions = {}): Promise<FileUploadResponse> {
    const file = new File([JSON.stringify(json)], options.name ?? 'data.json', {
      type: 'application/json',
    });
    return this.uploadFile(file, options);
  }

  /**
   * Uploads a folder to the storage.
   *
   * @throws a {@link StorageClientError} if uploading the folder fails
   * @param files - The files to upload
   * @param options - Upload options including the ACL configuration
   * @returns The {@link UploadFolderResponse} to the uploaded folder
   */
  async uploadFolder(
    files: FileList | File[],
    options: UploadFolderOptions,
  ): Promise<UploadFolderResponse>;
  /**
   * @deprecated use `uploadFolder(files: FileList | File[], options: UploadFolderOptions): Promise<UploadFolderResponse>` instead
   */
  async uploadFolder(
    files: FileList | File[],
    options?: UploadFolderOptions,
  ): Promise<UploadFolderResponse>;
  async uploadFolder(
    files: FileList | File[],
    options: UploadFolderOptions = {},
  ): Promise<UploadFolderResponse> {
    const needsIndex = 'index' in options && !!options.index;
    const [folderResource, ...fileResources] = await this.allocateStorage(
      files.length + (needsIndex ? 2 : 1),
    );

    const builder = MultipartEntriesBuilder.from(fileResources).withFiles(Array.from(files));

    if (options.index) {
      builder.withIndexFile(options.index);
    }

    const acl = this.resolveAcl(options);
    builder.withAclTemplate(acl);

    const entries = builder.build();
    const response = await this.create(folderResource.storageKey, entries);

    if (!response.ok) {
      throw await StorageClientError.fromResponse(response);
    }

    return {
      folder: folderResource,
      files: fileResources,
    };
  }

  /**
   * Given an URI or storage key, resolves it to a URL.
   *
   * @param storageKeyOrUri - The `lens://…` URI or storage key
   * @returns The URL to the resource
   */
  resolve(storageKeyOrUri: string): string {
    const storageKey = extractStorageKey(storageKeyOrUri);

    return `${this.env.backend}/${storageKey}`;
  }

  /**
   * Deletes a resource from the storage.
   *
   * @throws a {@link AuthorizationError} if not authorized to delete the resource
   * @param storageKeyOrUri - The `lens://…` URI or storage key
   * @param signer - The signer to use for the deletion
   * @returns The deletion result.
   */
  async delete(storageKeyOrUri: string, signer: Signer): Promise<DeleteResponse> {
    const storageKey = extractStorageKey(storageKeyOrUri);
    const authorization = await this.authorization.authorize('delete', storageKey, signer);

    const response = await fetch(
      `${this.env.backend}/${storageKey}?challenge_cid=${authorization.challengeId}&secret_random=${authorization.secret}`,
      {
        method: 'DELETE',
      },
    );
    return {
      success: response.ok,
    };
  }

  /**
   * Updates a JSON object in the storage.
   *
   * @throws a {@link StorageClientError} if editing the file fails
   * @throws a {@link AuthorizationError} if not authorized to edit the file
   * @param storageKeyOrUri - The `lens://…` URI or storage key
   * @param json - The JSON object to upload
   * @param signer - The signer to use for the edit
   * @param options - Upload options including the ACL configuration
   * @returns The {@link FileUploadResponse} to the uploaded JSON
   */
  async updateJson(
    storageKeyOrUri: string,
    json: unknown,
    signer: Signer,
    options: UploadJsonOptions,
  ): Promise<FileUploadResponse> {
    const file = new File([JSON.stringify(json)], options.name ?? 'data.json', {
      type: 'application/json',
    });
    return this.editFile(storageKeyOrUri, file, signer, options);
  }

  /**
   * Edits a file in the storage.
   *
   * @throws a {@link StorageClientError} if editing the file fails
   * @throws a {@link AuthorizationError} if not authorized to edit the file
   * @param storageKeyOrUri - The `lens://…` URI or storage key
   * @param newFile - The file to replace the existing file with
   * @param signer - The signer to use for the edit
   * @param options - Upload options including the ACL configuration
   */
  async editFile(
    storageKeyOrUri: string,
    newFile: File,
    signer: Signer,
    options: EditFileOptions,
  ): Promise<FileUploadResponse>;
  /**
   * @deprecated use `editFile(storageKeyOrUri: string, newFile: File, signer: Signer, options: EditFileOptions): Promise<FileUploadResponse>` instead.
   */
  async editFile(
    storageKeyOrUri: string,
    newFile: File,
    signer: Signer,
    options?: EditFileOptions,
  ): Promise<FileUploadResponse>;
  async editFile(
    storageKeyOrUri: string,
    newFile: File,
    signer: Signer,
    options: EditFileOptions = {},
  ): Promise<FileUploadResponse> {
    const storageKey = extractStorageKey(storageKeyOrUri);
    const authorization = await this.authorization.authorize('edit', storageKey, signer);

    const acl = this.resolveAcl(options);
    const resource = resourceFrom(storageKey, this.env);
    const builder = MultipartEntriesBuilder.from([resource]).withFile(newFile).withAclTemplate(acl);

    const entries = builder.build();
    const response = await this.update(storageKey, authorization, entries);

    if (!response.ok) {
      throw await StorageClientError.fromResponse(response);
    }

    return new FileUploadResponse(resource, this);
  }

  /**
   * @internal
   */
  async status(storageKeyOrUri: string): Promise<Status> {
    const storageKey = extractStorageKey(storageKeyOrUri);
    const response = await fetch(`${this.env.backend}/status/${storageKey}`);

    if (!response.ok) {
      throw await StorageClientError.fromResponse(response);
    }
    try {
      const data = await response.json();
      return statusFrom(data);
    } catch (error) {
      throw await StorageClientError.fromResponse(response);
    }
  }

  private async allocateStorage(amount: number): Promise<[Resource, ...Resource[]]> {
    invariant(amount > 0, 'Amount must be greater than 0');
    const response = await fetch(`${this.env.backend}/link/new?amount=${amount}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw await StorageClientError.fromResponse(response);
    }
    return this.parseResourceFrom(response);
  }

  private async uploadMutableFile(file: File, acl: AclConfig): Promise<Resource> {
    const [resource] = await this.allocateStorage(1);
    const builder = MultipartEntriesBuilder.from([resource]).withFile(file).withAclTemplate(acl);

    const entries = builder.build();

    const response = await this.create(resource.storageKey, entries);

    if (!response.ok) {
      throw await StorageClientError.fromResponse(response);
    }
    return resource;
  }

  private async uploadImmutableFile(file: File, { chainId }: ImmutableAcl): Promise<Resource> {
    const response = await fetch(`${this.env.backend}?chain_id=${chainId}`, {
      method: 'POST',
      headers: {
        'Content-Type': file.type,
        'Content-Length': file.size.toString(),
      },
      body: file,
    });

    if (!response.ok) {
      throw await StorageClientError.fromResponse(response);
    }
    const [resource] = await this.parseResourceFrom(response);
    return resource;
  }

  private async create(storageKey: string, entries: readonly MultipartEntry[]): Promise<Response> {
    return this.multipartRequest('POST', `${this.env.backend}/${storageKey}`, entries);
  }

  private async update(
    storageKey: string,
    authorization: Authorization,
    entries: readonly MultipartEntry[],
  ): Promise<Response> {
    return this.multipartRequest(
      'PUT',
      `${this.env.backend}/${storageKey}?challenge_cid=${authorization.challengeId}&secret_random=${authorization.secret}`,
      entries,
    );
  }

  private async multipartRequest(
    method: 'POST' | 'PUT',
    url: string,
    entries: readonly MultipartEntry[],
  ): Promise<Response> {
    return fetch(url, await createMultipartRequestInit(method, entries));
  }

  private resolveAcl<T extends AccessOptions>(options: T): AclConfig {
    return options.acl ?? immutable(this.env.defaultChainId);
  }

  private parseResourceFrom = async (response: Response): Promise<[Resource, ...Resource[]]> => {
    const list = await response.json();

    return list.map((data: Record<string, string>) => {
      const storageKey =
        data.storage_key ?? never(`Missing 'storage_key' in response: ${JSON.stringify(data)}`);
      return {
        storageKey,
        // TODO use data.gateway_url once fixed by the API
        // gatewayUrl: data.gateway_url ?? never('Missing gateway URL'),
        gatewayUrl: this.resolve(storageKey),
        uri: data.uri ?? never(`Missing 'uri' in response: ${JSON.stringify(data)}`),
      };
    }) as [Resource, ...Resource[]];
  };
}
