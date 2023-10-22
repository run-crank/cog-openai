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
      return response.choices[0].message;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
