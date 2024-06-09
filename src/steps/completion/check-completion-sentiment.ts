import * as util from '@run-crank/utilities';
import {
  BaseStep, Field, StepInterface, ExpectedRecord,
} from '../../core/base-step';
import {
  Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord,
} from '../../proto/cog_pb';
import { baseOperators } from '../../client/constants/operators';

export class CheckCompletionSentiment extends BaseStep implements StepInterface {
  protected stepName: string = 'Check sentiment of completion output';

  // tslint:disable-next-line:max-line-length quotemark
  protected stepExpression: string = `the sentiment of the completion output for input text "(?<inputText>[a-zA-Z0-9_ -'".,?!]+)" should (?<operator>be|not be|be greater than|be less than) (?<expectedSentiment>.+)`;

  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;

  protected actionList: string[] = ['check'];

  protected targetObject: string = 'Sentiment Analysis';

  protected expectedFields: Field[] = [{
    field: 'inputText',
    type: FieldDefinition.Type.STRING,
    description: 'Input text to analyze sentiment',
  }, {
    field: 'model',
    type: FieldDefinition.Type.STRING,
    description: 'GPT Model to use for completion',
  }, {
    field: 'operator',
    type: FieldDefinition.Type.STRING,
    optionality: FieldDefinition.Optionality.OPTIONAL,
    description: 'Check Logic (be, not be, be greater than, be less than)',
  }, {
    field: 'expectedSentiment',
    type: FieldDefinition.Type.NUMERIC,
    description: 'Expected Sentiment Score (range of -1 to 1)',
    optionality: FieldDefinition.Optionality.OPTIONAL,
  }];

  protected expectedRecords: ExpectedRecord[] = [{
    id: 'completionSentiment',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'inputText',
      type: FieldDefinition.Type.STRING,
      description: 'Input text analyzed',
    }, {
      field: 'model',
      type: FieldDefinition.Type.STRING,
      description: 'GPT Model used',
    }, {
      field: 'completion',
      type: FieldDefinition.Type.STRING,
      description: 'Completion output',
    }, {
      field: 'sentimentScore',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Sentiment score of the completion output',
    }],
    dynamicFields: true,
  }];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const inputText = stepData.inputText;
    const model = stepData.model;
    const operator = stepData.operator || 'be';
    const expectedSentiment = stepData.expectedSentiment;

    try {
      const prompt = `Provide only a score of the sentiment of the following text on a range of -1 to 1, with 1 being most positive and -1 being most negative, without any introductory or concluding remarks:\n\n${inputText}`;
      const messages = [{ role: 'user', content: prompt }];
      const completion = await this.client.getChatCompletion(model, messages);
      const sentimentScore = parseFloat(completion.text_response.trim());
      const result = this.assert(operator, sentimentScore.toString(), expectedSentiment.toString(), 'sentiment');
      const returnObj = {
        inputText,
        model,
        completion: completion.text_response,
        sentimentScore,
      };
      const records = this.createRecords(returnObj, stepData.__stepOrder);
      return result.valid ? this.pass(result.message, [], records) : this.fail(result.message, [], records);
    } catch (e) {
      if (e instanceof util.UnknownOperatorError) {
        return this.error('%s Please provide one of: %s', [e.message, baseOperators.join(', ')]);
      }
      if (e instanceof util.InvalidOperandError) {
        return this.error('There was an error checking the sentiment: %s', [e.message]);
      }

      return this.error('There was an error checking the sentiment: %s', [e.toString()]);
    }
  }

  public createRecords(sentiment, stepOrder = 1): StepRecord[] {
    const records = [];
    // Base Record
    records.push(this.keyValue('completionSentiment', 'Checked Completion Sentiment', sentiment));
    // Ordered Record
    records.push(this.keyValue(`completionSentiment.${stepOrder}`, `Checked Completion Sentiment from Step ${stepOrder}`, sentiment));
    return records;
  }
}

export { CheckCompletionSentiment as Step };
