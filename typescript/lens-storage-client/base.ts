// client/base.ts

import axios from 'axios';
import { Challenge, LinkHash, SignedChallengeResponse, LensAclTemplate, ChallengeRequest } from '../types';

export abstract class BaseLensStorageClient {
   constructor(protected readonly baseUrl: string) {}

  /**
   * Request a new unique link hash
   */
  protected async requestLinkHash(): Promise<string> {
    const response = await axios.post<LinkHash[]>(`${this.baseUrl}/link/new`);
    return response.data[0].link_hash;
  }

  /**
   * Request multiple link hashes
   */
  protected async requestMultipleLinkHashes(amount: number): Promise<string[]> {
    const response = await axios.post<LinkHash[]>(
      `${this.baseUrl}/link/new?amount=${amount}`
    );
    return response.data.map(item => item.link_hash);
  }

  /**
   * Create ACL template JSON for mutable files
   */
  protected createAclTemplate(lensAccount: string): LensAclTemplate {
    return {
      template: 'lens_account',
      lens_account: lensAccount
    };
  }

  /**
   * Request a new challenge for editing or deleting content
   */
  protected async requestChallenge(challengeRequest: ChallengeRequest): Promise<Challenge> {
    const response = await axios.post<Challenge>(
      `${this.baseUrl}/challenge/new`,
      challengeRequest,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }

  /**
   * Submit a signed challenge
   */
  protected async submitSignedChallenge(challenge: Challenge): Promise<SignedChallengeResponse> {
    const response = await axios.post<SignedChallengeResponse>(
      `${this.baseUrl}/challenge/sign`,
      challenge,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }

  /**
   * Get a direct URL for a file
   */
  getDirectUrl(linkHash: string): string {
    return `${this.baseUrl}/${linkHash}`;
  }
}
