import type {
  EvmAddress,
  GenericAcl,
  ImmutableAcl,
  LensAccountAcl,
  WalletAddressAcl,
} from './types';

/**
 * This ACL template restricts access to any given Wallet Address.
 *
 * @param address - The Wallet Address that can edit/delete the resource.
 * @param chainId - The Chain ID that the resource is bound to. See supported chains.
 */
export function walletOnly(
  address: EvmAddress,
  chainId: number,
): WalletAddressAcl {
  return { template: 'wallet_address', walletAddress: address, chainId };
}

/**
 * This ACL template restricts access to any given Lens Account.
 *
 * @param account - The Lens Account that can edit/delete the resource.
 * @param chainId - The Lens Chain ID that the resource is bound to.
 */
export function lensAccountOnly(
  account: EvmAddress,
  chainId: number,
): LensAccountAcl {
  return { template: 'lens_account', chainId, lensAccount: account };
}

/**
 * This ACL declare the resource as immutable.
 *
 * It requires to specify the chain ID that the resource is bound to.
 */
export function immutable(chainId: number): ImmutableAcl {
  return { template: 'immutable', chainId };
}

/**
 * This ACL template restricts access to any given address that satisfies the contract call evaluation.
 *
 * @param chainId - The Chain ID that the resource is bound to. See supported chains.
 * @returns A builder to create a Generic ACL template.
 */
export function genericAcl(chainId: number): GenericAclTemplateBuilder {
  return new GenericAclTemplateBuilder(chainId);
}

class GenericAclTemplateBuilder {
  private acl: Partial<GenericAcl> = { template: 'generic_acl' };

  constructor(chainId: number) {
    this.acl.chainId = chainId;
  }

  reset(): void {
    this.acl = { template: 'generic_acl' };
  }

  withContractAddress(contractAddress: string): this {
    this.acl.contractAddress = contractAddress;
    return this;
  }

  withFunctionSig(functionSig: string): this {
    this.acl.functionSig = functionSig;
    return this;
  }

  withParams(params: string[]): this {
    this.acl.params = params;
    return this;
  }

  build(): GenericAcl {
    if (!this.isValid(this.acl)) {
      throw new Error('GenericAclTemplate is missing required fields');
    }
    return this.acl as GenericAcl;
  }

  private isValid(acl: Partial<GenericAcl>): acl is GenericAcl {
    return !!(
      acl.template === 'generic_acl' &&
      acl.contractAddress &&
      acl.functionSig &&
      acl.params &&
      acl.chainId
    );
  }
}
