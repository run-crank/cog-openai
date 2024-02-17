import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import { expect } from 'chai';
import { default as sinon } from 'ts-sinon';
import 'mocha';
import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../../src/proto/cog_pb';
import { CompletionReadability as Step } from '../../../src/steps/completion/completion-readability';

describe('CompletionReadability', () => {
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
    // similar to the original 'Metadata' tests, but assertions adjusted for CompletionReadability
    it('should return expected step metadata', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      expect(stepDef.getStepId()).to.equal('CompletionReadability');
      expect(stepDef.getName()).to.equal('Check OpenAI GPT prompt response FRES reading ease evaluation');
      expect(stepDef.getExpression()).to.equal(`OpenAI model (?<model>[a-zA-Z0-9_ -.]+) school level of the response to "(?<prompt>[a-zA-Z0-9_ -'".,?!]+)" should (?<operator>be less than|be greater than|be one of|be|not be one of|not be) ?(?<schoollevel>.+)?`);
      expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
    });

    it('should return expected step fields', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
        return field.toObject();
      });
      expect(fields[0].key).to.equal('prompt');
      expect(fields[0].optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(fields[0].type).to.equal(FieldDefinition.Type.STRING);

      expect(fields[1].key).to.equal('model');
      expect(fields[1].optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(fields[1].type).to.equal(FieldDefinition.Type.STRING);

      expect(fields[2].key).to.equal('operator');
      expect(fields[2].optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
      expect(fields[2].type).to.equal(FieldDefinition.Type.STRING);

      expect(fields[3].key).to.equal('schoollevel');
      expect(fields[3].optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
      expect(fields[3].type).to.equal(FieldDefinition.Type.STRING);
    });
  });

  describe('ExecuteStep', () => {
    describe('GPT prompt response meets readability expectation', () => {
      beforeEach(() => {
        const expectedModel: string = 'gpt-model';
        const expectedPrompt: string = 'Hello, GPT!';
        protoStep.setData(Struct.fromJavaScript({
          model: expectedModel,
          prompt: expectedPrompt,
          schoollevel: 'Professional',
          operator: 'be greater than',
        }));

        clientWrapperStub.getChatCompletion.returns(Promise.resolve({
          choices: [{ message: { content: 'Some high readability text.' } }],
          usage: { completion_tokens: 263, prompt_tokens: 17, total_tokens: 280 },
          created: '1698287166',
        }));
      });

      it('should respond with pass', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
      });
    });

    describe('GPT prompt response does not meet readability expectation', () => {
      beforeEach(() => {
        const expectedModel: string = 'gpt-model';
        const expectedPrompt: string = 'Hello, GPT!';
        protoStep.setData(Struct.fromJavaScript({
          model: expectedModel,
          prompt: expectedPrompt,
          schoollevel: '5th grade',
          operator: 'be',
        }));

        clientWrapperStub.getChatCompletion.returns(Promise.resolve({
          choices: [{ message: { content: 'US politics refers to how our country is run and the different people who make decisions. We have a system called democracy, where citizens get to choose their leaders. The President is the highest leader and is elected by the people. They make important decisions about the country.' } }],
          usage: { completion_tokens: 263, prompt_tokens: 17, total_tokens: 280 },
          created: '1698287166',
        }));
      });

      it('should respond with fail', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
      });
    });

    describe('Error occurred while fetching GPT prompt response', () => {
      beforeEach(() => {
        // setup for the scenario where an error occurs during operation
        clientWrapperStub.getChatCompletion.throws('error');
      });

      it('should respond with error', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      });
    });
  });
});
