export type EvmAddress = `0x${string}`;

export type LensAccountAclTemplate = {
	template: "lens_account";
	lens_account: EvmAddress;
};

export type GenericAclTemplate = {
	template: "generic_acl";
	contractAddress: string;
	chainId: number;
	networkType: "evm"; // | other supported network types
	functionSig: string;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	params: any[];
};

export type AclTemplate = LensAccountAclTemplate | GenericAclTemplate;

export interface Signer {
	signMessage({ message }: { message: string }): Promise<string>;
}

export type UploadFileOptions = {
	/**
	 * Whether the resource is mutable or not.
	 *
	 * @defaultValue false
	 */
	mutable?: boolean;
	/**
	 * The ACL template to use for the resource.
	 *
	 * @defaultValue no ACL will be applied on the resource
	 */
	acl?: AclTemplate;
};

export type UploadFolderOptions = UploadFileOptions & {
	/**
	 * Whether accession the resource URI should serve an folder indexing response.
	 * - If a `File` is provided, the file content will be used as the folder indexing response.
	 * - If `true`, it will server the default JSON response.
	 * - If `false`, it will server the folder's manifest file.
	 */
	index?: File | boolean;
};

export type Resource = {
	/**
	 * The `lens://…` URI of the resource.
	 */
	uri: string;

	/**
	 * The link hash of the resource.
	 */
	linkHash: string;

	/**
	 * The CID of the resource.
	 */
	cid?: string;
};

export type UploadFolderResponse = {
	files: Resource[];
	folder: Resource;
};
