import { clearScreenDown } from 'readline';
import { parse } from 'yaml';
import * as fs from 'fs';
import * as path from 'path';


//   ██╗   ██╗ █████╗  ███╗   ███╗ ██╗            ██████╗  ██████╗       ██╗ ███████╗  ██████╗ ████████╗
//   ╚██╗ ██╔╝██╔══██╗ ████╗ ████║ ██║           ██╔═══██╗ ██╔══██╗      ██║ ██╔════╝ ██╔════╝ ╚══██╔══╝
//    ╚████╔╝ ███████║ ██╔████╔██║ ██║           ██║   ██║ ██████╔╝      ██║ █████╗   ██║         ██║   
//     ╚██╔╝  ██╔══██║ ██║╚██╔╝██║ ██║           ██║   ██║ ██╔══██╗ ██   ██║ ██╔══╝   ██║         ██║   
//      ██║   ██║  ██║ ██║ ╚═╝ ██║ ███████╗      ╚██████╔╝ ██████╔╝ ╚█████╔╝ ███████╗ ╚██████╗    ██║   
//      ╚═╝   ╚═╝  ╚═╝ ╚═╝     ╚═╝ ╚══════╝       ╚═════╝  ╚═════╝   ╚════╝  ╚══════╝  ╚═════╝    ╚═╝   
//

// There should be eight(8) valid expressions as defined in the README, this is specific usage for the validator
const validationExpression = [
  '^OpenAI model (?<modela>(?:[a-zA-Z0-9_-]*gpt-[a-zA-Z0-9_-]*)[^ ]*) and (?<modelb>(?:[a-zA-Z0-9_-]*gpt-[a-zA-Z0-9_-]*)[^ ]*) responses to "(?<prompt>[a-zA-Z0-9_ -\p{P}]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<expectation>.+)?',  //ok

  '^OpenAI model (?<modela>(?:[a-zA-Z0-9_-]*gpt-[a-zA-Z0-9_-]*)[^ ]*) response to "(?<prompt>(?:(?!semantically compared)[a-zA-Z0-9_ -\p{P}])*)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) (?<expectation>.+)?', // general threshold

  '^OpenAI model (?<modela>(?:[a-zA-Z0-9_-]*gpt-[a-zA-Z0-9_-]*)[^ ]*) school level of the response to "(?<prompt>[a-zA-Z0-9_ -\p{P}]+)" should (?<operator>be less than|be greater than|be one of|be|not be one of|not be) ?(?<schoollevel>.+)?', //idk

  '^OpenAI model (?<modela>(?:[a-zA-Z0-9_-]*gpt-[a-zA-Z0-9_-]*)[^ ]*) response to "(?<prompt>[a-zA-Z0-9_ -\p{P}]+)" semantically compared with "(?<comparetext>[a-zA-Z0-9_ -\p{P}]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<semanticsimilarity>0(\\.\\d+)?)', //ok

  '^OpenAI model (?<modela>(?:[a-zA-Z0-9_-]*gpt-[a-zA-Z0-9_-]*)[^ ]*) word count in a response to "(?<prompt>[a-zA-Z0-9_ -\p{P}]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) (?<expectation>0|[1-9]\\d*)', //ok

  '^OpenAI model (?<modela>(?:[a-zA-Z0-9_-]*gpt-[a-zA-Z0-9_-]*)[^ ]*) cosine similarity of "(?<text1>[a-zA-Z0-9_ -]+)" and "(?<text2>[a-zA-Z0-9_ -]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<cosinesimilarity>.+)?', //idk

  '^OpenAI model (?<modela>(?:[a-zA-Z0-9_-]*gpt-[a-zA-Z0-9_-]*)[^ ]*) ?(?<type>.+)? token cost in response to "(?<prompt>[a-zA-Z0-9_ -]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) (?<expectation>0|[1-9]\\d*) tokens$', //ok

  '^OpenAI model (?<modela>(?:[a-zA-Z0-9_-]*gpt-[a-zA-Z0-9_-]*)[^ ]*) response time in response to "(?<prompt>[a-zA-Z0-9_ -]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) (?<expectation>0|[1-9]\\d*) ms$',  //ok
];


