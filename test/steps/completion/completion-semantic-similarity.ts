import { expect } from 'chai';
import { default as sinon } from 'ts-sinon';
import 'mocha';
import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import { Step as ProtoStep, RunStepResponse, StepDefinition, FieldDefinition } from '../../../src/proto/cog_pb';
import { CompletionSemanticSimilarity as Step } from '../../../src/steps/completion/completion-semantic-similarity';

describe('CompletionSemanticSimilarity', () => {
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
      expect(stepDef.getStepId()).to.equal('CompletionSemanticSimilarity');
      expect(stepDef.getName()).to.equal('Check OpenAI GPT semantic similarity of response to provided text from completion');
      expect(stepDef.getExpression()).to.equal(`OpenAI model (?<model>[a-zA-Z0-9_ -.]+) response to "(?<prompt>[a-zA-Z0-9_ -'".,?!]+)" semantically compared with "(?<comparetext>[a-zA-Z0-9_ -'".,?!]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<semanticsimilarity>.+)?`);
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

      expect(fields[3].key).to.equal('semanticsimilarity');
      expect(fields[3].optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
      expect(fields[3].type).to.equal(FieldDefinition.Type.NUMERIC);

      expect(fields[4].key).to.equal('comparetext');
      expect(fields[4].optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
      expect(fields[4].type).to.equal(FieldDefinition.Type.STRING);
    });
  });

  describe('ExecuteStep', () => {
    describe('GPT response meets expected semantic similarity', () => {
      beforeEach(() => {
        // Setup for the scenario where the GPT response is semantically similar to the expected text
        const expectedModel: string = 'gpt-model';
        const expectedPrompt: string = 'Hello, GPT!';
        const compareText: string = 'Hello, Human!';
        protoStep.setData(Struct.fromJavaScript({
          model: expectedModel,
          prompt: expectedPrompt,
          comparetext: compareText,
          semanticsimilarity: 0.9, // or some mock number indicating high similarity
          operator: 'be greater than',
        }));

        clientWrapperStub.getChatCompletion.returns(Promise.resolve({
          choices: [{ message: { content: 'Hello, human!' } }], // Mock response with high semantic similarity
          usage: { completion_tokens: 263, prompt_tokens: 17, total_tokens: 280 },
          created: '1698287166',
        }));
      });

      it('should respond with pass', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
      });
    });

    describe('GPT response does not meet expected semantic similarity', () => {
      beforeEach(() => {
        // Setup for the scenario where the GPT response is not semantically similar to the expected text
        const expectedModel: string = 'gpt-model';
        const expectedPrompt: string = 'Hello, GPT!';
        const compareText: string = 'Goodbye, GPT!';
        protoStep.setData(Struct.fromJavaScript({
          model: expectedModel,
          prompt: expectedPrompt,
          comparetext: compareText,
          semanticsimilarity: 0.9, // or some mock number indicating high similarity
          operator: 'be greater than',
        }));

        clientWrapperStub.getChatCompletion.returns(Promise.resolve({
          choices: [{ message: { content: 'Welcome, human!' } }], // Mock response with low semantic similarity
          usage: { completion_tokens: 263, prompt_tokens: 17, total_tokens: 280 },
          created: '1698287166',
        }));
      });

      it('should respond with fail', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
      });
    });

    describe('Error occurred while fetching GPT response', () => {
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
