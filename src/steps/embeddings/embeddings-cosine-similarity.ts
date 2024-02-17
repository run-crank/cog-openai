/* tslint:disable:no-else-after-return */

import * as util from '@run-crank/utilities';
import {
  BaseStep, Field, StepInterface, ExpectedRecord,
} from '../../core/base-step';
import {
  Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord,
} from '../../proto/cog_pb';
import { baseOperators } from '../../client/constants/operators';

const similarity = require('compute-cosine-similarity');

export class EmbeddingsCosineSimilarity extends BaseStep implements StepInterface {
  protected stepName: string = 'Check OpenAI GPT cosine similarity of two texts based on embeddings';

  // tslint:disable-next-line:max-line-length quotemark
  protected stepExpression: string = `OpenAI model (?<model>[a-zA-Z0-9_ -.]+) cosine similarity of "(?<text1>[a-zA-Z0-9_ -.]+)" and "(?<text2>[a-zA-Z0-9_ -.]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<semanticsimilarity>.+)?`;

  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;

  protected actionList: string[] = ['check'];

  protected targetObject: string = 'Completion';

  protected expectedFields: Field[] = [{
    field: 'text1',
    type: FieldDefinition.Type.STRING,
    description: 'First text to compare',
  }, {
    field: 'text2',
    type: FieldDefinition.Type.STRING,
    description: 'Second text to compare',
  }, {
    field: 'model',
    type: FieldDefinition.Type.STRING,
    description: 'GPT Model to use for completion',
  }, {
    field: 'operator',
    type: FieldDefinition.Type.STRING,
    optionality: FieldDefinition.Optionality.OPTIONAL,
    description: 'Check Logic (be, not be, contain, not contain, be greater than, be less than, be set, not be set, be one of, or not be one of)',
  }, {
    field: 'cosinesimilarity',
    type: FieldDefinition.Type.NUMERIC,
    description: 'Cosine Similarity Score',
    optionality: FieldDefinition.Optionality.OPTIONAL,
  }];

  protected expectedRecords: ExpectedRecord[] = [{
    id: 'completion',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'model',
      type: FieldDefinition.Type.STRING,
      description: 'Completion Model',
    }, {
      field: 'text1embeddings',
      type: FieldDefinition.Type.ANYNONSCALAR,
      description: 'Text 1 Embeddings',
    }, {
      field: 'text2embeddings',
      type: FieldDefinition.Type.ANYNONSCALAR,
      description: 'Text 2 Embeddings',
    }, {
      field: 'cosineSimilarity',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Cosine Similarity Score',
    }, {
      field: 'text1Usage',
      type: FieldDefinition.Type.ANYNONSCALAR,
      description: 'Text 1 API Token Usage',
    }, {
      field: 'text2Usage',
      type: FieldDefinition.Type.ANYNONSCALAR,
      description: 'Text 2 API Token Usage',
    }],
    dynamicFields: true,
  }];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const { text1 } = stepData;
    const { text2 } = stepData;
    const model = stepData.model || 'text-embedding-ada-002';
    const expectedSimilarity = stepData.cosinesimilarity;
    const operator = stepData.operator || 'be';

    try {
      const text1EmbeddingsResult = await this.client.getEmbeddings(model, text1);
      const text2EmbeddingsResult = await this.client.getEmbeddings(model, text2);
      const cosineSimilarity = similarity(text1EmbeddingsResult.data[0].embedding, text2EmbeddingsResult.data[0].embedding);
      const result = this.assert(operator, cosineSimilarity.toString(), expectedSimilarity.toString(), 'response');
      const returnObj = {
        model,
        cosineSimilarity,
        text1Embeddings: text1EmbeddingsResult.data[0].embedding,
        text2Embeddings: text2EmbeddingsResult.data[0].embedding,
        text1Usage: text1EmbeddingsResult.usage,
        text2Usage: text2EmbeddingsResult.usage,
      };
      const records = this.createRecords(returnObj, stepData.__stepOrder);
      return result.valid ? this.pass(result.message, [], records) : this.fail(result.message, [], records);
    } catch (e) {
      if (e instanceof util.UnknownOperatorError) {
        return this.error('%s Please provide one of: %s', [e.message, baseOperators.join(', ')]);
      }
      if (e instanceof util.InvalidOperandError) {
        return this.error('There was an error checking embeddings: %s', [e.message]);
      }

      return this.error('There was an error checking embeddings: %s', [e.toString()]);
    }
  }

  public createRecords(completion, stepOrder = 1): StepRecord[] {
    const records = [];
    // Base Record
    records.push(this.keyValue('completion', 'Checked Cosine Similarity', completion));
    // Ordered Record
    records.push(this.keyValue(`completion.${stepOrder}`, `Checked Cosine Similarity from Step ${stepOrder}`, completion));
    return records;
  }
}

export { EmbeddingsCosineSimilarity as Step };
