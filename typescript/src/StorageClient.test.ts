import nodeFetch from 'node-fetch';
import { privateKeyToAccount } from 'viem/accounts';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { StorageClient } from './StorageClient';
import { immutable, lensAccountOnly, walletOnly } from './builders';
import { staging } from './environments';
import { FileUploadResponse, type Resource } from './types';
import { never } from './utils';

const signer = privateKeyToAccount(import.meta.env.PRIVATE_KEY);
const file1 = new File(['This is a test file.'], 'test.txt', {
  type: 'text/plain',
});
const file2 = new File(['This is another test file.'], 'test2.txt', {
  type: 'text/plain',
});

async function assertFileExist(url: string) {
  const response = await fetch(url, {
    method: 'HEAD',
  });
  expect(response.status).toBe(200);
}

describe(`Given an instance of the '${StorageClient.name}'`, () => {
  const client = StorageClient.create(staging);

  describe(`And an 'immutable' ACL configuration`, () => {
    const acl = immutable(37111);

    describe('When testing single file uploads', () => {
      it('Then it should create the expected response', async () => {
        const response = await client.uploadFile(file1, { acl });

        await assertFileExist(client.resolve(response.uri));
        expect(response).toBeDefined();
      });
    });

    describe('When testing an immutable JS Object upload', () => {
      it('Then it should create the expected response', async () => {
        const response = await client.uploadAsJson({ test: 'test' }, { acl });

        await assertFileExist(client.resolve(response.uri));
        expect(response).toBeDefined();
      });
    });
  });

  describe(`And any 'mutable' ACL configuration`, () => {
    const acl = lensAccountOnly(import.meta.env.ACCOUNT, 37111);

    describe('When testing single file uploads', () => {
      it('Then it should create the expected response', async () => {
        const response = await client.uploadFile(file1, { acl });

        await assertFileExist(client.resolve(response.uri));
        expect(response).toBeDefined();
      });
    });

    describe('When testing an immutable JS Object upload', () => {
      it('Then it should create the expected response', async () => {
        const response = await client.uploadAsJson({ test: 'test' }, { acl });

        await assertFileExist(client.resolve(response.uri));
        expect(response).toBeDefined();
      });
    });
  });

  describe('When testing folder uploads', () => {
    const files = [file1, file2];

    it('Then it should create the expected resources', async () => {
      const result = await client.uploadFolder(files);

      await assertFileExist(client.resolve(result.files[0]?.uri ?? never()));
    });

    it('Then it should support default directory listing', async () => {
      const response = await client.uploadFolder(files, {
        index: true,
      });

      const url = client.resolve(response.folder.uri);
      const res = await fetch(url);
      const json = await res.json();
      expect(json).toMatchObject({
        files: expect.arrayContaining([expect.any(String), expect.any(String), expect.any(String)]),
      });
    });

    it('Then it should support using an arbitrary index file', async () => {
      const index = new File(['[]'], 'index.json', { type: 'text/plain' });

      const response = await client.uploadFolder(files, { index });

      const url = client.resolve(response.folder.uri);
      const res = await fetch(url);
      const json = await res.json();
      expect(json).toMatchObject([]);
    });

    it('Then it should support an index file factory', async () => {
      const indexFactory = (resources: Resource[]) => resources.map((r) => r.uri);
      const response = await client.uploadFolder(files, {
        index: indexFactory,
      });

      const url = client.resolve(response.folder.uri);
      const res = await fetch(url);
      const json = await res.json();
      expect(json).toMatchObject(expect.arrayContaining([expect.stringContaining('lens://')]));
    });

    it('Then it should allow to specify you own index file', async () => {
      const content = [{ name: 'test.txt' }, { name: 'test2.txt' }];
      const index = new File([JSON.stringify(content)], 'index.json', {
        type: 'application/json',
      });
      const response = await client.uploadFolder(files, { index });

      const url = client.resolve(response.folder.uri);
      const res = await fetch(url);
      const json = await res.json();
      expect(json).toMatchObject(content);
    });
  });

  describe('When testing file editing with Lens Accounts', () => {
    it(
      'Then it should allow editing according to the specified ACL',
      { timeout: 20000 },
      async () => {
        const acl = lensAccountOnly(import.meta.env.ACCOUNT, 37111);
        const response = await client.uploadFile(file1, { acl });

        await response.waitForPropagation();
        await expect(client.editFile(response.uri, file2, signer, { acl })).resolves.toBeInstanceOf(
          FileUploadResponse,
        );
      },
    );
  });

  describe('When testing file deletion with Lens Accounts', () => {
    it(
      'Then it should allow deletion according to the specified ACL',
      { timeout: 20000 },
      async () => {
        const acl = lensAccountOnly(import.meta.env.ACCOUNT, 37111);
        const response = await client.uploadFile(file1, { acl });

        await response.waitForPropagation();
        await expect(client.delete(response.uri, signer)).resolves.toBe(true);
      },
    );
  });

  describe('When testing file editing with Wallet Addresses', () => {
    it(
      'Then it should allow editing according to the specified ACL',
      { timeout: 20000 },
      async () => {
        const acl = walletOnly(import.meta.env.ADDRESS, 37111);
        const response = await client.uploadFile(file1, { acl });

        await response.waitForPropagation();
        await expect(client.editFile(response.uri, file2, signer, { acl })).resolves.toBeInstanceOf(
          FileUploadResponse,
        );
      },
    );
  });

  describe('When testing file deletion with Wallet Addresses', () => {
    it('Then it should allow deletion according to the specified ACL', async () => {
      const acl = walletOnly(import.meta.env.ADDRESS, 37111);
      const response = await client.uploadFile(file1, { acl });

      await response.waitForPropagation();
      await expect(client.delete(response.uri, signer)).resolves.toBe(true);
    });
  });

  describe.skip(`When running in environments with custom 'fetch' based on 'node-fetch'`, () => {
    beforeAll(() => {
      vi.stubGlobal('fetch', nodeFetch);
    });

    it('Then it should fallback to FormData uploads since ReadableStream is not supported', async () => {
      const response = await client.uploadFile(file1);

      await assertFileExist(client.resolve(response.uri));
      expect(response).toBeDefined();
    });
  });
});
