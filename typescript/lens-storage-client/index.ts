// client/index.ts

import { UploadClient } from './upload';
import { RetrieveClient } from './retrieve';
import { EditClient } from './edit';
import { DeleteClient } from './delete';

export class LensStorageClient {
  uploadClient: UploadClient;
  retrieveClient: RetrieveClient;
  editClient: EditClient;
  deleteClient: DeleteClient;

  constructor(baseUrl: string) {
    this.uploadClient = new UploadClient(baseUrl);
    this.retrieveClient = new RetrieveClient(baseUrl);
    this.editClient = new EditClient(baseUrl);
    this.deleteClient = new DeleteClient(baseUrl);
  }
}
