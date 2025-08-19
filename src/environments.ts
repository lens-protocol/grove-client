/**
 * The environment configuration type.
 */
export type EnvironmentConfig = {
  name: string;
  backend: string;
  defaultChainId: number;
  cachingTimeout: number;
  propagationTimeout: number;
  statusPollingInterval: number;
};

/**
 * The production environment configuration.
 */
export const production: EnvironmentConfig = {
  name: 'production',
  backend: 'https://api.grove.storage',
  defaultChainId: 232,
  cachingTimeout: 5000,
  propagationTimeout: 10000,
  statusPollingInterval: 500,
};

/**
 * @internal
 */
export const staging: EnvironmentConfig = {
  name: 'staging',
  backend: 'https://api.staging.grove.storage',
  defaultChainId: 37111,
  cachingTimeout: 10000,
  propagationTimeout: 20000,
  statusPollingInterval: 500,
};

/**
 * @internal
 */
export const local: EnvironmentConfig = {
  name: 'local',
  backend: 'http://localhost:30371110',
  defaultChainId: 37111,
  cachingTimeout: 0, // no caching
  propagationTimeout: 30000,
  statusPollingInterval: 500,
};