interface Scenario {
  scenario: string;
  description: string;
  tokens: {
    test: {
      [key: string]: string | number | { [key: string]: string | number }[];
    }
  }
  steps: {
    step: string;
    data: {
      [key: string]: number
    };
  }[];
};

type Tokens = { [key: string]: any }; // the type of the tokens object in the YAML object



//
//   ██╗  ██╗  █████╗  ███╗   ██╗ ██████╗  ██╗      ███████╗ ██████╗  ███████╗
//   ██║  ██║ ██╔══██╗ ████╗  ██║ ██╔══██╗ ██║      ██╔════╝ ██╔══██╗ ██╔════╝
//   ███████║ ███████║ ██╔██╗ ██║ ██║  ██║ ██║      █████╗   ██████╔╝ ███████╗
//   ██╔══██║ ██╔══██║ ██║╚██╗██║ ██║  ██║ ██║      ██╔══╝   ██╔══██╗ ╚════██║
//   ██║  ██║ ██║  ██║ ██║ ╚████║ ██████╔╝ ███████╗ ███████╗ ██║  ██║ ███████║
//   ╚═╝  ╚═╝ ╚═╝  ╚═╝ ╚═╝  ╚═══╝ ╚═════╝  ╚══════╝ ╚══════╝ ╚═╝  ╚═╝ ╚══════╝
//
//   This section contains the event handlers that validate the YAML object
//

interface Handler {
  setNext(handler: Handler): Handler;
  handle(scenario: Scenario): ResultOutput;
}

export interface ResultOutput {
  valid: boolean,
  message: string
}


/**
 * This handler abstract class defines the structure of the event handlers. 
 * To be implemented by all event handlers.
 *
 */
abstract class AbstractHandler implements Handler {
  protected nextHandler: Handler;

  abstract handle(scenario: Scenario): ResultOutput;

  public setNext(handler: Handler): Handler {
    this.nextHandler = handler;
    return handler;
  }
}


/** 
*  The DefaultHandler should be the last handler in the chain of handlers. 
*  It returns an object that is the result of the validation process.
* 
*/
class DefaultHandler extends AbstractHandler {
  handle(scenario: Scenario): ResultOutput {
    const result: ResultOutput = {
      valid: true,
      message: "All checks passed"
    }
    return result;
  }
}

/**
 * Validates the format of the YAML object.
 * i.e. It checks that each field exists, each field is the correct type, and if there are any extra fields.
 */
class ValidateYamlFormatHandler extends AbstractHandler {
  handle(scenario: Scenario): ResultOutput {
    if (this.validateTopLevelFields(scenario) &&
        this.validateTestObject(scenario) && 
        this.validateStepFields(scenario)) {
      return this.nextHandler.handle(scenario);
    } else {
      const result: ResultOutput = {
        valid: false,
        message: "Error: YAML Validation failed. Invalid YAML Format."
      }
      return result;
    }
  }
  
  validateTopLevelFields(scenario: Scenario): boolean {
    try {
      const requiredTopLevelFields = ['scenario', 'description', 'tokens', 'steps'];
      if (
        Object.keys(scenario).length !== requiredTopLevelFields.length ||
        !requiredTopLevelFields.every(field => field in scenario) ||
        typeof scenario.scenario !== 'string' ||
        typeof scenario.description !== 'string' ||
        typeof scenario.tokens !== 'object' ||
        typeof scenario.steps !== 'object' ||
        !Array.isArray(scenario.steps)
      ) { throw new Error('Invalid YAML format... missing required fields'); }
      return true
    } catch {
      return false
    }
  }

