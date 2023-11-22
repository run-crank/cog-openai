import openai from 'openai';

export class EmbeddingsAwareMixin {
  clientReady: Promise<boolean>;

  client: openai;

  public async getEmbeddings(model: string, input: string): Promise<any> {
    await this.clientReady;
    try {
      const response = await this.client.embeddings.create({
        input,
        model,
      });
      if (!response && !response.data && response.data.length === 0) {
        throw new Error(`Error response from OpenAI API: ${JSON.stringify(response)}`);
      }
      return response;
    } catch (error) {
      throw new Error(`Error response from OpenAI API: ${error.message}`);
    }
  }
}
