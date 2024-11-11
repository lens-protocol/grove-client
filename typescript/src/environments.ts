/**
 * The environment configuration type.
 */
export type EnvironmentConfig = {
  name: string;
  backend: string;
  chainId: number;
};

/**
 * The mainnet environment configuration.
 */
export const mainnet: EnvironmentConfig = new Proxy(
  {
    name: 'mainnet',
    backend: 'https://example.com',
    chainId: 42000,
  },
  {
    get: (_target, _prop) => {
      throw new Error('Mainnet is not supported at this time');
    },
  },
);

/**
 * The testnet environment configuration.
 */
export const testnet: EnvironmentConfig = {
  name: 'testnet',
  backend: 'https://storage-api.testnet.lens.dev',
  chainId: 37111,
};

/**
 * @internal
 */
export const staging: EnvironmentConfig = {
  name: 'staging',
  backend: 'https://storage-api.staging.lens.dev',
  chainId: 1,
};

/**
 * @internal
 */
export const local: EnvironmentConfig = {
  name: 'local',
  backend: 'http://localhost:3010',
  chainId: 1,
};
