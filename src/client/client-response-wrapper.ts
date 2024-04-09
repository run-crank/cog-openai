
import { ChatCompletion } from "openai/resources";

export class ClientResponseWrapper {
  private originalClass: ChatCompletion;

  public response_time: number;

  public request_payload: object;

  public text_response: string;

  public usage: object;

  public created: number;

  constructor(originalObject: ChatCompletion, responseTime: number, requestPayload: object) {
    this.originalClass = originalObject;
    this.copyProperties();
    this.response_time = responseTime;
    this.request_payload = requestPayload;
    this.text_response = originalObject.choices[0].message.content;
    this.usage = {
      input: originalObject.usage.prompt_tokens,
      output: originalObject.usage.completion_tokens,
      total: originalObject.usage.total_tokens,
    }
    this.created = originalObject.created;
  }

  copyProperties() {
    for (const prop in this.originalClass) {
      // Using Object.prototype.hasOwnProperty.call() for safer property check
      if (Object.prototype.hasOwnProperty.call(this.originalClass, prop)) {
        // Use Object.defineProperty to copy property descriptor
        Object.defineProperty(
          this,
          prop,
          Object.getOwnPropertyDescriptor(this.originalClass, prop)!,
        );
      }
    }
  }
}
