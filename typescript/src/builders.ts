import type {
  EvmAddress,
  GenericAclTemplate,
  ImmutableAclTemplate,
  LensAccountAclTemplate,
  WalletAddressAclTemplate,
} from './types';

interface Builder<T> {
  reset(): void;
  build(): T;
  isValid(acl: Partial<T>): boolean;
}

/**
 * This ACL template restricts access to any given Wallet Address.
 */
export function walletOnly(address: EvmAddress) {
  return new WalletAddressAclBuilder().setWalletAddress(address).build();
}

class WalletAddressAclBuilder implements Builder<WalletAddressAclTemplate> {
  private acl: Partial<WalletAddressAclTemplate> = { template: 'wallet_address' };

  reset(): void {
    this.acl = { template: 'wallet_address' };
  }

  setWalletAddress(walletAddress: EvmAddress): this {
    this.acl.walletAddress = walletAddress;
    return this;
  }

  build(): WalletAddressAclTemplate {
    if (!this.isValid(this.acl)) {
      throw new Error('WalletAddressAclTemplate is missing required fields');
    }
    return this.acl as WalletAddressAclTemplate;
  }

  isValid(acl: Partial<WalletAddressAclTemplate>): acl is WalletAddressAclTemplate {
    return !!(acl.template === 'wallet_address' && acl.walletAddress);
  }
}

/**
 * This ACL template restricts access to any given Lens Account.
 */
export function lensAccountOnly(account: EvmAddress) {
  return new LensAccountAclTemplateBuilder().setLensAccount(account).build();
}

class LensAccountAclTemplateBuilder implements Builder<LensAccountAclTemplate> {
  private acl: Partial<LensAccountAclTemplate> = { template: 'lens_account' };

  reset(): void {
    this.acl = { template: 'lens_account' };
  }

  setLensAccount(lensAccount: EvmAddress): this {
    this.acl.lensAccount = lensAccount;
    return this;
  }

  build(): LensAccountAclTemplate {
    if (!this.isValid(this.acl)) {
      throw new Error('LensAccountAclTemplate is missing required fields');
    }
    return this.acl as LensAccountAclTemplate;
  }

  isValid(acl: Partial<LensAccountAclTemplate>): acl is LensAccountAclTemplate {
    return !!(acl.template === 'lens_account' && acl.lensAccount);
  }
}

/**
 * This ACL template restricts access to any given address that satisfies the contract call evaluation.
 * When using this template, the contractAddress, functionSig and params parameters must be set.
 */
export function genericAcl(contractAddress: EvmAddress, functionSig: string, params: string[]) {
  return new GenericAclTemplateBuilder()
    .setContractAddress(contractAddress)
    .setFunctionSig(functionSig)
    .setParams(params)
    .build();
}

class GenericAclTemplateBuilder implements Builder<GenericAclTemplate> {
  private acl: Partial<GenericAclTemplate> = { template: 'generic_acl' };

  reset(): void {
    this.acl = { template: 'generic_acl' };
  }

  setContractAddress(contractAddress: EvmAddress): this {
    this.acl.contractAddress = contractAddress;
    return this;
  }

  setFunctionSig(functionSig: string): this {
    this.acl.functionSig = functionSig;
    return this;
  }

  setParams(params: string[]): this {
    this.acl.params = params;
    return this;
  }

  build(): GenericAclTemplate {
    if (!this.isValid(this.acl)) {
      throw new Error('GenericAclTemplate is missing required fields');
    }
    return this.acl as GenericAclTemplate;
  }

  isValid(acl: Partial<GenericAclTemplate>): acl is GenericAclTemplate {
    return !!(
      acl.template === 'generic_acl' &&
      acl.contractAddress &&
      acl.functionSig &&
      acl.params
    );
  }
}

/**
 * This ACL declare the resource as immutable.
 *
 * It requires to specify the chain ID that the resource is bound to.
 */
export function immutable(chainId: number) {
  return new ImmutableAclTemplateBuilder().setChainId(chainId).build();
}

class ImmutableAclTemplateBuilder implements Builder<ImmutableAclTemplate> {
  private acl: Partial<ImmutableAclTemplate> = { template: 'immutable' };

  reset(): void {
    this.acl = { template: 'immutable' };
  }

  setChainId(chainId: number): this {
    this.acl.chainId = chainId;
    return this;
  }

  build(): ImmutableAclTemplate {
    if (!this.isValid(this.acl)) {
      throw new Error('ImmutableAclTemplate is missing required fields');
    }
    return this.acl as ImmutableAclTemplate;
  }

  isValid(acl: Partial<ImmutableAclTemplate>): acl is ImmutableAclTemplate {
    return !!(acl.template === 'immutable' && acl.chainId);
  }
}
