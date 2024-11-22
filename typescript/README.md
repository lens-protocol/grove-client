# Lens Storage Node Client

The official Lens Storage Node client for JavaScript, TypeScript, and Node.js.

## Table of Contents <!-- omit in toc -->

- [Quick Start](#quick-start)
- [Development Workflow](#development-workflow)
- [Contributing](#contributing)
- [License](#license)

## Quick Start

```bash
pnpm add @lens-protocol/storage-node-client

# or

npm install @lens-protocol/storage-node-client

# or

yarn add @lens-protocol/storage-node-client
```

Create an instance of the `StorageClient`:

```ts
import { StorageClient, testnet } from "@lens-protocol/storage-node-client";

const storageClient = StorageClient.create(testnet);
```

Assuming you have a signer instance that satisfies the `Signer` interface.

```ts
interface Signer {
   signMessage({ message }): Promise<string>;
}
```

> [!TIP] > [Viem](https://viem.sh/)'s `WalletClient` class satisfies the `Signer` interface.

Upload a file:

```ts
const { uri, storageKey, gatewayUrl } = await storageClient.uploadFile(file:File);

console.log(uri); // lens://3552f3b6403e06ac89eba06b9f41ad82fd5dfb95c57d35b9446767…
```

Upload a mutable file:

```ts
const { uri, storageKey, gatewayUrl } = await storageClient.uploadFile(file:File, { mutable: true });
```

Use the `lens_account` ACL template:

```ts
const { uri, storageKey, gatewayUrl } = await storageClient.uploadFile(file:File, {
   acl: {
      template: 'lens_account',
      lensAccount: '0x1234567890abcdef1234567890abcdef12345678'
   }
});
```

Use the `generic_acl` ACL template:

```ts
const file: File = ...

const { uri, storageKey, gatewayUrl } = await storageClient.uploadFile(file, {
   acl: {
      template: 'generic_acl',
      contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 1,
      networkType: 'evm',
      functionSig: '0x12345678',
      params: [1, 2, 3]
   }
});
```

Upload a folder:

```ts
const files: FileList = ...

const {
   files,   // [ { uri, storageKey, gatewayUrl } ],
   folder   // { uri, storageKey, gatewayUrl }
} = await storageClient.uploadFolder(files);

console.log(folder.uri); // lens://3552f3b6403e06ac89eba06b9f41ad82fd5dfb95c57d35b9446767…
console.log(files[0].uri); // lens://b53d9c4ea2acbadc00b9d0fc61bafa6ba1bf161dade9ac465667f5…
```

Delete a file or folder:

```ts
const success = await storageClient.delete(
  "lens://3552f3b6403e06ac89eba06b9f41ad82fd5dfb95c57d35b9446767…",
  walletClient
);

console.log(success); // true
```

Edit a file:

```ts
const file: File = ...

const success = await storageClient.editFile('lens://3552f3b6403e06ac89eba06b9f41ad82fd5dfb95c57d35b9446767…', file, walletClient);

console.log(success); // true
```

## Development Workflow

This section is for developers who want to contribute to the SDK.

### Pre-requisites: <!-- omit in toc -->

- Node.js: >= v20. See [installation guide](https://nodejs.org/en/download/package-manager).
- pnpm: v9.1.2. See [installation guide](https://pnpm.io/installation).

Use [nvm](https://github.com/nvm-sh/nvm) to manage your Node.js versions. Run the following command in the project root folder:

```bash
nvm use
```

to switch to the correct Node.js version.

Enable [corepack](https://www.totaltypescript.com/how-to-use-corepack) to use the the correct version of `pnpm`.

Run the following command in the project root folder:

```bash
corepack install
```

to install the correct version once. After that corepack will automatically use the correct version of `pnpm` when entering the project folder.

### Initial Setup <!-- omit in toc -->

Clone the repository:

```bash
git clone https://github.com/lens-network/lens-storage-node-client-libs.git
cd lens-storage-node-client-libs/typescript
```

Create `.env` file from the `.env.example` template:

```bash
cp .env.example .env
```

and populate the `PRIVATE_KEY` environment variable:

```bash filename=".env"
PRIVATE_KEY=0x…
```

with the private key of a Lens Account owner (needed by Lens Account ACL tests).

Install the dependencies:

```bash
pnpm install
```

### Usage <!-- omit in toc -->

Run the tests:

- `pnpm test`

Lint the code:

```bash
pnpm lint
```

Compile the code:

```bash
pnpm build
```

Clean the build:

```bash
pnpm clean
```

### IDE Setup <!-- omit in toc -->

The project uses [Biome](https://biomejs.dev/) to format and lint the code. You can install the Biome extension for your IDE: https://biomejs.dev/guides/editors/first-party-extensions/

### Publishing <!-- omit in toc -->

1. Create a new release branch using the `release/X.Y.Z` naming convention.
2. Bumps up version number and updates the changelog.

   ```bash
   pnpm changeset version
   ```

3. Commit the changes using `chore: bumps up version number` as the commit message.
4. Push the changes to the remote repository.
5. Open a pull request to the `main` branch.
6. Wait for all checks to pass and for the pull request to be approved.
7. Publish the package.

   ```bash
   pnpm changeset publish
   ```

8. Push tags to the remote repository.

   ```bash
   git push --follow-tags
   ```

9. Merge the pull request to the `main` branch.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

Lens Social SDK is [MIT licensed](./LICENSE).
