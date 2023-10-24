import openai from 'openai';

export class CompletionAwareMixin {
  clientReady: Promise<boolean>;
  client: openai;

  public async getChatCompletion(model: string, messages: any[], functions?: any[]): Promise<any> {
    await this.clientReady;
    try {
      const requestObject = {
        model,
        messages,
      };
      if (functions) {
        requestObject['functions'] = functions;
      }
      const response = await this.client.chat.completions.create(requestObject);
      if (!response && !response.choices && !response.choices[0] && !response.choices[0].message) {
        throw new Error(`Error response from OpenAI API: ${JSON.stringify(response)}`);
      }
      return response;
    } catch (error) {
      throw new Error(`Error response from OpenAI API: ${error.message}`);
    }
  }
}
