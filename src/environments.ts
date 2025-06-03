/**
 * The environment configuration type.
 */
export type EnvironmentConfig = {
  name: string;
  backend: string;
  defaultChainId: number;
  propagationTimeout: number;
  propagationPollingInterval: number;
};

/**
 * The production environment configuration.
 */
export const production: EnvironmentConfig = {
  name: 'production',
  backend: 'https://api.grove.storage',
  defaultChainId: 232,
  propagationTimeout: 10000,
  propagationPollingInterval: 500,
};

/**
 * @internal
 */
export const staging: EnvironmentConfig = {
  name: 'staging',
  backend: 'https://api.staging.grove.storage',
  defaultChainId: 37111,
  propagationTimeout: 20000,
  propagationPollingInterval: 500,
};

/**
 * @internal
 */
export const local: EnvironmentConfig = {
  name: 'local',
  backend: 'http://localhost:30371110',
  defaultChainId: 37111,
  propagationTimeout: 30000,
  propagationPollingInterval: 500,
};
