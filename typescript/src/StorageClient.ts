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
  UploadJsonOptions,
} from './types';
import {
  MultipartEntriesBuilder,
  type MultipartEntry,
  createMultipartRequestInit,
  extractStorageKey,
  invariant,
  parseResource,
  resourceFrom,
} from './utils';
import fetch from "node-fetch";

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
    const [resource] = await this.allocateStorage(1);
    const builder = MultipartEntriesBuilder.from([resource]).withFile(file);

    if (options.acl) {
      builder.withAclTemplate(options.acl, this.env);
    }

    const entries = builder.build();

    const response = await this.create(resource.storageKey, entries);

    if (!response.ok) {
      throw await StorageClientError.fromResponse(response);
    }

    return resource;
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
   *
   * @throws {@link StorageClientError} if uploading the JSON fails
   * @param json - The JSON object to upload
   * @param options - Any additional options for the upload
   * @returns The {@link Resource} to the uploaded JSON
   */
  async uploadAsJson(json: unknown, options: UploadJsonOptions = {}): Promise<Resource> {
    const file = new File([JSON.stringify(json)], options.name ?? 'data.json', {
      type: 'application/json',
    });
    return this.uploadFile(file, options);
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
    const [folderResource, ...fileResources] = await this.allocateStorage(
      files.length + (needsIndex ? 2 : 1),
    );

    const builder = MultipartEntriesBuilder.from(fileResources).withFiles(Array.from(files));

    if (options.index) {
      builder.withIndexFile(options.index);
    }

    if (options.acl) {
      builder.withAclTemplate(options.acl, this.env);
    }

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
   * @param newFile - The file to replace the existing file with
   * @param signer - The signer to use for the edit
   * @param options - Any additional options for the edit
   */
  async editFile(
    storageKeyOrUri: string,
    newFile: File,
    signer: Signer,
    options: EditFileOptions = {},
  ): Promise<boolean> {
    const storageKey = extractStorageKey(storageKeyOrUri);
    const authorization = await this.authorization.authorize('edit', storageKey, signer);

    const builder = MultipartEntriesBuilder.from([resourceFrom(storageKey, this.env)]).withFile(
      newFile,
    );

    if (options.acl) {
      builder.withAclTemplate(options.acl, this.env);
    }

    const entries = builder.build();
    const response = await this.update(storageKey, authorization, entries);

    return response.ok;
  }

  private async allocateStorage(amount: number): Promise<[Resource, ...Resource[]]> {
    invariant(amount > 0, 'Amount must be greater than 0');
    const response = await fetch(`${this.env.backend}/link/new?amount=${amount}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw await StorageClientError.fromResponse(response);
    }

    const data = await response.json();
    return data.map(parseResource);
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
}
