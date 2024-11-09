import { LensStorageClient } from './lens-storage-client';
import path from 'path';
import fs from 'fs/promises';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function demonstrateLensStorage() {
    // Initialize the client
    let baseUrl = process.env.BASE_URL;
    if (baseUrl === undefined) {
        console.error("Please provide a base_url to the Storage Node API as env variable BAE_URL");
        return
    }
    const client = new LensStorageClient(baseUrl);
    const privateKey = process.env.PRIVATE_KEY;
    if (privateKey === undefined) {
        console.error("Please provide a private key to your wallet for siging as env variable PRIVATE_KEY");
        return
    }
    const lensAccount = process.env.LENS_ACCOUNT;
    if (lensAccount === undefined) {
        console.error("Please provide a Lens Account as env variable LENS_ACCOUNT");
        return
    }
    // Create a wallet instance
    const wallet = new ethers.Wallet(privateKey);

    console.log('🚀 Starting Lens Storage demonstration...\n');

    try {
        // 1. Single file upload (immutable)
        console.log('📤 Uploading a single immutable file...');
        const singleFileHash = await client.uploadClient.uploadFile(
            path.join(__dirname, 'test-files', 'sample.mp4'),
            {
                contentType: 'video/mp4'
            }
        );
        console.log('✅ File uploaded successfully!');
        console.log(`📎 Link hash: ${singleFileHash}\n`);

        // 2. Single file upload (mutable)
        console.log('📤 Uploading a single mutable file...');
        const mutableFileHash = await client.uploadClient.uploadFile(
            path.join(__dirname, 'test-files', 'sample.mp4'),
            {
                mutable: true,
                lensAccount,
                contentType: 'video/mp4'
            }
        );
        console.log('✅ Mutable file uploaded successfully!');
        console.log(`📎 Link hash: ${mutableFileHash}\n`);

        // 3. Single file editing
        console.log('📤 Editing a single mutable file...');
        let editedFileHash = await client.editClient.editFile(
            mutableFileHash,
            path.join(__dirname, 'test-files', 'file2.mp4'),
            {
                lensAccount,
                signMessage: async (message) => {
                    return await wallet.signMessage(message);
                }
            }
        );
        console.log('✅ Mutable file edited successfully!');
        console.log(`📎 Link hash: ${editedFileHash}\n`);

        // 4. Multiple files upload with folder indexing
        console.log('📤 Uploading multiple files with folder indexing...');
        const testFiles = [
            path.join(__dirname, 'test-files', 'file1.mp4'),
            path.join(__dirname, 'test-files', 'file2.mp4'),
            path.join(__dirname, 'test-files', 'file3.mp4')
        ];

        const { folderHash, fileHashes } = await client.uploadClient.uploadMultipleFiles(
            testFiles,
            {
                mutable: true,
                lensAccount,
                enableFolderIndex: true,
                contentType: 'video/mp4',
                indexContent: {
                    title: 'My Video Collection',
                    description: 'A collection of sample videos',
                    files: [] // This will be populated automatically
                }
            }
        );

        console.log('✅ Multiple files uploaded successfully!');
        console.log(`📁 Folder hash: ${folderHash}`);
        console.log('📎 File hashes:');
        fileHashes.forEach((hash, index) => {
            console.log(`   ${index + 1}. ${hash}`);
        });
        console.log();

        // 5. Download a file
        console.log('📥 Downloading the first uploaded file...');
        const fileContent = await client.retrieveClient.downloadFile(singleFileHash);

        // Save the downloaded file
        const downloadPath = path.join(__dirname, 'downloads', 'downloaded-file.mp4');
        await fs.mkdir(path.join(__dirname, 'downloads'), { recursive: true });
        await fs.writeFile(downloadPath, fileContent);

        console.log('✅ File downloaded successfully!');
        console.log(`💾 Saved to: ${downloadPath}\n`);

        // 6. Single file deleting
        console.log('❌ Deleting a single file...');
        let deletedFileHash = await client.deleteClient.deleteContent(
            mutableFileHash,
            {
                signMessage: async (message) => {
                    return await wallet.signMessage(message);
                }
            }
        );
        console.log('✅ Mutable file deleted successfully!');
        console.log(`📎 Link hash: ${deletedFileHash}\n`);

        // 7. Display access URLs
        console.log('🔗 Access URLs:');
        console.log(`Single file: ${baseUrl}/${singleFileHash}`);
        console.log(`Folder index: ${baseUrl}/${folderHash}\n`);

        console.log('✨ Demo completed successfully!');

    } catch (error) {
        console.error('❌ Error during demonstration:', error);
        process.exit(1);
    }
}

// Create required directories
async function setup() {
    const directories = [
        path.join(__dirname, 'test-files'),
        path.join(__dirname, 'downloads')
    ];

    for (const dir of directories) {
        await fs.mkdir(dir, { recursive: true });
    }

    // Create sample files for testing
    const sampleFiles = [
        'sample.mp4',
        'file1.mp4',
        'file2.mp4',
        'file3.mp4'
    ];

    for (const file of sampleFiles) {
        const filePath = path.join(__dirname, 'test-files', file);
        // Create a dummy file with some content
        await fs.writeFile(filePath, `Sample content for ${file}`);
    }
}

// Run the demo
(async () => {
    try {
        await setup();
        await demonstrateLensStorage();
    } catch (error) {
        console.error('Failed to run demo:', error);
        process.exit(1);
    }
})();
