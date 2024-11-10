import type { EnvironmentConfig } from "./environments";
import type {
  Resource,
  Signer,
  UploadFileOptions,
  UploadFolderOptions,
  UploadFolderResponse,
} from "./types";
import { createMultipartFormDataStream, extractLinkHash, never } from "./utils";

export class StorageClient {
  private constructor(private readonly env: EnvironmentConfig) { }

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
   * @param _file - The file to upload
   * @param _signer - The signer to use for the upload
   * @param _options - Any additional options for the upload
   * @returns The {@link Resource} to the uploaded file
   */
  async uploadFile(
    file: File,
    _signer: Signer,
    _options?: UploadFileOptions,
  ): Promise<Resource> {
    const linkHash = await this.requestLinkHash();

    const { boundary, stream } = createMultipartFormDataStream([
      {
        name: linkHash,
        file,
      },
    ]);

    const response = await fetch(`${this.env.backend}/${linkHash}`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: stream,

      // @ts-ignore
      duplex: "half", // Required for streaming request body in some browsers
    });

    if (!response.ok) {
      console.log(response);
      throw new Error("Failed to upload file");
    }

    return {
      linkHash,
      uri: `lens://${linkHash}`,
    };
  }

  /**
   * Uploads a folder to the storage.
   *
   * @param _files - The files to upload
   * @param _signer - The signer to use for the upload
   * @param _options - Any additional options for the upload
   * @returns The {@link UploadFolderResponse} to the uploaded folder
   */
  async uploadFolder(
    _files: FileList | File[],
    _signer: Signer,
    _options?: UploadFolderOptions,
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
   * @param _linkHashOrUri - The `lens://…` URI or link hash
   * @param _signer - The signer to use for the deletion
   * @returns Whether the deletion was successful or not
   */
  async delete(_linkHashOrUri: string, _signer: Signer): Promise<boolean> {
    never("Not implemented");
  }

  /**
   * Edits a file in the storage.
   *
   * @param _linkHashOrUri - The `lens://…` URI or link hash
   * @param _file - The file to replace the existing file with
   * @param _signer - The signer to use for the edit
   */
  async editFile(
    _linkHashOrUri: string,
    _file: File,
    _signer: Signer,
  ): Promise<boolean> {
    never("Not implemented");
  }

  private async requestLinkHash(): Promise<string> {
    const response = await fetch(`${this.env.backend}/link/new`, {
      method: "POST",
    });

    if (!response.ok) {
      console.log(response);
      throw new Error("Failed to request a new link hash");
    }

    const data = await response.json();
    return data[0].link_hash;
  }
}
