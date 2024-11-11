import type { EnvironmentConfig } from './environments';
import { AuthorizationError } from './errors';
import type { Signer } from './types';

export type Authorization = {
  challengeId: string;
  secret: string;
};

type Challenge = {
  message: string;
  secret_random: string;
};

type SignedChallenge = Challenge & {
  signature: string;
};

type SignedChallengeResponse = {
  challenge_cid: string;
};

export class AuthorizationService {
  constructor(private readonly env: EnvironmentConfig) {}

  async authorize(
    action: 'delete' | 'edit',
    linkHash: string,
    signer: Signer,
  ): Promise<Authorization> {
    const challenge = await this.requestChallenge(action, linkHash);

    const signature = await signer.signMessage({
      message: challenge.secret_random,
    });

    const { challenge_cid } = await this.submitSignedChallenge({
      ...challenge,
      signature,
    });

    return {
      challengeId: challenge_cid,
      secret: challenge.secret_random,
    };
  }

  private async requestChallenge(action: 'delete' | 'edit', linkHash: string): Promise<Challenge> {
    const response = await fetch(`${this.env.backend}/challenge/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        link_hash: linkHash,
        action: action,
      }),
    });

    if (!response.ok) {
      throw await AuthorizationError.fromResponse(response);
    }

    return response.json();
  }

  private async submitSignedChallenge(
    challenge: SignedChallenge,
  ): Promise<SignedChallengeResponse> {
    const response = await fetch(`${this.env.backend}/challenge/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(challenge),
    });

    if (!response.ok) {
      throw await AuthorizationError.fromResponse(response);
    }

    return response.json();
  }
}
