import { privateKeyToAccount } from 'viem/accounts';
import { describe, expect, it } from 'vitest';
import { StorageClient } from './StorageClient';
import { staging } from './environments';
import type { Resource } from './types';
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

  describe('When testing single file uploads', () => {
    it('Then it should create the expected resource', async () => {
      const resource = await client.uploadFile(file1);

      assertFileExist(client.resolve(resource.uri));
      expect(resource).toBeDefined();
    });
  });

  describe('When testing folder uploads', () => {
    const files = [file1, file2];

    it('Then it should create the expected resources', async () => {
      const result = await client.uploadFolder(files);

      assertFileExist(client.resolve(result.folder.uri));
      assertFileExist(client.resolve(result.files[0]?.uri ?? never()));
    });

    it('Then it should support default directory listing', async () => {
      const resource = await client.uploadFolder(files, {
        index: true,
      });

      const url = client.resolve(resource.folder.uri);
      const response = await fetch(url);
      const json = await response.json();
      expect(json).toMatchObject({
        files: expect.arrayContaining([expect.any(String), expect.any(String), expect.any(String)]),
      });
    });

    it('Then it should support using an arbitrary index file', async () => {
      const index = new File(['[]'], 'index.json', { type: 'text/plain' });

      const resource = await client.uploadFolder(files, { index });

      const url = client.resolve(resource.folder.uri);
      const response = await fetch(url);
      const json = await response.json();
      expect(json).toMatchObject([]);
    });

    it('Then it should support and index file factory', async () => {
      const indexFactory = (resources: Resource[]) => resources.map((r) => r.uri);
      const resource = await client.uploadFolder(files, {
        index: indexFactory,
      });

      const url = client.resolve(resource.folder.uri);
      const response = await fetch(url);
      const json = await response.json();
      expect(json).toMatchObject(expect.arrayContaining([expect.stringContaining('lens://')]));
    });

    it('Then it should allow to specify you own index file', async () => {
      const content = [{ name: 'test.txt' }, { name: 'test2.txt' }];
      const index = new File([JSON.stringify(content)], 'index.json', {
        type: 'application/json',
      });
      const resource = await client.uploadFolder(files, { index });

      const url = client.resolve(resource.folder.uri);
      const response = await fetch(url);
      const json = await response.json();
      expect(json).toMatchObject(content);
    });
  });

  describe('When testing file editing', () => {
    it.skip('Then it should deletion according to the specified ACL', async () => {
      const resource = await client.uploadFile(file1, {
        acl: {
          template: 'lens_account',
          lensAccount: '0x1234567890123456789012345678901234567890',
        },
      });

      // This could be tricky to assert until we can have a Lens Account owned by env.PRIVATE_KEY
      await expect(client.editFile(resource.uri, file2, signer)).resolves.toBe(true);
    });
  });

  describe('When testing file deletion', () => {
    it.skip('Then it should deletion according to the specified ACL', async () => {
      const resource = await client.uploadFile(file1, {
        acl: {
          template: 'lens_account',
          lensAccount: '0x1234567890123456789012345678901234567890',
        },
      });

      // This could be tricky to assert until we can have a Lens Account owned by env.PRIVATE_KEY
      await expect(client.delete(resource.uri, signer)).resolves.toBe(true);
    });
  });
});