  validateTestObject(scenario: Scenario): boolean {
    try {
      if (
        !scenario.tokens.test ||
        Object.keys(scenario.tokens).length !== 1 ||
        typeof scenario.tokens.test !== 'object'
      ) {throw new Error('Invalid YAML format')}
      return true
    } catch {
      return false
    }
  }

  validateStepFields(scenario: Scenario): boolean {
    try {
      const requiredStepFields = ['step', 'data'];
      scenario.steps.forEach((step, index) => {
        if (
          Object.keys(step).length !== requiredStepFields.length ||
          !requiredStepFields.every(field => field in step) ||
          typeof step.step !== 'string' ||
          typeof step.data !== 'object' ||
          Object.keys(step.data).length !== 1 ||
          !('__stepOrder' in step.data || '__StepOrder' in step.data) ||
          (typeof step.data.__stepOrder !== 'number' && typeof step.data.__StepOrder !== 'number')

        ) { throw new Error('Invalid YAML format') }
      })
      return true
    } catch {
      return false
    }
  }
}


/**
 * The ValidateStepOrderHandler validates the order of the steps in the YAML object
 * i.e. checks if the __stepOrder field is a positive integer, starts at 1, and increments by 1 for each subsequent step
 * 
 */
class ValidateStepOrderHandler extends AbstractHandler {
  handle(scenario: Scenario): ResultOutput {
    if (this.validateStepOrder(scenario)) {
      return this.nextHandler.handle(scenario);
    } else {
      const result: ResultOutput = {
        valid: false,
        message: "Error: YAML Validation failed. Invalid step order."
      }
      return result;
    }
  }

  validateStepOrder(scenario: Scenario): boolean {
    const steps = scenario.steps;
    const stepOrders = steps.map(step => {
      const pattern = /__steporder/i;
      const key = Object.keys(step.data).find(key => pattern.test(key));
      return key ? step.data[key] : null;
    });
    if (stepOrders.every((number, index) => number === index + 1)) {
      return true;
    } else {
      return false;
    }
  }
}


/**
 * This handler performs two checks on the variables in the steps:
 * 1. Check if the variables in the steps match the variables declared under tokens->tests.
 * 2. Check if the variables in the steps are in the correct order with the order of variables in any of the existing expressions.
 * Returns true if both checks pass, false otherwise.
 * 
 */
class ValidateYamlVariableHandler extends AbstractHandler {

  extractKeyValuePairs(tokens: Tokens): Map<string, any> {
    const keyValuePairs = new Map<string, any>();
    Object.keys(tokens).forEach((key) => {
      keyValuePairs.set(key, tokens[key]);
    });
    return keyValuePairs;
  }

  // Function to replace the placeholders with the actual values
  replacePlaceholders(str: string, map: Map<string, any>): string {
    return str.replace(/{{(test\.\w+)}}/g, (_, key) => {
        const param = key.split('.')[1];
        let value = map.get(param);
        if (value === undefined) {
            throw new Error(`Key ${param} not found in the test tokens`);
        }
        return String(value); // ensure that the returned value is a string
    });
  }

  validateStringExp(input: string): boolean {
    let count = 0;
    for (const pattern of validationExpression) {
        count++;
        const regex = new RegExp(pattern);
        const match = input.match(regex);
        
        if (match) {
            return true;
        }
    }
    console.log("Step definition is not correct");
    return false;
  }

