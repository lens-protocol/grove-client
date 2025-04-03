# Grove Client <!-- omit in toc -->

The official Grove client for JavaScript, TypeScript, and Node.js.

## Table of Contents <!-- omit in toc -->

- [Quick Start](#quick-start)
- [Development Workflow](#development-workflow)
- [Contributing](#contributing)
- [License](#license)

## Quick Start

```bash
pnpm add @lens-chain/storage-client

# or

npm install @lens-chain/storage-client

# or

yarn add @lens-chain/storage-client
```

Create an instance of the `StorageClient`:

```ts
import { StorageClient } from "@lens-chain/storage-client";

const storageClient = StorageClient.create();
```

Upload a file:

```ts
import { immutable }
const file: File = // …

const resource = await storageClient.uploadFile(file, { acl: immutable(37111) });

console.log(resource.uri); // lens://3552f3b6403e06ac89eba06b9f41ad82fd5dfb95c57d35b9446767…
```

## Development Workflow

This section is for developers who want to contribute to this library.

### Pre-requisites: <!-- omit in toc -->

- Node.js: >= v20. See [installation guide](https://nodejs.org/en/download/package-manager).
- pnpm: v9.1.2. See [installation guide](https://pnpm.io/installation).

Use [nvm](https://github.com/nvm-sh/nvm) to manage your Node.js versions. Run the following command in the project root folder:

```bash
nvm use
```

to switch to the correct Node.js version.

Enable [corepack](https://www.totaltypescript.com/how-to-use-corepack) to use the correct version of `pnpm`.

Run the following command in the project root folder:

```bash
corepack install
```

to install the correct version once. After that corepack will automatically use the correct version of `pnpm` when entering the project folder.

### Initial Setup <!-- omit in toc -->

Create `.env` file from the `.env.example` template:

```bash
cp .env.example .env
```

and populate the `PRIVATE_KEY` environment variable:

```bash filename=".env"
PRIVATE_KEY=0x…
ACCOUNT=0x…
ADDRESS=
```

with the details of a Lens Account owner (needed by Lens Account ACL tests).

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

Grove Client is [MIT licensed](./LICENSE).
