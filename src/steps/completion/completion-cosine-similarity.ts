/*tslint:disable:no-else-after-return*/

import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../../proto/cog_pb';
import * as util from '@run-crank/utilities';
import { baseOperators } from '../../client/constants/operators';
const similarity = require('compute-cosine-similarity');

export class CompletionCosineSimilarity extends BaseStep implements StepInterface {

  protected stepName: string = 'Check OpenAI GPT cosine similarity of response and provided text embeddings from completion';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'OpenAI model (?<model>[a-zA-Z0-9_-]+) response to (?<prompt>[a-zA-Z0-9_-]+) cosine similarity to (?<comparetext>[a-zA-Z0-9_-]+) should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<semanticsimilarity>.+)?';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected actionList: string[] = ['check'];
  protected targetObject: string = 'Completion';
  protected expectedFields: Field[] = [{
    field: 'prompt',
    type: FieldDefinition.Type.STRING,
    description: 'User Prompt to send to GPT',
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
  }, {
    field: 'comparetext',
    type: FieldDefinition.Type.STRING,
    description: 'Expected text to compare to GPT response',
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
      field: 'prompt',
      type: FieldDefinition.Type.STRING,
      description: 'Completion Prompt',
    }, {
      field: 'compareText',
      type: FieldDefinition.Type.STRING,
      description: 'Expected text to compare to GPT response',
      optionality: FieldDefinition.Optionality.OPTIONAL,
    }, {
      field: 'cosineSimilarity',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Cosine Similarity Score',
    }, {
      field: 'promptUsage',
      type: FieldDefinition.Type.ANYNONSCALAR,
      description: 'Prompt API Token Usage',
    }, {
      field: 'compareTextUsage',
      type: FieldDefinition.Type.ANYNONSCALAR,
      description: 'Comparison Text API Token Usage',
    }],
    dynamicFields: true,
  }];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const compareText = stepData.comparetext;
    const prompt = stepData.prompt;
    const model = stepData.model || 'text-embedding-ada-002';
    const expectedSimilarity = stepData.cosinesimilarity;
    const operator = stepData.operator || 'be';

    try {
      const messages = [];
      const message = {};
      message['role'] = 'user';
      message['content'] = prompt;
      messages.push(message);
      const promptEmbeddingsResult = await this.client.getEmbeddings(model, prompt);
      const compareEmbeddingsResult = await this.client.getEmbeddings(model, compareText);
      const cosineSimilarity = similarity(promptEmbeddingsResult.data.embedding, compareEmbeddingsResult.data.embedding);
      const result = this.assert(operator, cosineSimilarity.toString(), expectedSimilarity.toString(), 'response');
      const returnObj = {
        model,
        prompt,
        compareText,
        cosineSimilarity,
        promptUsage: promptEmbeddingsResult.usage,
        compareTextUsage: compareEmbeddingsResult.usage,
      };
      const records = this.createRecords(returnObj, stepData['__stepOrder']);
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

export { CompletionCosineSimilarity as Step };
