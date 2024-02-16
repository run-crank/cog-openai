import { AzureBlobContainer } from './azure-blob-container';
import { BlobServiceClient } from "@azure/storage-blob";

export class OpenAIBlobContainer extends AzureBlobContainer {
    private containerName: string = "openai-cog-logs";

    constructor() {
        super();
        this.blobServiceClient = BlobServiceClient.fromConnectionString(this.connectionString);
        this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    }
}