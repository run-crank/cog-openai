export class AzureBlob {
    private timestamp: string;
    private content: object;

    constructor(content: object) {
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