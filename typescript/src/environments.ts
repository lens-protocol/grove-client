/**
 * The environment configuration type.
 */
export type EnvironmentConfig = {
  name: string;
  backend: string;
  defaultChainId: number;
  persistanceTimeout: number;
  persistancePollingInterval: number;
};

/**
 * The production environment configuration.
 */
export const production: EnvironmentConfig = {
  name: 'production',
  backend: 'https://api.grove.storage',
  defaultChainId: 37111,
  persistanceTimeout: 10000,
  persistancePollingInterval: 500,
};

/**
 * @internal
 */
export const staging: EnvironmentConfig = {
  name: 'staging',
  backend: 'https://api.staging.grove.storage',
  defaultChainId: 37111,
  persistanceTimeout: 20000,
  persistancePollingInterval: 500,
};

/**
 * @internal
 */
export const local: EnvironmentConfig = {
  name: 'local',
  backend: 'http://localhost:30371110',
  defaultChainId: 37111,
  persistanceTimeout: 30000,
  persistancePollingInterval: 500,
};
