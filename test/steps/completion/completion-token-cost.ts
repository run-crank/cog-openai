import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import { expect } from 'chai';
import { default as sinon } from 'ts-sinon';
import 'mocha';
import { Step as ProtoStep, RunStepResponse, StepDefinition, FieldDefinition } from '../../../src/proto/cog_pb';
import { CompletionTokenCost as Step} from './../../../src/steps/completion/completion-token-cost';

describe('CompletionTokenCost', () => {
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
      expect(stepDef.getStepId()).to.equal('CompletionTokenCost');
      expect(stepDef.getName()).to.equal('Check OpenAI GPT prompt token cost given a prompt and model');
      expect(stepDef.getExpression()).to.equal('OpenAI model (?<model>[a-zA-Z0-9_-]+) ?(?<type>.+)? token cost in response to "(?<prompt>[a-zA-Z0-9_ -]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<expectation>.+)? tokens');
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

      expect(fields[2].key).to.equal('type');
      expect(fields[2].optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
      expect(fields[2].type).to.equal(FieldDefinition.Type.STRING);

      expect(fields[3].key).to.equal('operator');
      expect(fields[3].optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
      expect(fields[3].type).to.equal(FieldDefinition.Type.STRING);

      expect(fields[4].key).to.equal('expectation');
      expect(fields[4].optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
      expect(fields[4].type).to.equal(FieldDefinition.Type.NUMERIC);
    });
  });

  describe('ExecuteStep', () => {
    describe('GPT prompt response meets token cost expectation', () => {
      beforeEach(() => {
        // Setup for the scenario where the GPT response meets the expected token cost
        const expectedModel: string = 'gpt-model';
        const expectedPrompt: string = 'What is 1 + 1?';
        protoStep.setData(Struct.fromJavaScript({
          model: expectedModel,
          prompt: expectedPrompt,
          type: 'completion',
          operator: 'be',
          expectation: 1
        }));

        clientWrapperStub.getChatCompletion.returns(Promise.resolve({
          choices: [{ message: { content: 'two' } }],
          usage: { completion_tokens: 1, prompt_tokens: 6, total_tokens: 7 },
          created: '1698287166',
        }));
      });

      it('should respond with pass', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
      });
    });

    describe('GPT prompt response does not meet token cost expectation', () => {
      beforeEach(() => {
        // Setup for the scenario where the GPT response does not meet the expected token cost
        const expectedModel: string = 'gpt-model';
        const expectedPrompt: string = 'Give me a five word response';
        protoStep.setData(Struct.fromJavaScript({
          model: expectedModel,
          prompt: expectedPrompt,
          type: 'completion',
          operator: 'be less than',
          expectation: 5
        }));

        clientWrapperStub.getChatCompletion.returns(Promise.resolve({
          choices: [{ message: { content: 'this is five word response' } }],
          usage: { completion_tokens: 5, prompt_tokens: 6, total_tokens: 11 },
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
