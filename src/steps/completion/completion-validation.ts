/* tslint:disable:no-else-after-return */

import * as util from '@run-crank/utilities';
import * as similarity from 'similarity';
import * as stringSimilarity from 'string-similarity';
import * as fs from 'fs';
import { processStringYaml } from '../../core/yaml-validation';

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
    const model = 'gpt-4-0613'
    const inputFile = stepData.inputFile;
    const operator = 'be greater than';
    const expectation = '0.75';
    let prompt = 'Given this yaml file:'; // TODO

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
            // Print the file content to the console
            console.log('File content:', fileContent);
            
            const parsedYamlAsString = JSON.stringify(fileContent);
            console.log('Parsed yaml as string:', parsedYamlAsString);
            
            result = processStringYaml(fileContent);  // call the function to process the yaml file (i.e. from the core/yam-validation.ts file)

            // store data for csv file
            // prompt, ai model, result (true or false), yaml scenario
            const data = {
                inputFile: inputFile,
                result: result.valid,
                prompt: prompt,
                model: model,
            }
            // write to csv file
            const createCsvWriter = require('csv-writer').createObjectCsvWriter;
            const csvWriter = createCsvWriter({
                path: 'completion-validation.csv',
                header: [
                    {id: 'inputFile', title: 'Input File'},
                    {id: 'result', title: 'Result'},
                    {id: 'prompt', title: 'Prompt'},
                    {id: 'model', title: 'Model'},
                ]
            });

            const records = [data];
            csvWriter.writeRecords(records)
                .then(() => {
                    console.log('...Done writing to csv file');
                });
            


            return result.valid ? this.pass(result.message, []) : this.fail(result.message, []);
            
            //@@@@@@ below is uncheachable for now, they are for context validation using openai api @@@@@@@@@@@@@@@@@@@
            prompt += `\n${fileContent}\n\nGrade how much sense the tokens and steps made under the scenario and description, only grade it using float number out of 1 without natural language`; // TODO

          }
        
        // @@@@@@@@@@@@@@@@later is the code for the context validation@@@@@@@@@@@@@@@@@@@

        // const messages = [];
        // const message = {};
        // message['role'] = 'user';
        // message['content'] = prompt;
        // messages.push(message);
        // const completion = await this.client.getChatCompletion(model, messages);
        // const response = completion.text_response;
        // result = this.assert(operator, response, expectation, 'response');
        
        // const returnObj = {
        //     model,
        //     prompt,
        //     response,
        //     usage: completion.usage,
        //     created: completion.created,
        //     request: completion.request_payload,
        // };
        // const records = this.createRecords(returnObj, stepData.__stepOrder);
        // return result.valid ? this.pass(result.message, [], records) : this.fail(result.message, [], records); 

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

export { CompletionValidation as Step };
