import { type Authorization, AuthorizationService } from './AuthorizationService';
import type { EnvironmentConfig } from './environments';
import { StorageClientError } from './errors';
import type {
  EditFileOptions,
  Resource,
  Signer,
  UploadFileOptions,
  UploadFolderOptions,
  UploadFolderResponse,
} from './types';
import {
  MultipartEntriesBuilder,
  type MultipartEntry,
  createMultipartStream,
  extractStorageKey as extractStorageKey,
  invariant,
  resourceFrom,
} from './utils';

export class StorageClient {
  private readonly authorization: AuthorizationService;

  private constructor(private readonly env: EnvironmentConfig) {
    this.authorization = new AuthorizationService(env);
  }

  /**
   * Creates a new instance of the `Storage` client.
   *
   * @param env - the environment configuration
   * @returns The `Storage` client instance
   */
  static create(env: EnvironmentConfig): StorageClient {
    return new StorageClient(env);
  }

  /**
   * Uploads a file to the storage.
   *
   * @throws {@link StorageClientError} if uploading the file fails
   * @param file - The file to upload
   * @param options - Any additional options for the upload
   * @returns The {@link Resource} to the uploaded file
   */
  async uploadFile(file: File, options: UploadFileOptions = {}): Promise<Resource> {
    const [resource] = await this.requestStorageKeys();
    const gatewayUrl = resource.gatewayUrl;
    const uri = resource.uri;

    const builder = MultipartEntriesBuilder.from([resource.storageKey]).withFile(file);

    if (options.acl) {
      builder.withAclTemplate(options.acl, this.env);
    }

    const entries = builder.build();

    const response = await this.create(resource.storageKey, entries);

    if (!response.ok) {
      throw await StorageClientError.fromResponse(response);
    }

    return resourceFrom(resource.storageKey, gatewayUrl, uri);
  }

  /**
   * Uploads a folder to the storage.
   *
   * @throws {@link StorageClientError} if uploading the folder fails
   * @param files - The files to upload
   * @param options - Any additional options for the upload
   * @returns The {@link UploadFolderResponse} to the uploaded folder
   */
  async uploadFolder(
    files: FileList | File[],
    options: UploadFolderOptions = {},
  ): Promise<UploadFolderResponse> {
    const needsIndex = 'index' in options && !!options.index;
    const [folderResource, ...fileResources] = await this.requestStorageKeys(
      files.length + (needsIndex ? 2 : 1),
    );
    const gatewayUrl = folderResource.gatewayUrl;
    const uri = folderResource.uri;
    const folderHash = folderResource.storageKey;
    const fileHashes = fileResources.map(f => f.storageKey);

    const builder = MultipartEntriesBuilder.from(fileHashes).withFiles(Array.from(files));

    if (options.index) {
      builder.withIndexFile(options.index, gatewayUrl, uri);
    }

    if (options.acl) {
      builder.withAclTemplate(options.acl, this.env);
    }

    const entries = builder.build();
    const response = await this.create(folderHash, entries);

    if (!response.ok) {
      throw await StorageClientError.fromResponse(response);
    }

    return {
      folder: resourceFrom(folderHash, gatewayUrl, uri),
      files: fileResources.map(fr => resourceFrom(fr.storageKey, fr.gatewayUrl, fr.uri)),
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
   * @throws {@link AuthorizationError} if not authorized to delete the resource
   * @param storageKeyOrUri - The `lens://…` URI or storage key
   * @param signer - The signer to use for the deletion
   * @returns Whether the deletion was successful or not
   */
  async delete(storageKeyOrUri: string, signer: Signer): Promise<boolean> {
    const storageKey = extractStorageKey(storageKeyOrUri);
    const authorization = await this.authorization.authorize('delete', storageKey, signer);

    const response = await fetch(
      `${this.env.backend}/${storageKey}?challenge_cid=${authorization.challengeId}&secret_random=${authorization.secret}`,
      {
        method: 'DELETE',
      },
    );

    return response.ok;
  }

  /**
   * Edits a file in the storage.
   *
   * @throws {@link StorageClientError} if editing the file fails
   * @throws {@link AuthorizationError} if not authorized to edit the file
   * @param storageKeyOrUri - The `lens://…` URI or storage key
   * @param file - The file to replace the existing file with
   * @param signer - The signer to use for the edit
   * @param options - Any additional options for the edit
   */
  async editFile(
    storageKeyOrUri: string,
    file: File,
    signer: Signer,
    options: EditFileOptions = {},
  ): Promise<boolean> {
    const storageKey = extractStorageKey(storageKeyOrUri);
    const authorization = await this.authorization.authorize('edit', storageKey, signer);

    const builder = MultipartEntriesBuilder.from([storageKey]).withFile(file);

    if (options.acl) {
      builder.withAclTemplate(options.acl, this.env);
    }

    const entries = builder.build();
    const response = await this.update(storageKey, authorization, entries);

    return response.ok;
  }

  private async requestStorageKeys(amount = 1): Promise<[Resource, ...Resource[]]> {
    invariant(amount > 0, 'Amount must be greater than 0');
    const response = await fetch(`${this.env.backend}/link/new?amount=${amount}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw await StorageClientError.fromResponse(response);
    }

    const data = await response.json();
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    return data.map((entry: any) => resourceFrom(entry.storage_key, entry.gateway_url, entry.uri));
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
    const { boundary, stream } = createMultipartStream(entries);

    return fetch(url, {
      method,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: stream,
      // @ts-ignore
      duplex: 'half', // Required for streaming request body in some browsers
    });
  }
}
