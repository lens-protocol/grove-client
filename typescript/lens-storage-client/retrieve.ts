// client/retrieve.ts

import axios from 'axios';
import { BaseLensStorageClient } from './base';
import { RangeOptions } from '../types';

export class RetrieveClient extends BaseLensStorageClient {
  /**
   * Download an entire file
   */
  async downloadFile(linkHash: string): Promise<Buffer> {
    const response = await axios.get(
      `${this.baseUrl}/${linkHash}`,
      {
        responseType: 'arraybuffer'
      }
    );
    return Buffer.from(response.data);
  }

  /**
   * Download a specific byte range of a file
   */
  async downloadFileRange(linkHash: string, range: RangeOptions): Promise<Buffer> {
    const response = await axios.get(
      `${this.baseUrl}/${linkHash}`,
      {
        headers: {
          'Range': `bytes=${range.start}-${range.end}`
        },
        responseType: 'arraybuffer'
      }
    );
    return Buffer.from(response.data);
  }
}
