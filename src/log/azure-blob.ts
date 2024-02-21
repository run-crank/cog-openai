import { AzureBlobContainer } from "./azure-blob-container";

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
            "created": this.timestamp,
            "content": this.content
        }
        return data;
    }
}

// const storage = new AzureBlobContainer("openai-cog-logs");
// storage.getAllBlobs().then((blobs) => {
//     console.log(blobs);
//     blobs.forEach((blob) => {
//         storage.getBlobByBlobName(blob).then((content) => {
//             let parsed = JSON.parse(content);
//             const expanded = JSON.stringify(parsed, null, 2);
//             console.log(expanded);
//         });
//     });
// })