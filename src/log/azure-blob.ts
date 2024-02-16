import { OpenAIBlobContainer } from './openai-azure-blob-container';

export class AzureBlob {
    private timestamp: string;
    private content: string;

    constructor(content: string) {
        this.timestamp = new Date().toISOString();
        this.content = content;
    }

    getBlobData() {
        const blobName = `cog-log-${this.timestamp}.json`
        const data = {
            "blobName": blobName,
            "content": this.content
        }
        return data;
    }
}
