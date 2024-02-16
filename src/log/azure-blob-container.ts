import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { AzureBlob } from "./azure-blob";
import * as dotenv from "dotenv";
dotenv.config();

export abstract class AzureBlobContainer {
    private accountName: string = process.env.AZURE_BLOB_STORAGE_ACCOUNT_NAME;
    private accountKey: string = process.env.AZURE_BLOB_STORAGE_ACCOUNT_KEY;
    protected connectionString: string = `DefaultEndpointsProtocol=https;AccountName=${this.accountName};AccountKey=${this.accountKey};EndpointSuffix=core.windows.net`;
    protected blobServiceClient: BlobServiceClient;
    protected containerClient: ContainerClient;

    constructor() {}

    async uploadBlob(blob: AzureBlob) {
        const data = blob.getBlobData();
        const blockBlobClient = this.containerClient.getBlockBlobClient(data.blobName);

        const content = JSON.stringify(data.content);

        await blockBlobClient.upload(content, content.length);

        console.log(`Blob "${data.blobName}" uploaded to Azure Blob Storage.`);
    }

    async getAllBlobs(): Promise<any[]> {
        const blobList = [];
        for await (const blob of this.containerClient.listBlobsFlat()) {
            blobList.push(blob.name);
        }

        return blobList;
    }

    async getBlobByBlobName(blobName: string): Promise<string>{
        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

        const downloadResponse = await blockBlobClient.download(0);
        const downloadedContent = await this.streamToString(downloadResponse.readableStreamBody);

        return downloadedContent;
    }

    async deleteBlob(blobName: string) {
        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.delete();

        console.log(`Blob "${blobName}" deleted from Azure Blob Storage.`);
    }

    private async streamToString(readableStream: NodeJS.ReadableStream): Promise<string> {
        return new Promise((resolve, reject) => {
            const chunks: any[] = [];
            readableStream.on("data", (data) => {
                chunks.push(data.toString());
            });
            readableStream.on("end", () => {
                resolve(chunks.join(""));
            });
            readableStream.on("error", reject);
        });
    }
}
