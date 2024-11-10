import { privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";
import { StorageClient } from "./StorageClient";
import { staging } from "./environments";

const signer = privateKeyToAccount(import.meta.env.PRIVATE_KEY);
const file1 = new File(["This is a test file."], "test.txt", {
  type: "text/plain",
});
const file2 = new File(["This is another test file."], "test2.txt", {
  type: "text/plain",
});

describe(`Given an instance of the '${StorageClient.name}'`, () => {
  const client = StorageClient.create(staging);

  describe("When testing single file uploads", () => {
    it("Then it should create the expected resource", async () => {
      const resource = await client.uploadFile(file1);

      const response = await fetch(client.resolve(resource.uri), {
        method: "HEAD",
      });

      expect(response.status).toBe(200);
      expect(resource).toBeDefined();
    });
  });

  describe("When testing folder uploads", () => {
    const files = [file1, file2];

    it("Then it should create an immutable folder", async () => {
      const resource = await client.uploadFolder(files);

      expect(resource).toBeDefined();
    });

    it("Then should allow to enable directory listing", async () => {
      const resource = await client.uploadFolder(files, {
        index: true,
      });

      const url = client.resolve(resource.folder.uri);
      const response = await fetch(url);
      const json = await response.json();
      expect(json).toMatchObject({
        /** shape of built-in indexing structure */
      });
    });

    it("Then should allow to specify you own index file", async () => {
      const content = [{ name: "test.txt" }, { name: "test2.txt" }];
      const index = new File([JSON.stringify(content)], "index.json", {
        type: "application/json",
      });
      const resource = await client.uploadFolder(files, { index });

      const url = client.resolve(resource.folder.uri);
      const response = await fetch(url);
      const json = await response.json();
      expect(json).toMatchObject(content);
    });
  });

  describe('When testing file editing', () => {
    it("Then it should deletion according to the specified ACL", async () => {
      const resource = await client.uploadFile(file1, {
        acl: {
          template: "lens_account",
          lensAccount: "0x1234567890123456789012345678901234567890",
        },
      });

      // This could be tricky to assert until we can have a Lens Account owned by env.PRIVATE_KEY
      await expect(client.editFile(resource.uri, file2, signer)).resolves.toBe(true);
    });

  });

  describe("When testing file deletion", () => {
    it("Then it should deletion according to the specified ACL", async () => {
      const resource = await client.uploadFile(file1, {
        acl: {
          template: "lens_account",
          lensAccount: "0x1234567890123456789012345678901234567890",
        },
      });

      // This could be tricky to assert until we can have a Lens Account owned by env.PRIVATE_KEY
      await expect(client.delete(resource.uri, signer)).resolves.toBe(true);
    });
  });
});
