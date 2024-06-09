import * as util from '@run-crank/utilities';
import {
  BaseStep, Field, StepInterface, ExpectedRecord,
} from '../../core/base-step';
import {
  Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord,
} from '../../proto/cog_pb';
import { baseOperators } from '../../client/constants/operators';
import * as vader from 'vader-sentiment';

export class CheckVaderSentiment extends BaseStep implements StepInterface {
  protected stepName: string = 'Check Vader sentiment of the input text';

  // tslint:disable-next-line:max-line-length quotemark
  protected stepExpression: string = `the Vader sentiment of the input text "(?<inputText>[a-zA-Z0-9_ -'".,?!]+)" should (?<operator>be|not be|be greater than|be less than) (?<expectedSentiment>.+)`;

  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;

  protected actionList: string[] = ['check'];

  protected targetObject: string = 'Sentiment Analysis';

  protected expectedFields: Field[] = [{
    field: 'inputText',
    type: FieldDefinition.Type.STRING,
    description: 'Input text to analyze sentiment',
  }, {
    field: 'operator',
    type: FieldDefinition.Type.STRING,
    optionality: FieldDefinition.Optionality.OPTIONAL,
    description: 'Check Logic (be, not be, be greater than, be less than)',
  }, {
    field: 'expectedSentiment',
    type: FieldDefinition.Type.NUMERIC,
    description: 'Expected Sentiment Score (compound score)',
    optionality: FieldDefinition.Optionality.OPTIONAL,
  }];

  protected expectedRecords: ExpectedRecord[] = [{
    id: 'sentiment',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'positive',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Positive sentiment score',
    }, {
      field: 'neutral',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Neutral sentiment score',
    }, {
      field: 'negative',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Negative sentiment score',
    }, {
      field: 'compound',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Compound sentiment score',
    }],
    dynamicFields: true,
  }];

  static analyzeSentiment(text: string) {
    return vader.SentimentIntensityAnalyzer.polarity_scores(text);
  }

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const inputText = stepData.inputText;
    const operator = stepData.operator || 'be';
    const expectedSentiment = stepData.expectedSentiment;

    try {
      const sentiment = CheckVaderSentiment.analyzeSentiment(inputText);
      const compoundScore = sentiment.compound;
      const result = this.assert(operator, compoundScore.toString(), expectedSentiment.toString(), 'sentiment');
      const returnObj = {
        positive: sentiment.pos,
        neutral: sentiment.neu,
        negative: sentiment.neg,
        compound: sentiment.compound,
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
    records.push(this.keyValue('sentiment', 'Checked Vader Sentiment', sentiment));
    // Ordered Record
    records.push(this.keyValue(`sentiment.${stepOrder}`, `Checked Vader Sentiment from Step ${stepOrder}`, sentiment));
    return records;
  }
}

export { CheckVaderSentiment as Step };
