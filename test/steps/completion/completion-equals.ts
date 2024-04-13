import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import { expect } from 'chai';
import { default as sinon } from 'ts-sinon';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../../src/proto/cog_pb';
import { CompletionEquals as Step } from '../../../src/steps/completion/completion-equals';

describe('CompletionEquals', () => {
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
      expect(stepDef.getStepId()).to.equal('CompletionEquals');
      expect(stepDef.getName()).to.equal('Check OpenAI GPT prompt response from completion');
      expect(stepDef.getExpression()).to.equal(`OpenAI model (?<model>[a-zA-Z0-9_ -.]+) response to "(?<prompt>[a-zA-Z0-9_ -'".,?!]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<expectation>.+)?`);
      expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
    });
  });

  describe('ExecuteStep', () => {
    beforeEach(() => {
      protoStep.setData(Struct.fromJavaScript({
        model: 'gpt-model',
        prompt: 'Hello, GPT!',
        expectation: 'expected response',
        operator: 'be'
      }));
    });

    it('GPT prompt response meets expectation', async () => {
      clientWrapperStub.getChatCompletion.resolves({
        text_response: 'expected response',
      });

      const response = await stepUnderTest.executeStep(protoStep);
      expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    });

    it('GPT prompt response does not meet expectation', async () => {
      clientWrapperStub.getChatCompletion.resolves({
        text_response: 'unexpected response',
      });

      const response = await stepUnderTest.executeStep(protoStep);
      expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
    });

    it('Error occurred while fetching GPT prompt response', async () => {
      clientWrapperStub.getChatCompletion.rejects(new Error('API failure'));
      const response = await stepUnderTest.executeStep(protoStep);
      expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    });
  });
});
