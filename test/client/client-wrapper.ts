import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { CompletionAwareMixin } from '../../src/client/mixins/completion-aware';
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
    let clientWrapperUnderTest;
    let openAiClientStub;
    let openAiConstructorStub;
  
    beforeEach(() => {
      openAiClientStub = {
        chat: {
          completions: {
            create: sinon.stub(),
          },
        },
      };
      // Mock the OpenAI client constructor
      openAiConstructorStub = sinon.stub().returns(openAiClientStub);
      // Create an instance of your class under test
      clientWrapperUnderTest = new CompletionAwareMixin();
      clientWrapperUnderTest.client = openAiClientStub;
      clientWrapperUnderTest.clientReady = Promise.resolve(true); // Simulate client being ready
    });
  
    it('successfully retrieves chat completion', async () => {
      const sampleModel = 'gpt-3.5-turbo';
      const sampleMessages = [{ 'role': 'user', 'content': 'What\'s the weather like in Boston?' }];
      openAiClientStub.chat.completions.create.resolves({
        choices: [
          {
            message: 'It\'s sunny in Boston today!',
          },
        ],
      });
  
      const response = await clientWrapperUnderTest.getChatCompletion(sampleModel, sampleMessages);
      expect(response.choices[0].message).to.equal('It\'s sunny in Boston today!');
      expect(openAiClientStub.chat.completions.create).to.have.been.calledWith({
        model: sampleModel,
        messages: sampleMessages,
      });
    });
  
    it('handles API errors by throwing', async () => {
      openAiClientStub.chat.completions.create.rejects(new Error('API failure'));
      const sampleModel = 'gpt-3.5-turbo';
      const sampleMessages = [{ 'role': 'user', 'content': 'What\'s the weather like in Boston?' }];
  
      await expect(clientWrapperUnderTest.getChatCompletion(sampleModel, sampleMessages))
        .to.eventually.be.rejectedWith('Error response from OpenAI API: API failure');
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
