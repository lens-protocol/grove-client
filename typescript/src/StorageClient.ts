import {
  type Authorization,
  AuthorizationService,
} from "./AuthorizationService";
import type { EnvironmentConfig } from "./environments";
import { StorageClientError } from "./errors";
import type {
  AccessOptions,
  EditFileOptions,
  Resource,
  Signer,
  UploadFileOptions,
  UploadFolderOptions,
  UploadFolderResponse,
} from "./types";
import {
  createAclEntry,
  createMultipartFormDataStream,
  extractLinkHash,
  LENS_SCHEME,
  lensUri,
  type NameFilePair,
  never,
} from "./utils";

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
   * @param _file - The file to upload
   * @param _options - Any additional options for the upload
   * @returns The {@link Resource} to the uploaded file
   */
  async uploadFile(
    file: File,
    options: UploadFileOptions = {},
  ): Promise<Resource> {
    const linkHash = await this.requestLinkHash();

    const entries = await this.includeAclTemplate(
      [{ name: linkHash, file }],
      options,
    );

    const response = await this.create(linkHash, entries);

    if (!response.ok) {
      throw await StorageClientError.fromResponse(response);
    }

    return {
      linkHash,
      uri: lensUri(linkHash),
    };
  }

  /**
   * Uploads a folder to the storage.
   *
   * @throws {@link StorageClientError} if uploading the folder fails
   * @param _files - The files to upload
   * @param _options - Any additional options for the upload
   * @returns The {@link UploadFolderResponse} to the uploaded folder
   */
  async uploadFolder(
    _files: FileList | File[],
    _options: UploadFolderOptions = {},
  ): Promise<UploadFolderResponse> {
    never("Not implemented");
  }

  /**
   * Given an URI or link hash, resolves it to a URL.
   *
   * @param linkHashOrUri - The `lens://…` URI or link hash
   * @returns The URL to the resource
   */
  resolve(linkHashOrUri: string): string {
    const linkHash = extractLinkHash(linkHashOrUri);

    return `${this.env.backend}/${linkHash}`;
  }

  /**
   * Deletes a resource from the storage.
   *
   * @throws {@link AuthorizationError} if not authorized to delete the resource
   * @param linkHashOrUri - The `lens://…` URI or link hash
   * @param signer - The signer to use for the deletion
   * @returns Whether the deletion was successful or not
   */
  async delete(linkHashOrUri: string, signer: Signer): Promise<boolean> {
    const linkHash = extractLinkHash(linkHashOrUri);
    const authorization = await this.authorization.authorize('delete', linkHash, signer);

    const response = await fetch(
      `${this.env.backend}/${linkHash}?challenge_cid=${authorization.challengeId}&secret_random=${authorization.secret}`,
      {
        method: "DELETE",
      },
    );

    return response.ok;
  }

  /**
   * Edits a file in the storage.
   *
   *
   * @throws {@link StorageClientError} if editing the file fails
   * @throws {@link AuthorizationError} if not authorized to edit the file
   * @param linkHashOrUri - The `lens://…` URI or link hash
   * @param file - The file to replace the existing file with
   * @param signer - The signer to use for the edit
   * @param options - Any additional options for the edit
   */
  async editFile(
    linkHashOrUri: string,
    file: File,
    signer: Signer,
    options: EditFileOptions = {},
  ): Promise<boolean> {
    const linkHash = extractLinkHash(linkHashOrUri);
    const authorization = await this.authorization.authorize('edit', linkHash, signer);

    const entries = await this.includeAclTemplate(
      [{ name: linkHash, file }],
      options,
    );

    const response = await this.update(linkHash, authorization, entries);

    return response.ok;
  }

  private async requestLinkHash(): Promise<string> {
    const response = await fetch(`${this.env.backend}/link/new`, {
      method: "POST",
    });

    if (!response.ok) {
      throw await StorageClientError.fromResponse(response);
    }

    const data = await response.json();
    return data[0].link_hash;
  }

  private async includeAclTemplate(
    entries: NameFilePair[],
    options: AccessOptions,
  ): Promise<NameFilePair[]> {
    if (options.acl) {
      entries.push(createAclEntry(options.acl));
    }
    return entries;
  }


  private async create(
    linkHash: string,
    entries: NameFilePair[],
  ): Promise<Response> {
    return this.multipartRequest('POST', `${this.env.backend}/${linkHash}`, entries);
  }

  private async update(
    linkHash: string,
    authorization: Authorization,
    entries: NameFilePair[],
  ): Promise<Response> {
    return this.multipartRequest('PUT', `${this.env.backend}/${linkHash}?challenge_cid=${authorization.challengeId}&secret_random=${authorization.secret}`, entries);
  }

  private async multipartRequest(
    method: "POST" | "PUT",
    url: string,
    entries: NameFilePair[]
  ): Promise<Response> {
    const { boundary, stream } = createMultipartFormDataStream(entries);

    return fetch(url, {
      method,
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: stream,
      // @ts-ignore
      duplex: "half", // Required for streaming request body in some browsers
    });
  }
}
