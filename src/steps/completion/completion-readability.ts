/* tslint:disable:no-else-after-return */
// FRES Flesch reading-ease score
import * as util from '@run-crank/utilities';
import {
  BaseStep, Field, StepInterface, ExpectedRecord,
} from '../../core/base-step';
import {
  Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord,
} from '../../proto/cog_pb';
import { baseOperators } from '../../client/constants/operators';

export class CompletionReadability extends BaseStep implements StepInterface {
  protected stepName: string = 'Check OpenAI GPT prompt response FRES reading ease evaluation';

  // tslint:disable-next-line:max-line-length quotemark
  protected stepExpression: string = `OpenAI model (?<model>[a-zA-Z0-9_ -.]+) school level of the response to "(?<prompt>[a-zA-Z0-9_ -'".,?!]+)" should (?<operator>be less than|be greater than|be one of|be|not be one of|not be) ?(?<schoollevel>.+)?`;

  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;

  protected actionList: string[] = ['check'];

  protected targetObject: string = 'completion';

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
    description: 'Check Logic (be less than|be greater than|be one of|be|not be one of|not be)',
  },
  {
    field: 'schoollevel',
    type: FieldDefinition.Type.STRING,
    description: 'Expected School Level (5th grade, 6th grade, 7th grade, 8th & 9th grade, 10th to 12th grade, College, College Graduate, Professional)',
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
      field: 'response',
      type: FieldDefinition.Type.STRING,
      description: 'Completion Model Response',
    }, {
      field: 'score',
      type: FieldDefinition.Type.STRING,
      description: 'Completion Score',
    }, {
      field: 'schoollevel',
      type: FieldDefinition.Type.STRING,
      description: 'Completion Flesch–Kincaid grade level',
    }, {
      field: 'notes',
      type: FieldDefinition.Type.STRING,
      description: 'Completion Score Notes',
    }, {
      field: 'usage',
      type: FieldDefinition.Type.STRING,
      description: 'Completion Usage',
    }, {
      field: 'created',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Completion Create Date',
    }],
    dynamicFields: true,
  }];

  static fleschScoreToSchoolLevel(score) {
    if (score >= 90) {
      return { score, schoollevel: '5th grade', notes: 'Very easy to read. Easily understood by an average 11-year-old student.' };
    } else if (score >= 80) {
      return { score, schoollevel: '6th grade', notes: 'Easy to read. Conversational English for consumers.' };
    } else if (score >= 70) {
      return { score, schoollevel: '7th grade', notes: 'Fairly easy to read.' };
    } else if (score >= 60) {
      return { score, schoollevel: '8th & 9th grade', notes: 'Plain English. Easily understood by 13- to 15-year-old students.' };
    } else if (score >= 50) {
      return { score, schoollevel: '10th to 12th grade', notes: 'Fairly difficult to read.' };
    } else if (score >= 30) {
      return { score, schoollevel: 'College', notes: 'Difficult to read.' };
    } else if (score >= 10) {
      return { score, schoollevel: 'College Graduate', notes: 'Very difficult to read. Best understood by university graduates.' };
    } else {
      return { score, schoollevel: 'Professional', notes: 'Extremely difficult to read. Best understood by university graduates.' };
    }
  }

  static fleschSchoolLevelToScore(schoollevel) {
    switch (schoollevel) {
      case '5th grade':
        return 90;
      case '6th grade':
        return 80;
      case '7th grade':
        return 70;
      case '8th & 9th grade':
        return 60;
      case '10th to 12th grade':
        return 50;
      case 'College':
        return 30;
      case 'College Graduate':
        return 10;
      default:
        return 0;
    }
  }

  static getFleschReadingEaseScore(text: String) {
    const sentences = text.split(/[.|!|?]+/);
    const words = text.split(' ');
    const syllables = text.split(/[aeiouy]+/).length - 1;
    const score = 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);
    return score;
  }

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const expectedSchoolLevel = stepData.schoollevel;
    const { prompt } = stepData;
    const { model } = stepData;
    const operator = stepData.operator || 'be';

    try {
      const messages = [];
      const message = {};
      message['role'] = 'user';
      message['content'] = prompt;
      messages.push(message);
      const completion = await this.client.getChatCompletion(model, messages);
      const response = completion.choices[0].message.content;
      const fleschReadingEaseScore = CompletionReadability.getFleschReadingEaseScore(response);
      const fleschReadingEaseScoreObj = CompletionReadability.fleschScoreToSchoolLevel(fleschReadingEaseScore);
      const expectedScore = CompletionReadability.fleschSchoolLevelToScore(expectedSchoolLevel);
      const actualScore = fleschReadingEaseScoreObj.score;
      const result = this.assert(operator, actualScore.toString(), expectedScore.toString(), 'response');

      const returnObj = {
        model,
        prompt,
        response,
        score: fleschReadingEaseScore,
        schoollevel: fleschReadingEaseScoreObj.schoollevel,
        notes: fleschReadingEaseScoreObj.notes,
        usage: completion.usage,
        created: completion.created,
        request: completion.request_payload,
      };
      const records = this.createRecords(returnObj, stepData.__stepOrder);

      return result.valid ? this.pass(result.message, [], records) : this.fail(result.message, [], records);
    } catch (e) {
      if (e instanceof util.UnknownOperatorError) {
        return this.error('%s Please provide one of: %s', [e.message, baseOperators.join(', ')]);
      }
      if (e instanceof util.InvalidOperandError) {
        return this.error('There was an error checking GTP chat completion object: %s', [e.message]);
      }

      return this.error('There was an error calculating Flesch reading ease : %s', [e.toString()]);
    }
  }

  public createRecords(completion, stepOrder = 1): StepRecord[] {
    const records = [];
    // Base Record
    records.push(this.keyValue('completion', 'Checked Flesch Score', completion));
    // Ordered Record
    records.push(this.keyValue(`completion.${stepOrder}`, `Checked Flesch Score from Step ${stepOrder}`, completion));
    return records;
  }
}

export { CompletionReadability as Step };
