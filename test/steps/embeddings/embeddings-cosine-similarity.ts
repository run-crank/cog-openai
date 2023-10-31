import { expect } from 'chai';
import { default as sinon } from 'ts-sinon';
import 'mocha';
import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import { Step as ProtoStep, RunStepResponse, StepDefinition, FieldDefinition } from '../../../src/proto/cog_pb';
import { EmbeddingsCosineSimilarity as Step } from '../../../src/steps/embeddings/embeddings-cosine-similarity';

describe('EmbeddingsCosineSimilarity', () => {
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    protoStep = new ProtoStep();
    clientWrapperStub = sinon.stub();
    clientWrapperStub.getEmbeddings = sinon.stub();
    stepUnderTest = new Step(clientWrapperStub);
  });

  describe('Metadata', () => {
    it('should return expected step metadata', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      expect(stepDef.getStepId()).to.equal('EmbeddingsCosineSimilarity');
      expect(stepDef.getName()).to.equal('Check OpenAI GPT cosine similarity of two texts based on embeddings');
      expect(stepDef.getExpression()).to.match(/OpenAI model .* cosine similarity of .* should .*/);
      expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
    });

    it('should return expected step fields', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
        return field.toObject();
      });

      expect(fields[0].key).to.equal('text1');
      expect(fields[0].optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(fields[0].type).to.equal(FieldDefinition.Type.STRING);

      expect(fields[1].key).to.equal('text2');
      expect(fields[1].optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(fields[1].type).to.equal(FieldDefinition.Type.STRING);

      expect(fields[2].key).to.equal('model');
      expect(fields[2].optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(fields[2].type).to.equal(FieldDefinition.Type.STRING);

      expect(fields[3].key).to.equal('operator');
      expect(fields[3].optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
      expect(fields[3].type).to.equal(FieldDefinition.Type.STRING);

      expect(fields[4].key).to.equal('cosinesimilarity');
      expect(fields[4].optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
      expect(fields[4].type).to.equal(FieldDefinition.Type.NUMERIC);
    });
  });

  describe('ExecuteStep', () => {
    // Mock scenarios for cosine similarity checks
    describe('Cosine similarity meets expectations', () => {
      beforeEach(() => {
        // Setup for the scenario where cosine similarity meets expectations
        protoStep.setData(Struct.fromJavaScript({
          text1: 'Sample text 1',
          text2: 'Sample text 2',
          model: 'gpt-model',
          operator: 'be greater than',
          cosinesimilarity: 0.8,
        }));

        clientWrapperStub.getEmbeddings.onFirstCall().returns(Promise.resolve({
          data: [{ embedding: [0.5, 0.5] }],
          usage: { total_tokens: 50 },
        }));

        clientWrapperStub.getEmbeddings.onSecondCall().returns(Promise.resolve({
          data: [{ embedding: [0.5, 0.5] }],
          usage: { total_tokens: 50 },
        }));
      });

      it('should respond with pass', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
      });
    });

    describe('Cosine similarity does not meet expectations', () => {
      beforeEach(() => {
        // Setup for the scenario where cosine similarity meets expectations
        protoStep.setData(Struct.fromJavaScript({
          text1: 'Abraka dabra',
          text2: 'Sample text 2',
          model: 'gpt-model',
          operator: 'be greater than',
          cosinesimilarity: 0.9,
        }));

        clientWrapperStub.getEmbeddings.onFirstCall().returns(Promise.resolve({
          data: [{ embedding: [-0.5, -0.5] }],
          usage: { total_tokens: 50 },
        }));

        clientWrapperStub.getEmbeddings.onSecondCall().returns(Promise.resolve({
          data: [{ embedding: [0.5, 0.5] }],
          usage: { total_tokens: 50 },
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
        clientWrapperStub.getEmbeddings.throws('error');
      });

      it('should respond with error', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      });
    });
  });
});
