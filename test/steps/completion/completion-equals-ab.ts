import { expect } from 'chai';
import { default as sinon } from 'ts-sinon';
import 'mocha';
import { Step as ProtoStep, StepDefinition, RunStepResponse } from '../../../src/proto/cog_pb';
import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import { CompletionEqualsAb as Step } from '../../../src/steps/completion/completion-equals-ab';

describe('CompletionEqualsAb', () => {
  let protoStep;
  let stepUnderTest;
  let clientWrapperStub;

  beforeEach(() => {
    protoStep = new ProtoStep();
    clientWrapperStub = {
      getChatCompletion: sinon.stub()
    };
    stepUnderTest = new Step(clientWrapperStub);
  });

  describe('Metadata', () => {
    it('should return expected step metadata', () => {
      const stepDef = stepUnderTest.getDefinition();
      expect(stepDef.getStepId()).to.equal('CompletionEqualsAb');
      expect(stepDef.getName()).to.equal('Compare OpenAI GPT model A and B prompt responses from completion');
      expect(stepDef.getExpression()).to.equal(`OpenAI model (?<modela>[a-zA-Z0-9_ -.]+) and (?<modelb>[a-zA-Z0-9_ -.]+) responses to "(?<prompt>[a-zA-Z0-9_ -'".,?!]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<expectation>.+)?`);
      expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
    });
  });

  describe('ExecuteStep', () => {
    beforeEach(() => {
      protoStep.setData(Struct.fromJavaScript({
        modela: 'gpt-model-a',
        modelb: 'gpt-model-b',
        prompt: 'Hello, GPT!',
        expectation: 'expected response',
        operator: 'be',
      }));
    });

    it('GPT models A and B prompt responses meet expectation', async () => {
      clientWrapperStub.getChatCompletion.onCall(0).resolves({
        text_response: 'expected response',
        request_payload: { prompt: 'Hello, GPT!' }
      });
      clientWrapperStub.getChatCompletion.onCall(1).resolves({
        text_response: 'expected response',
        request_payload: { prompt: 'Hello, GPT!' }
      });

      const response = await stepUnderTest.executeStep(protoStep);
      expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    });

    it('GPT models A and B prompt responses do not meet expectation', async () => {
      clientWrapperStub.getChatCompletion.onCall(0).resolves({
        text_response: 'unexpected response from A',
        request_payload: { prompt: 'Hello, GPT!' }
      });
      clientWrapperStub.getChatCompletion.onCall(1).resolves({
        text_response: 'unexpected response from B',
        request_payload: { prompt: 'Hello, GPT!' }
      });

      const response = await stepUnderTest.executeStep(protoStep);
      expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
    });

    it('handles API errors correctly', async () => {
      clientWrapperStub.getChatCompletion.rejects(new Error('API failure'));
      const response = await stepUnderTest.executeStep(protoStep);
      expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    });
  });
});
