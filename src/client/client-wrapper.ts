import * as grpc from '@grpc/grpc-js';
import { Field } from '../core/base-step';
import { FieldDefinition } from '../proto/cog_pb';
import {
  CompletionAwareMixin,
  EmbeddingsAwareMixin,
} from './mixins';
import openai from 'openai';

/**
 * This is a wrapper class around the API client for your Cog. An instance of
 * this class is passed to the constructor of each of your steps, and can be
 * accessed on each step as this.client.
 */
class ClientWrapper {
  /**
   * This is an array of field definitions, each corresponding to a field that
   * your API client requires for authentication. Depending on the underlying
   * system, this could include bearer tokens, basic auth details, endpoints,
   * etc.
   *
   * If your Cog does not require authentication, set this to an empty array.
   */
  public static expectedAuthFields: Field[] = [{
    field: 'apiKey',
    type: FieldDefinition.Type.STRING,
    description: 'OpenAI API Key',
    help: 'OpenAI API Key',
  }];

  /**
   * Private instance of the wrapped API client. You will almost certainly want
   * to swap this out for an API client specific to your Cog's needs.
   */
  auth: grpc.Metadata;

  client: openai;

  clientReady: Promise<boolean>;

  /**
   * Constructs an instance of the ClientWwrapper, authenticating the wrapped
   * client in the process.
   *
   * @param auth - An instance of GRPC Metadata for a given RunStep or RunSteps
   *   call. Will be populated with authentication metadata according to the
   *   expectedAuthFields array defined above.
   *
   * @param clientConstructor - An optional parameter Used only as a means to
   *   simplify automated testing. Should default to the class/constructor of
   *   the underlying/wrapped API client.
   */
  constructor(auth: grpc.Metadata, clientConstructor = openai.OpenAI) {
    // Call auth.get() for any field defined in the static expectedAuthFields
    // array here. The argument passed to get() should match the "field" prop
    // declared on the definition object above.
    this.auth = auth;
    this.client = new clientConstructor({
      apiKey: this.auth.get('apiKey').toString(), // defaults to process.env["OPENAI_API_KEY"]
    });
    this.clientReady = Promise.resolve(true);
  }
}

interface ClientWrapper extends
  CompletionAwareMixin,
  EmbeddingsAwareMixin {}
applyMixins(ClientWrapper, [
  CompletionAwareMixin,
  EmbeddingsAwareMixin,
]);

function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      // tslint:disable-next-line:max-line-length
      Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name));
    });
  });
}

export { ClientWrapper };
