import {
  type Authorization,
  AuthorizationService,
} from "./AuthorizationService";
import type { EnvironmentConfig } from "./environments";
import { StorageClientError } from "./errors";
import type {
  EditFileOptions,
  Resource,
  Signer,
  UploadFileOptions,
  UploadFolderOptions,
  UploadFolderResponse,
} from "./types";
import {
  createMultipartStream,
  FileEntriesBuilder,
  extractLinkHash,
  invariant,
  type MultipartEntry,
  never,
  resourceFrom,
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
   * @param file - The file to upload
   * @param options - Any additional options for the upload
   * @returns The {@link Resource} to the uploaded file
   */
  async uploadFile(
    file: File,
    options: UploadFileOptions = {},
  ): Promise<Resource> {
    const [linkHash] = await this.requestLinkHashes();

    const builder = FileEntriesBuilder.from([{ name: linkHash, file }])

    if (options.acl) {
      builder.withAclTemplate(options.acl);
    }

    const entries = builder.build();

    const response = await this.create(linkHash, entries);

    if (!response.ok) {
      throw await StorageClientError.fromResponse(response);
    }

    return resourceFrom(linkHash);
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
    const [folderHash, ...fileHashes] = await this.requestLinkHashes(files.length + (needsIndex ? 2 : 1));

    const initialEntries = Array.from(files).map((file, index) => ({
      name: fileHashes[index] ?? never('No link hash'),
      file,
    }));


    const builder = FileEntriesBuilder.from(initialEntries)

    if (options.index) {
      builder.withIndexFile(options.index, fileHashes);
    }

    if (options.acl) {
      builder.withAclTemplate(options.acl)
    }

    const entries = builder.build()
    const response = await this.create(folderHash, entries);

    if (!response.ok) {
      throw await StorageClientError.fromResponse(response);
    }

    return {
      folder: resourceFrom(folderHash),
      files: fileHashes.map(resourceFrom),
    }
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

    const builder = FileEntriesBuilder.from([{ name: linkHash, file }])

    if (options.acl) {
      builder.withAclTemplate(options.acl);
    }

    const entries = builder.build();
    const response = await this.update(linkHash, authorization, entries);

    return response.ok;
  }

  private async requestLinkHashes(amount = 1): Promise<[string, ...string[]]> {
    invariant(amount > 0, "Amount must be greater than 0");
    const response = await fetch(`${this.env.backend}/link/new?amount=${amount}`, {
      method: "POST",
    });

    if (!response.ok) {
      throw await StorageClientError.fromResponse(response);
    }

    const data = await response.json();
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    return data.map((entry: any) => entry.link_hash);
  }

  private async create(
    linkHash: string,
    entries: readonly MultipartEntry[],
  ): Promise<Response> {
    return this.multipartRequest('POST', `${this.env.backend}/${linkHash}`, entries);
  }

  private async update(
    linkHash: string,
    authorization: Authorization,
    entries: readonly MultipartEntry[],
  ): Promise<Response> {
    return this.multipartRequest('PUT', `${this.env.backend}/${linkHash}?challenge_cid=${authorization.challengeId}&secret_random=${authorization.secret}`, entries);
  }

  private async multipartRequest(
    method: "POST" | "PUT",
    url: string,
    entries: readonly MultipartEntry[]
  ): Promise<Response> {
    const { boundary, stream } = createMultipartStream(entries);

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
