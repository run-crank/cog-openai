import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { ClientWrapper } from '../../src/client/client-wrapper';
import { Metadata } from '@grpc/grpc-js';

chai.use(sinonChai);
chai.use(require('chai-as-promised'));

describe('ClientWrapper', () => {
  const expect = chai.expect;
  let metadata: Metadata;
  let clientWrapperUnderTest: ClientWrapper;
  let openAiClientStub: any;
  let openAiConstructorStub: any;

  beforeEach(() => {
    openAiClientStub = {
      apiKey: sinon.spy(),
    };
    openAiConstructorStub = sinon.stub();
    openAiConstructorStub.returns(openAiClientStub);
  });

  it('authenticates with api key', () => {
    // Construct grpc metadata and assert the client was authenticated.
    const expectedCallArgs = { apiKey: 'Some API key' };
    metadata = new Metadata();
    metadata.add('apiKey', expectedCallArgs.apiKey);

    // Assert that the underlying API client was authenticated correctly.
    clientWrapperUnderTest = new ClientWrapper(metadata, openAiConstructorStub);
    expect(openAiConstructorStub).to.have.been.calledWith(expectedCallArgs);
    expect(clientWrapperUnderTest.clientReady).to.eventually.equal(true);
  });

  describe('CompletionAware', () => {
    beforeEach(() => {
      openAiClientStub = {
        chat: {
          completions: {
            create: sinon.stub(),
          },
        },
      };
      openAiClientStub.chat.completions.create.returns(Promise.resolve());
      openAiClientStub.chat.completions.create.then = sinon.stub();
      openAiClientStub.chat.completions.create.then.resolves();
      openAiConstructorStub.returns(openAiClientStub);
    });

    it('getChatCompletion', async () => {
      clientWrapperUnderTest = new ClientWrapper(metadata, openAiConstructorStub);
      const sampleModel = 'gpt-3.5-turbo';
      const sampleMessages = [{ 'role': 'user', 'content': 'What\'s the weather like in Boston?' }];
      openAiClientStub.chat.completions.create.resolves({
        choices: [
          {
            message: 'Some message',
          },
        ],
      });
      await clientWrapperUnderTest.getChatCompletion(sampleModel, sampleMessages);
      expect(openAiClientStub.chat.completions.create).to.have.been.calledWith({ model: sampleModel, messages: sampleMessages });
    });
  });

  describe('EmbeddingsAware', () => {
    beforeEach(() => {
      openAiClientStub = {
        embeddings: {
          create: sinon.stub(),
        },
      };
      openAiClientStub.embeddings.create.returns(Promise.resolve());
      openAiClientStub.embeddings.create.then = sinon.stub();
      openAiClientStub.embeddings.create.then.resolves();
      openAiConstructorStub.returns(openAiClientStub);
    });

    it('getEmbeddings', async () => {
      clientWrapperUnderTest = new ClientWrapper(metadata, openAiConstructorStub);
      const sampleModel = 'text-embedding-ada-002'; // or any other embedding model
      const sampleInput = 'How do I bake a cake?';

      // Mocking the response of the 'create' method
      openAiClientStub.embeddings.create.resolves({
        data: [
          {
            embedding: [
              0.12345,
              0.54321,
              0.98765,
            ],
            index: 0,
            object: 'embedding',
          },
        ],
        model: 'text-embedding-ada-002',
        object: 'list',
        usage: {
          prompt_tokens: 4,
          total_tokens: 4,
        },
      });

      await clientWrapperUnderTest.getEmbeddings(sampleModel, sampleInput);
      expect(openAiClientStub.embeddings.create).to.have.been.calledWith({
        model: sampleModel,
        input: sampleInput,
      });
    });
  });
});
