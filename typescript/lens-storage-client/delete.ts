// client/delete.ts

import axios from 'axios';
import { BaseLensStorageClient } from './base';
import { DeleteOptions } from '../types';

export class DeleteClient extends BaseLensStorageClient {
  /**
   * Delete a file or folder
   */
  async deleteContent(
    linkHash: string,
    options: DeleteOptions
  ): Promise<string> {
    const challenge = await this.requestChallenge({ link_hash: linkHash, action: "delete" });
    challenge.signature = await options.signMessage(challenge.message);
    const { challenge_cid } = await this.submitSignedChallenge(challenge);

    await axios.delete(
      `${this.baseUrl}/${linkHash}?challenge_cid=${challenge_cid}&secret_random=${challenge.secret_random}`
    );
    return linkHash;
  }

  /**
   * Check if content exists
   */
  async contentExists(linkHash: string): Promise<boolean> {
    try {
      await axios.head(`${this.baseUrl}/${linkHash}`);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete multiple contents
   */
  async deleteMultipleContents(
    linkHashes: string[],
    options: DeleteOptions
  ): Promise<{
    successful: string[];
    failed: Array<{ hash: string; error: string }>;
  }> {
    const results = {
      successful: [] as string[],
      failed: [] as Array<{ hash: string; error: string }>
    };

    for (const hash of linkHashes) {
      try {
        await this.deleteContent(hash, options);
        results.successful.push(hash);
      } catch (error) {
        results.failed.push({
          hash,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Delete a folder and all its contents
   */
  async deleteFolder(
    folderHash: string,
    fileHashes: string[],
    options: DeleteOptions
  ): Promise<void> {
    await this.deleteContent(folderHash, options);

    const verificationPromises = [folderHash, ...fileHashes].map(async hash => {
      const exists = await this.contentExists(hash);
      if (exists) {
        throw new Error(`Failed to delete content with hash: ${hash}`);
      }
    });

    await Promise.all(verificationPromises);
  }
}
