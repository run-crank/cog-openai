
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
  protected stepName: string = 'Check OpenAI GPT prompt response with YAML validation';

  // this line should be registered as a new step expression
  protected stepExpression: string = `OpenAI model (?<model>[a-zA-Z0-9_ -.]+) format validation in response to "(?<prompt>[a-zA-Z0-9_ -'".,?!]+)" should be valid.`;

  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;

  protected actionList: string[] = ['check'];

  protected targetObject: string = 'YAML Response Validation';

  protected expectedFields: Field[] = [{
    field: 'prompt',
    type: FieldDefinition.Type.STRING,
    description: 'User Prompt to send to GPT',
  }, {
    field: 'model',
    type: FieldDefinition.Type.STRING,
    description: 'GPT Model to use for completion',
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

    let result = { valid: false, message: '' };

    try {
      const messages = [];
      const message = {
        role: 'user',
        content: prompt
      };
      messages.push(assistantContextMessage)
      messages.push(message)
      console.log("\n@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
      console.log(messages[1]);
      console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
      const completion = await this.client.getChatCompletion(model, messages);  // @TODO@
      console.log("");
      console.log("");
      console.log("completion: ", completion);
      const response = completion.text_response;
      console.log("");
      console.log("");

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
      writeDataToCSV(response, result)  // if you dont want to write to csv atm, you can comment it out
      
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

const systemContextMessage = {
  role: "system",
  content: "You are a YAML scenario generator. You must only output COMPLETELY VALID YAML"
}

const assistantContextMessage =  {
  role: "assistant",
  content: `
This is a sample YAML structure format that must be followed. You should *not* be adding any extra special characters (exceptions are in the steps section) such as colons, greater-than or less-than signs, etc.
Fill in the fields with information relevant to the given prompt and choose at least one of the eight sample steps. Modify the step order number to make the chosen ones consecutive.

scenario: Sample Scenario
description: >
  This is a detailed description of the scenario. Explain the context, the objecives, and any specific details needed for the AI to understand the task.
tokens:
  test:
    prompt: This is the prompt sent to the AI pertaining to the scenario.
    type: input | output
    
    abOperator: The operator used for comparing model A and model B.
    responseOperator: The operator used to check for a valid response.
    equalsOperator: The operator used for comparison.
    tokenCostOperator: The operator uesd for token cost.
    schoollevelOperator: The operator used for school level.
    
    textExpectation: The expected output. Should not include quote signs.
    responseTime: Expected GPT response time in milliseconds.
    tokenCostExpectation: The expected token cost (integer greater than 0).
    schoollevel: 5th grade | 6th grade | 7th grade | 8th & 9th grade | 10th to 12th grade | College | College Graduate | Professional
    
    semanticSimilarity: The expected semantic similarity score (float between 0 and 1).
    cosineSimilarityExpectation: The expectation of cosine similarity.
    wordCountExpectation: The expected word count.
    
    modela: The AI model used (e.g., "gpt-4o").
    modelb: The AI model used (e.g., "gpt-4o").

steps:
  - step: OpenAI model {{test.modela}} and {{test.modelb}} responses to "{{test.prompt}}" should {{test.abOperator}} {{test.textExpectation}}
    data:
      __stepOrder: 1
  - step: OpenAI model {{test.modela}} response to "{{test.prompt}}" should {{test.equalsOperator}} {{test.textExpectation}}
    data:
      __stepOrder: 2
  - step: OpenAI model {{test.modela}} school level of the response to "{{test.prompt}}" should {{test.schoollevelOperator}} {{test.schoollevel}}
    data:
      __stepOrder: 3
  - step: OpenAI model {{test.modela}} response to "{{test.prompt}}" semantically compared with "{{test.textExpectation}}" should {{test.semanticSimilarityOperator}} {{test.semanticSimilarity}}
    data:
      __stepOrder: 4
  - step: OpenAI model {{test.modela}} word count in a response to "{{test.prompt}}" should {{test.equalsOperator}} {{test.wordCountExpectation}}
    data:
      __stepOrder: 5
  - step: OpenAI model {{test.modela}} cosine similarity of "{{test.prompt}}" and "{{test.prompt}}" should {{test.operator}} {{test.cosineSimilarityExpectation}}?
    data:
      __stepOrder: 6
  - step: OpenAI model {{test.modela}} {{test.type}} token cost in response to "{{test.prompt}}" should {{test.operator}} {{test.expectation}} tokens
    data:
      __stepOrder: 7
  - step: OpenAI model {{test.modela}} response time in response to "{{test.prompt}}" should {{test.operator}} {{test.responseTime}} ms
    data:
      __stepOrder: 8

Detailed description on how to fill in the YAML structure:

1. The output should consist of only VALID YAML and nothing more. Please respond without using code block tags (i.e., no three backticks) or any dashes (e.g. ---). Provide the information in plain text.. Do not use any natural language before or after producing the YAML.
2. scenario: Provide a concise title for the scenario.
3. description: Write a detailed description explaining the scenario, including the context, objectives, and any specific details that the AI needs to understand.
4. tokens:
- test:
 - prompt: Write the prompt that will be sent to the AI.
 - equalsOperator: Define the operator for comparison (be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match)
 - equalsExpectation: State the expected result for comparison.
 - semanticSimilarity: Provide a numerical value (between 0 and 1) indicating the expected semantic similarity.
 - model: Indicate the AI model to be used for the test (e.g., "gpt-4").
5. steps:
- Define the steps to verify the AI's response. Each step should compare the AI's response with the expected result using the provided criteria.
- __stepOrder: Maintain the order of the steps.
6. expression syntax for steps:
This is a list of the acceptable regex expressions to be used in the YAML steps above. If the user prompt specifies what kind of tests, then you should try and limit all step(s) to those related expresions, e.g. semantic tests should use the expression with "semantically compared with" and not include expressions related to school level or word count, etc.:

//Compare OpenAI GPT model A and B prompt responses from completion (CompletionEqualsAb): 
'^OpenAI model (?<modela>(?:[a-zA-Z0-9_-]*gpt-[a-zA-Z0-9_-]*)[^ ]*) and (?<modelb>(?:[a-zA-Z0-9_-]*gpt-[a-zA-Z0-9_-]*)[^ ]*) responses to "(?<prompt>[a-zA-Z0-9_ -\p{P}]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<expectation>.+)?'

//Check OpenAI GPT prompt response from completion (CompletionEquals)
'^OpenAI model (?<modela>(?:[a-zA-Z0-9_-]*gpt-[a-zA-Z0-9_-]*)[^ ]*) response to "(?<prompt>(?:(?!semantically compared)[a-zA-Z0-9_ -\p{P}])*)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) (?<expectation>.+)?'

//Check OpenAI GPT prompt response FRES reading ease evaluation (CompletionReadability)
'^OpenAI model (?<modela>(?:[a-zA-Z0-9_-]*gpt-[a-zA-Z0-9_-]*)[^ ]*) school level of the response to "(?<prompt>[a-zA-Z0-9_ -\p{P}]+)" should (?<operator>be less than|be greater than|be one of|be|not be one of|not be) ?(?<schoollevel>.+)?'

//Check OpenAI GPT semantic similarity of response to provided text from completion (CompletionSemanticSimilarity)
'^OpenAI model (?<modela>(?:[a-zA-Z0-9_-]*gpt-[a-zA-Z0-9_-]*)[^ ]*) response to "(?<prompt>[a-zA-Z0-9_ -\p{P}]+)" semantically compared with "(?<comparetext>[a-zA-Z0-9_ -\p{P}]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<semanticsimilarity>0(\\.\\d+)?)'

//Check OpenAI GPT prompt response word count from completion (CompletionWordCount)
'^OpenAI model (?<modela>(?:[a-zA-Z0-9_-]*gpt-[a-zA-Z0-9_-]*)[^ ]*) word count in a response to "(?<prompt>[a-zA-Z0-9_ -\p{P}]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) (?<expectation>0|[1-9]\\d*)'

//Check OpenAI GPT cosine similarity of two texts based on embeddings (EmbeddingsCosineSimilarity)
'^OpenAI model (?<modela>(?:[a-zA-Z0-9_-]*gpt-[a-zA-Z0-9_-]*)[^ ]*) cosine similarity of "(?<text1>[a-zA-Z0-9_ -]+)" and "(?<text2>[a-zA-Z0-9_ -]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<cosinesimilarity>.+)?'

//Check OpenAI GPT prompt token cost given a prompt and model (CompletionTokenCost)
'^OpenAI model (?<modela>(?:[a-zA-Z0-9_-]*gpt-[a-zA-Z0-9_-]*)[^ ]*) ?(?<type>.+)? token cost in response to "(?<prompt>[a-zA-Z0-9_ -\p{P}]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) (?<expectation>0|[1-9]\\d*) tokens$'

//Check OpenAI GPT prompt response time from requiest to completion(CompletionResponseTime)
'^OpenAI model (?<modela>(?:[a-zA-Z0-9_-]*gpt-[a-zA-Z0-9_-]*)[^ ]*) response time in response to "(?<prompt>[a-zA-Z0-9_ -\p{P}]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) (?<expectation>0|[1-9]\\d*) ms$'
`
}

export { CompletionValidation as Step };

