export class ChatCompletionWrapper<ChatCompletion> {
  private originalClass: ChatCompletion;

  public response_time: number;

  public request_payload: object;

  constructor(originalClass: ChatCompletion, responseTime: number, requestPayload: object) {
    this.originalClass = originalClass;
    this.copyProperties();
    this.response_time = responseTime;
    this.request_payload = requestPayload;
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
