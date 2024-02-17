import { expect } from 'chai';
import { default as sinon } from 'ts-sinon';
import 'mocha';
import { Step as ProtoStep, StepDefinition, RunStepResponse } from '../../../src/proto/cog_pb';
import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import { CompletionEqualsAb as Step } from '../../../src/steps/completion/completion-equals-ab';

describe('CompletionEqualsAb', () => {
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    protoStep = new ProtoStep();
    clientWrapperStub = sinon.stub();
    clientWrapperStub.getChatCompletion = sinon.stub();
    stepUnderTest = new Step(clientWrapperStub);
  });

  describe('Metadata', () => {
    it('should return expected step metadata', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      // Here, you would change the expected values to match what CompletionEqualsAb's metadata should return
      expect(stepDef.getStepId()).to.equal('CompletionEqualsAb');
      expect(stepDef.getName()).to.equal('Compare OpenAI GPT model A and B prompt responses from completion');
      expect(stepDef.getExpression()).to.equal(`OpenAI model (?<modela>[a-zA-Z0-9_ -.]+) and (?<modelb>[a-zA-Z0-9_ -.]+) responses to "(?<prompt>[a-zA-Z0-9_ -'".,?!]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<expectation>.+)?`);
      expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
      // And other necessary metadata tests
    });

    // ... you might also want to validate the fields as in the sample test, updating for your new step's fields
  });

  describe('ExecuteStep', () => {
    describe('GPT models A and B prompt responses meet expectation', () => {
      beforeEach(() => {
        // Here, you would setup the step data and mock responses for both model A and model B
        // Ensure that both responses meet the expected conditions
        protoStep.setData(Struct.fromJavaScript({
          modela: 'gpt-model-a',
          modelb: 'gpt-model-b',
          prompt: 'Hello, GPT!',
          expectation: 'expected response',
          operator: 'be',
        }));

        // Mocking successful response for both model A and B
        clientWrapperStub.getChatCompletion.withArgs('gpt-model-a').returns(Promise.resolve({
          choices: [{ message: { content: 'expected response' } }],
        }));
        clientWrapperStub.getChatCompletion.withArgs('gpt-model-b').returns(Promise.resolve({
          choices: [{ message: { content: 'expected response' } }],
        }));
      });

      it('should respond with pass', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
      });
    });

    describe('GPT models A and B prompt responses do not meet expectation', () => {
      beforeEach(() => {
        // Setup for the scenario where responses from model A and B do not meet the expectation
        // You would set different 'unexpected' responses for each model here
        protoStep.setData(Struct.fromJavaScript({
          modela: 'gpt-model-a',
          modelb: 'gpt-model-b',
          prompt: 'Hello, GPT!',
          expectation: 'expected response',
          operator: 'be',
        }));

        clientWrapperStub.getChatCompletion.withArgs('gpt-model-a').returns(Promise.resolve({
          choices: [{ message: { content: 'unexpected response from A' } }],
        }));
        clientWrapperStub.getChatCompletion.withArgs('gpt-model-b').returns(Promise.resolve({
          choices: [{ message: { content: 'unexpected response from B' } }],
        }));
      });

      it('should respond with fail', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
      });
    });

    // Add more scenarios, such as handling errors during the fetch, incomplete data, etc.
  });
});
