/* tslint:disable:no-else-after-return */

import * as util from '@run-crank/utilities';
import {
  BaseStep, Field, StepInterface, ExpectedRecord,
} from '../../core/base-step';
import {
  Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord,
} from '../../proto/cog_pb';
import { baseOperators } from '../../client/constants/operators';

export class CompletionResponseTime extends BaseStep implements StepInterface {
  protected stepName: string = 'Check OpenAI GPT prompt response response time from request to completion in milliseconds';

  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'OpenAI model (?<model>[a-zA-Z0-9_-]+) response time in response to "(?<prompt>[a-zA-Z0-9_ -]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<expectation>.+)? ms';

  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;

  protected actionList: string[] = ['check'];

  protected targetObject: string = 'Completion';

  protected expectedFields: Field[] = [
    {
      field: 'prompt',
      type: FieldDefinition.Type.STRING,
      description: 'User Prompt to send to GPT',
    },
    {
      field: 'model',
      type: FieldDefinition.Type.STRING,
      description: 'GPT Model to use for completion',
    },
    {
      field: 'operator',
      type: FieldDefinition.Type.STRING,
      optionality: FieldDefinition.Optionality.OPTIONAL,
      description: 'Check Logic (be, not be, be greater than, be less than, be set, not be set, be one of, or not be one of)',
    },
    {
      field: 'expectation',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Expected GPT response time in ms',
      optionality: FieldDefinition.Optionality.OPTIONAL,
    },
  ];

  protected expectedRecords: ExpectedRecord[] = [
    {
      id: 'completion',
      type: RecordDefinition.Type.KEYVALUE,
      fields: [
        {
          field: 'model',
          type: FieldDefinition.Type.STRING,
          description: 'Completion Model',
        },
        {
          field: 'prompt',
          type: FieldDefinition.Type.STRING,
          description: 'Completion Prompt',
        },
        {
          field: 'response',
          type: FieldDefinition.Type.STRING,
          description: 'Completion Model Response',
        },
        {
          field: 'response time',
          type: FieldDefinition.Type.NUMERIC,
          description: 'Completion Response Time in ms',
        },
        {
          field: 'usage',
          type: FieldDefinition.Type.STRING,
          description: 'Completion Usage',
        },
        {
          field: 'created',
          type: FieldDefinition.Type.NUMERIC,
          description: 'Completion Create Date',
        },
      ],
      dynamicFields: true,
    },
  ];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const { expectation } = stepData;
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
      const responseTime = completion.response_time;
      const response = completion.choices[0].message.content;
      const result = this.assert(operator, responseTime.toString(), expectation.toString(), 'response');
      const returnObj = {
        model,
        prompt,
        response,
        responsetime: responseTime,
        usage: completion.usage,
        created: completion.created,
        request: completion.request_payload,
      };
      const records = this.createRecords(returnObj, stepData.__stepOrder);
      return result.valid ? this.pass(result.message, [], records) : this.fail(result.message, [], records);
    } catch (e) {
      if (e instanceof util.UnknownOperatorError) {
        return this.error('%s Please provide one of: %s', [
          e.message,
          baseOperators.join(', '),
        ]);
      }
      if (e instanceof util.InvalidOperandError) {
        return this.error(
          'There was an error checking GTP chat completion object: %s',
          [e.message],
        );
      }

      return this.error(
        'There was an error checking  GTP chat completion object: %s',
        [e.toString()],
      );
    }
  }

  public createRecords(responsetime, stepOrder = 1): StepRecord[] {
    const records = [];
    // Base Record
    records.push(this.keyValue('completion', '', responsetime));
    // Ordered Record
    records.push(
      this.keyValue(
        `completion.${stepOrder}`,
        `Checked Response Time from Step ${stepOrder}`,
        responsetime,
      ),
    );
    return records;
  }
}

export { CompletionResponseTime as Step };
