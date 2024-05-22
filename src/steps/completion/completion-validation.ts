/* tslint:disable:no-else-after-return */

import * as util from '@run-crank/utilities';
import * as similarity from 'similarity';
import * as stringSimilarity from 'string-similarity';
import * as fs from 'fs';
import { processStringYaml } from '../../core/yaml-validation';
import { ResultOutput} from '../../core/yaml-validation'

import {
  BaseStep, Field, StepInterface, ExpectedRecord,
} from '../../core/base-step';
import {
  Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord,
} from '../../proto/cog_pb';
import { baseOperators } from '../../client/constants/operators';

export class CompletionValidation extends BaseStep implements StepInterface {
  protected stepName: string = 'Check OpenAI GPT with file io';

  // this line should be registered as a new step expression
  protected stepExpression: string = ``;

  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;

  protected actionList: string[] = ['check'];

  protected targetObject: string = 'Semantic Similarity';

  protected expectedFields: Field[] = [{
    field: 'prompt',
    type: FieldDefinition.Type.STRING,
    description: 'User Prompt to send to GPT',
  }, {
    field: 'model',
    type: FieldDefinition.Type.STRING,
    description: 'GPT Model to use for completion',
  },{
    field: 'inputFile',
    type: FieldDefinition.Type.STRING,
    description: 'Path to the input file',
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

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const { prompt } = stepData;
    const { model } = stepData;
    const inputFile = stepData.inputFile;

    let result = { valid: false, message: '' };

    try {
      if (inputFile) {
        // if the inputFile is not in .crank.yml format, return an error
        if (!inputFile.endsWith('.crank.yml')) {
          return this.error('File format is not correct. Please provide a .crank.yml file');
        }

        const fileContent = fs.readFileSync(inputFile, 'utf8');
        if (!fileContent) {
          return this.error('File is empty. Please provide a valid file');
        }


        // let result = processStringYaml(fileContent);  // call the function to process the yaml file (i.e. from the core/yam-validation.ts file)
        
        // writeDataToCSV(fileContent, result)
        
        // return result.valid ? this.pass(result.message, []) : this.fail(result.message, []);
      }

      const messages = [];
      const message = {};
      message['role'] = 'user';
      message['content'] = prompt;
      messages.push(message);
      const completion = await this.client.getChatCompletion(model, messages);
      const response = completion.text_response;

      const returnObj = {
          model,
          prompt,
          response,
          usage: completion.usage,
          created: completion.created,
          request: completion.request_payload,
      };
      const records = this.createRecords(returnObj, stepData.__stepOrder);
      result = processStringYaml(response)
      // writeDataToCSV(response, result)  // if you dont want to write to csv atm, you can comment it out
      
      return result.valid ? this.pass(result.message, [], records) : this.fail(result.message, [], records); 
      
    } catch (e) {
      if (e instanceof util.UnknownOperatorError) {
        return this.error('%s Please provide one of: %s', [e.message, baseOperators.join(', ')]);
      }
      if (e instanceof util.InvalidOperandError) {
        return this.error('There was an error checking GPT chat completion object: %s', [e.message]);
      }
      return this.error('Error: %s', [e.toString()]);
    }
  }

  public createRecords(completion, stepOrder = 1): StepRecord[] {
    const records = [];
    // Base Record
    records.push(this.keyValue('completion', 'Check content reader', completion));
    // Ordered Record
    records.push(this.keyValue(`completion.${stepOrder}`, `Check content reader from Step ${stepOrder}`, completion));
    return records;
  }
}

  /** 
   * @todo where to store this function? in mixins?
   * 
   *  Write results into CSV
   *  Results should be stored in ./src/log/completion-validation_result.csv
   */
async function writeDataToCSV(fileContent: string, result: ResultOutput) {
  const scenarioParsedForCSV = JSON.stringify(fileContent);
  const data = {
    result: result.valid,
    resultMessage: result.message,
    prompt: "@@placeholder_prompt@@",
    model: "@@placeholder_model@@",
    scenarioContent: scenarioParsedForCSV
  }

  const pathToCSVFile = './src/log/completion-validation_result.csv'
  const appendData = fs.existsSync(pathToCSVFile) ? true : false;

  const createCsvWriter = require('csv-writer').createObjectCsvWriter;
  const csvWriter = createCsvWriter({
    path: pathToCSVFile,
    header: [
      { id: 'result', title: 'RESULT' },
      { id: 'resultMessage', title: 'RESULT_MESSAGE'},
      { id: 'prompt', title: 'PROMPT' },
      { id: 'model', title: 'MODEL' },
      { id: 'scenarioContent', title: 'SCENARIO_CONTENT' }
    ],
    append: appendData
  });

  const records = [data];
  await csvWriter.writeRecords(records)
    .then(() => {
      console.log('...Done writing to csv file');
    })
    .catch((error: any) => {
      console.error('Error writing to csv file: ', error);
    })
}

export { CompletionValidation as Step };
