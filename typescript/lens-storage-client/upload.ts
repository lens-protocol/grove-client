// client/upload.ts

import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { BaseLensStorageClient } from './base';
import { UploadOptions, FolderUploadOptions } from '../types';

export class UploadClient extends BaseLensStorageClient {
  /**
   * Upload a single file
   */
  async uploadFile(
    filePath: string,
    options: UploadOptions = {}
  ): Promise<string> {
    const linkHash = await this.requestLinkHash();
    const formData = new FormData();

    formData.append(
      linkHash,
      fs.createReadStream(filePath),
      {
        filename: path.basename(filePath),
        contentType: options.contentType
      }
    );

    if (options.mutable && options.lensAccount) {
      const aclTemplate = this.createAclTemplate(options.lensAccount);
      formData.append(
        'lens-acl.json',
        JSON.stringify(aclTemplate),
        {
          filename: 'lens-acl.json',
          contentType: 'application/json'
        }
      );
    }

    await axios.post(
      `${this.baseUrl}/${linkHash}`,
      formData,
      {
        headers: formData.getHeaders()
      }
    );

    return linkHash;
  }

  /**
   * Upload multiple files in a folder structure
   */
  async uploadMultipleFiles(
    filePaths: string[],
    options: FolderUploadOptions = {}
  ): Promise<{ folderHash: string; fileHashes: string[] }> {
    const numHashes = options.enableFolderIndex
      ? filePaths.length + 2
      : filePaths.length + 1;

    const hashes = await this.requestMultipleLinkHashes(numHashes);
    const folderHash = hashes[0];
    const fileHashes = hashes.slice(1, filePaths.length + 1);
    const formData = new FormData();

    filePaths.forEach((filePath, index) => {
      formData.append(
        fileHashes[index],
        fs.createReadStream(filePath),
        {
          filename: path.basename(filePath),
          contentType: options.contentType
        }
      );
    });

    if (options.enableFolderIndex) {
      const indexHash = hashes[hashes.length - 1];
      const indexContent = options.indexContent || {
        files: fileHashes
      };
      formData.append(
        indexHash,
        JSON.stringify(indexContent),
        {
          filename: 'index.json',
          contentType: 'application/json'
        }
      );
    }

    if (options.mutable && options.lensAccount) {
      const aclTemplate = this.createAclTemplate(options.lensAccount);
      formData.append(
        'lens-acl.json',
        JSON.stringify(aclTemplate),
        {
          filename: 'lens-acl.json',
          contentType: 'application/json'
        }
      );
    }

    await axios.post(
      `${this.baseUrl}/${folderHash}`,
      formData,
      {
        headers: formData.getHeaders()
      }
    );

    return {
      folderHash,
      fileHashes
    };
  }
}
