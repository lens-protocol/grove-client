import type { EnvironmentConfig } from "./environments";
import type {
  Resource,
  Signer,
  UploadFileOptions,
  UploadFolderOptions,
  UploadFolderResponse,
} from "./types";
import { never } from "./utils";

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
    _file: File,
    _signer: Signer,
    _options?: UploadFileOptions,
  ): Promise<Resource> {
    console.log(this.env); // makes linter happy for now that it's not implemented
    never("Not implemented");
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
   * @param _linkHashOrUri - The `lens://…` URI or link hash
   * @returns The URL to the resource
   */
  resolve(_linkHashOrUri: string): string {
    never("Not implemented");
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
}
