import openai from "openai";
import { ChatCompletion } from "openai/resources";

export class ChatCompletionWrapper<ChatCompletion> {
	private originalClass: ChatCompletion;
    public response_time: number;

	constructor(originalClass: ChatCompletion, responseTime: number) {
		this.originalClass = originalClass;
        this.copyProperties();
        this.response_time = responseTime;
	}

	copyProperties() {
		for (const prop in this.originalClass) {
			if (this.originalClass.hasOwnProperty(prop)) {
				// Use Object.defineProperty to copy property descriptor
				Object.defineProperty(
					this,
					prop,
					Object.getOwnPropertyDescriptor(this.originalClass, prop)!
				);
			}
		}
	}
}
