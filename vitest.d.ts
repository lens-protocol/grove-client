/// <reference types="@vitest/browser/providers/webdriverio" />

import 'vitest';

declare module 'vitest' {
  interface AsymmetricMatchersContaining extends JestExtendedMatchers {}
}
