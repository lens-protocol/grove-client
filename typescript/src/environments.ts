/**
 * The environment configuration type.
 */
export type EnvironmentConfig = {
  name: string;
  backend: string;
};

/**
 * The mainnet environment configuration.
 */
export const mainnet: EnvironmentConfig = new Proxy(
  {
    name: 'mainnet',
    backend: 'https://example.com',
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
};

/**
 * @internal
 */
export const staging: EnvironmentConfig = {
  name: 'staging',
  backend: 'https://storage-api.staging.lens.dev',
};

/**
 * @internal
 */
export const local: EnvironmentConfig = {
  name: 'local',
  backend: 'http://localhost:3000/graphql',
};