  checkVariableKeyToStepParam(scenario: Scenario) {
    const steps = scenario.steps; // array of steps
    const keyValuePairs = this.extractKeyValuePairs(scenario.tokens.test); // Map of key-value pairs
    let stepOrder = 0;
    steps.forEach((step) => {
        stepOrder++;
        const stepData = step.data;
        const stepExp = step.step;

        // replace the placeholders with the actual values
        const replacedStepExp = this.replacePlaceholders(stepExp, keyValuePairs);
        console.log(`Step ${stepOrder}: ${replacedStepExp}`); // log the mapped step string
        // validate the step expression with the mapped step string
        const isValidExpression = this.validateStringExp(replacedStepExp);
        console.log("isValidExpression: ", isValidExpression);
        if (!isValidExpression) {
            throw new Error(`Invalid expression found at step ${stepOrder}`);
        }
    });
    return true;
  }

  
  handle(scenario): ResultOutput {
    try {
      if (this.checkVariableKeyToStepParam(scenario)) {
        return this.nextHandler.handle(scenario);
      } else {
        const result: ResultOutput = {
          valid: false,
          message: "Error: YAML Validation failed. Invalid variable keys in the steps."
        }
        return result;
      }
    } catch (error) {
      const result: ResultOutput = {
        valid: false,
        message: error.message
      }
      return result;
    }

  }
}


//   ███████╗ █████╗   ██████╗  █████╗  ██████╗  ███████╗
//   ██╔════╝██╔══██╗ ██╔════╝ ██╔══██╗ ██╔══██╗ ██╔════╝
//   █████╗  ███████║ ██║      ███████║ ██║  ██║ █████╗  
//   ██╔══╝  ██╔══██║ ██║      ██╔══██║ ██║  ██║ ██╔══╝  
//   ██║     ██║  ██║ ╚██████╗ ██║  ██║ ██████╔╝ ███████╗
//   ╚═╝     ╚═╝  ╚═╝  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝  ╚══════╝
// 
//   This section starts the event handling process 
//   i.e. takes the object and passes it thru the event handlers and then returns the result
//


/**
 * Setups the chain of handlers and executes them
 * 
 * @param yaml the YAML scenario as a string
 * @returns a ResultOutput object
 */
function executeHandlers(yaml: string) {
  try {
    const scenario = parse(yaml) as Scenario;

    const validateYamlFormatHandler = new ValidateYamlFormatHandler();
    const validateStepOrderHandler = new ValidateStepOrderHandler();
    const validateYamlVariableHandler = new ValidateYamlVariableHandler();
    const defaultHandler = new DefaultHandler();

    validateYamlFormatHandler
    .setNext(validateStepOrderHandler)
    .setNext(validateYamlVariableHandler)
    .setNext(defaultHandler);

    const result = validateYamlFormatHandler.handle(scenario);
    return result

  } catch {
    const result: ResultOutput = {
      valid: false,
      message: "Error: YAML Validation failed. Could not parse YAML."
    }
    return result;
  }
}


/**
 * This function tests all the YAML files in a specified folder
 * 
 * @param pathString the relative path to the folder containing the YAML files
 */
// function processYamlFiles(pathString: string = '../../test/scenarios/ambiguity-tests'): void {
//   const folderPath = path.join(__dirname, pathString);
//   console.log("folderPath", folderPath);

//   const files = fs.readdirSync(folderPath);

//   const yamlFiles = files.filter(file => file.endsWith('.yml'));
//   console.log("yaml files (.yml) found:", yamlFiles);

//   yamlFiles.forEach((file, index) => {
//     const filePath = path.join(folderPath, file);
//     const fileContent = fs.readFileSync(filePath, 'utf-8');
//     console.log("typeof file: ", typeof file)
//     console.log("typeof fileContent: ", typeof fileContent)
//     try {
//       var result = executeHandlers(fileContent)
//       console.log(`file ${index + 1}: ${file}`)
//       console.log(result)
//       console.log()
//     } catch (error) {
//       console.log(error)
//     }
//   });
// }


/**
 * Takes the YAML string and proccesses it through the event handlers
 * 
 * @param yaml a test scenario as a string
 * @returns a ResultOutput object
 */
export function processStringYaml(yaml: string): ResultOutput {
  try {
    var result = executeHandlers(yaml)
    console.log(result)
    return result
  } catch (error) {
    console.log(error)
  }
}


// // Test the program from this file

// try {
//   processYamlFiles()  // checks all the yaml files in the test folder
// } catch (error) {
//   console.log(error)
// }




