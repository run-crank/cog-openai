import openai from 'openai';
import { ClientResponseWrapper } from '../client-response-wrapper';

export class CompletionAwareMixin {
  clientReady: Promise<boolean>;

  client: openai;

  public async getChatCompletion(model: string, messages: any[], functions?: any[]): Promise<ClientResponseWrapper> {
    const startTime = Date.now();
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
      const endTime = Date.now();
      const responseWrapper = new ClientResponseWrapper(response, endTime - startTime, requestObject);
      return responseWrapper;
    } catch (error) {
      throw new Error(`Error response from OpenAI API: ${error.message}`);
    }
  }
}
