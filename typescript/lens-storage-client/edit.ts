// client/edit.ts

import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { BaseLensStorageClient } from './base';
import { EditOptions, EditFileInfo, ChallengeRequest } from '../types';

export class EditClient extends BaseLensStorageClient {
  /**
   * Edit an existing file
   */
  async editFile(
    linkHash: string,
    filePath: string,
    options: EditOptions
  ): Promise<String> {
    const challenge = await this.requestChallenge({ link_hash: linkHash, action: "edit" });
    challenge.signature = await options.signMessage(challenge.message);
    const { challenge_cid } = await this.submitSignedChallenge(challenge);

    const formData = new FormData();

    formData.append(
      linkHash,
      fs.createReadStream(filePath),
      {
        filename: path.basename(filePath),
        contentType: options.contentType
      }
    );

    if (options.lensAccount) {
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

    await axios.put(
      `${this.baseUrl}/${linkHash}?challenge_cid=${challenge_cid}&secret_random=${challenge.secret_random}`,
      formData,
      {
        headers: formData.getHeaders()
      }
    );
    return linkHash;
  }

  /**
   * Edit multiple files in a folder
   */
  async editFolder(
    folderHash: string,
    files: EditFileInfo[],
    options: EditOptions
  ): Promise<void> {
    const challenge = await this.requestChallenge({ link_hash: folderHash, action: "edit" });
    challenge.signature = await options.signMessage(challenge.message);
    const { challenge_cid } = await this.submitSignedChallenge(challenge);

    const formData = new FormData();

    files.forEach(file => {
      formData.append(
        file.linkHash,
        fs.createReadStream(file.path),
        {
          filename: path.basename(file.path),
          contentType: file.contentType || options.contentType
        }
      );
    });

    if (options.lensAccount) {
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

    await axios.put(
      `${this.baseUrl}/${folderHash}?challenge_cid=${challenge_cid}&secret_random=${challenge.secret_random}`,
      formData,
      {
        headers: formData.getHeaders()
      }
    );
  }
}
