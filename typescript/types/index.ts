// types/index.ts

export interface LinkHash {
    link_hash: string;
  }
  
  export interface LensAclTemplate {
    template: 'lens_account';
    lens_account: string;
  }
  
  export interface ChallengeRequest {
    link_hash: string;
    action: string;
  }

  export interface Challenge {
    message: string;
    signature: string;
    secret_random: string;
  }
  
  export interface SignedChallengeResponse {
    challenge_cid: string;
  }
  
  export interface BaseOptions {
    /** Lens account address if mutable is true */
    lensAccount?: string;
    /** Content type of the file */
    contentType?: string;
  }
  
  export interface UploadOptions extends BaseOptions {
    /** Make the file mutable using Lens Account Template */
    mutable?: boolean;
  }
  
  export interface FolderUploadOptions extends UploadOptions {
    /** Enable folder indexing */
    enableFolderIndex?: boolean;
    /** Custom index.json content */
    indexContent?: Record<string, any>;
  }
  
  export interface RangeOptions {
    /** Start byte position */
    start: number;
    /** End byte position (inclusive) */
    end: number;
  }
  
  export interface EditOptions extends BaseOptions {
    /** Function to sign messages with the wallet */
    signMessage: (message: string) => Promise<string>;
  }
  
  export interface DeleteOptions {
    /** Function to sign messages with the wallet */
    signMessage: (message: string) => Promise<string>;
  }
  
  export interface EditFileInfo {
    /** Path to the file */
    path: string;
    /** Link hash for the file */
    linkHash: string;
    /** Content type of the file */
    contentType?: string;
  }
  