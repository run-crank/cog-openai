/* tslint:disable:no-else-after-return */

import * as util from '@run-crank/utilities';
import * as _ from 'lodash';
import {
  BaseStep, Field, StepInterface, ExpectedRecord,
} from '../../core/base-step';
import {
  Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord,
} from '../../proto/cog_pb';
import { baseOperators } from '../../client/constants/operators';

export class CompletionEqualsAb extends BaseStep implements StepInterface {
  protected stepName: string = 'Compare OpenAI GPT model A and B prompt responses from completion';

  // tslint:disable-next-line:max-line-length quotemark
  protected stepExpression: string = `OpenAI model (?<modela>[a-zA-Z0-9_ -.]+) and (?<modelb>[a-zA-Z0-9_ -.]+) responses to "(?<prompt>[a-zA-Z0-9_ -'".,?!]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<expectation>.+)?`;

  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;

  protected actionList: string[] = ['check'];

  protected targetObject: string = 'CompletionAB';

  protected expectedFields: Field[] = [{
    field: 'prompt',
    type: FieldDefinition.Type.STRING,
    description: 'User Prompt to send to GPT',
  }, {
    field: 'modela',
    type: FieldDefinition.Type.STRING,
    description: 'GPT Model A to use for completion',
  }, {
    field: 'modelb',
    type: FieldDefinition.Type.STRING,
    description: 'GPT Model B to use for completion',
  }, {
    field: 'operator',
    type: FieldDefinition.Type.STRING,
    optionality: FieldDefinition.Optionality.OPTIONAL,
    description: 'Check Logic (be, not be, contain, not contain, be greater than, be less than, be set, not be set, be one of, or not be one of)',
  },
  {
    field: 'expectation',
    type: FieldDefinition.Type.STRING,
    description: 'Expected GPT response value',
    optionality: FieldDefinition.Optionality.OPTIONAL,
  }];

  protected expectedRecords: ExpectedRecord[] = [{
    id: 'passedModels',
    type: RecordDefinition.Type.TABLE,
    fields: [{
      field: 'model',
      type: FieldDefinition.Type.STRING,
      description: 'Model Name',
    }, {
      field: 'response',
      type: FieldDefinition.Type.STRING,
      description: 'Response from model',
    }],
  }, {
    id: 'failedModels',
    type: RecordDefinition.Type.TABLE,
    fields: [{
      field: 'model',
      type: FieldDefinition.Type.STRING,
      description: 'Model Name',
    }, {
      field: 'response',
      type: FieldDefinition.Type.STRING,
      description: 'Response from model',
    }],
    dynamicFields: false,
  }];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const { expectation } = stepData;
    const { prompt } = stepData;
    const { modela } = stepData;
    const { modelb } = stepData;
    const operator = stepData.operator || 'be';

    try {
      const messages = [];
      const message = {};
      message['role'] = 'user';
      message['content'] = prompt;
      messages.push(message);
      const completiona = _.cloneDeep(await this.client.getChatCompletion(modela, messages));
      const actuala = completiona.choices[0].message.content;
      const resulta = this.assert(operator, actuala, expectation, 'responsea');
      const completionb = _.cloneDeep(await this.client.getChatCompletion(modelb, messages));
      const actualb = completionb.choices[0].message.content;
      const resultb = this.assert(operator, actualb, expectation, 'responseb');
      const result = resulta.valid && resultb.valid;

      const passedModels = [];
      const failedModels = [];

      if (resulta.valid) {
        passedModels.push({ model: modela, response: actuala, request: completiona.request_payload });
      } else {
        failedModels.push({ model: modela, response: actuala, request: completiona.request_payload });
      }

      if (resultb.valid) {
        passedModels.push({ model: modelb, response: actualb, request: completionb.request_payload });
      } else {
        failedModels.push({ model: modelb, response: actualb, request: completionb.request_payload });
      }

      const records = [];
      records.push(this.createTable('passedModels', `Models Passed Prompt '${prompt}'`, passedModels));
      records.push(this.createTable('failedModels', `Models Failed Prompt '${prompt}'`, failedModels));

      return result ? this.pass('%d model passed the test', [passedModels.length], records)
        : this.fail('%d models failed the test and %d models passed the test', [failedModels.length, passedModels.length], records);
    } catch (e) {
      if (e instanceof util.UnknownOperatorError) {
        return this.error('%s Please provide one of: %s', [e.message, baseOperators.join(', ')]);
      }
      if (e instanceof util.InvalidOperandError) {
        return this.error('There was an error checking GTP chat completion object: %s', [e.message]);
      }

      return this.error('There was an error checking  GTP chat completion object: %s', [e.toString()]);
    }
  }

  private createTable(id, name, contacts) {
    const headers = {};
    const headerKeys = Object.keys(contacts[0] || {});
    headerKeys.forEach((key: string) => {
      headers[key] = key;
    });
    return this.table(id, name, headers, contacts);
  }

  public createRecords(completion, stepOrder = 1): StepRecord[] {
    const records = [];
    // Base Record
    records.push(this.keyValue('completion', 'Checked Chat Completion', completion));
    // Ordered Record
    records.push(this.keyValue(`completion.${stepOrder}`, `Checked Chat Completion from Step ${stepOrder}`, completion));
    return records;
  }
}

export { CompletionEqualsAb as Step };
