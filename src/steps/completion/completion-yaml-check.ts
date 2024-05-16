import { clearScreenDown } from 'readline';
import { parse } from 'yaml';
import * as fs from 'fs';
import * as path from 'path';

//  ████████╗ ███████╗ ███████╗ ████████╗ ███████╗
//  ╚══██╔══╝ ██╔════╝ ██╔════╝ ╚══██╔══╝ ██╔════╝
//     ██║    █████╗   ███████╗    ██║    ███████╗
//     ██║    ██╔══╝   ╚════██║    ██║    ╚════██║
//     ██║    ███████╗ ███████║    ██║    ███████║
//     ╚═╝    ╚══════╝ ╚══════╝    ╚═╝    ╚══════╝

// sample code to test the yaml parser
const yamlContentSample1 = `
scenario: Contextual Ambiguity Resolution Test in Customer Support for Apparel Shipping
description: > 
  Assess the model's ability to effectively handle ambiguous queries in a customer support context.
tokens:
  test:
    prompt: Assume you are a customer support chatbot of apparel company. A customer sent a message that says 'Where is my shipping'
    semanticSimilarityExpectation: Could you please provide me with your order number
    equalsOperator: contain 
    equalsExpectation: order number
    semanticSimilarity: 3
    model: gpt-4-1106-preview
steps:
  - step: OpenAI model {{test.model}} response to "{{test.prompt}}" semantically compared with "{{test.semanticSimilarityExpectation}}" should be greater than {{test.semanticSimilarity}}
    data:
      __stepOrder: 1
`;

const yamlContentSample2 = `
scenario: Make a complaint about a service without specifying the complaint
description: >
  Test for ability to understand the context of a complaint and request for more details
  when prompted with an ambiguous complaint

tokens:
  test:
    prompt: Assume you're a virtual assistant for a tech company.
      A user states that they're not satisfied with the service.
    modela: gpt-4-0613
    modelb: gpt-4-1106-preview
    modelc: gpt-4-0125-preview
    semanticSimilarityExpectation:
      I'm sorry to hear that. Could you please provide more details about the issue so I may further assist you?
      Your satisfaction is important to us and we would like to address your concerns.
    semanticSimilarityOperator: be greater than
    semanticSimilarity: 0.2

steps:
  - step: OpenAI model {{test.modela}} response to "{{test.prompt}}" semantically compared with "{{test.semanticSimilarityExpectation}}" should {{test.semanticSimilarityOperator}} {{test.semanticSimilarity}}
    data:
      __stepOrder: 1
  - step: OpenAI model {{model.b}} response to "{{test.prompt}}" semantically compared with "{{test.semanticSimilarityExpectation}}" should {{test.semanticSimilarityOperator}} {{test.semanticSimilarity}}
    data:
      __stepOrder: 2
  - step: OpenAI model {{model.c}} response to "{{test.qprompt}}" semantically compared with "{{test.semanticSimilarityExpectation}}" should {{test.semanticSimilarityOperator}} {{test.semanticSimilarity}}
    data:
      __stepOrder: 3
`;

/**
 * //StepID = CompletionSemanticSimilarity (from README)
 *  ```
 *  OpenAI model (?<model>[a-zA-Z0-9_-]+) response to 
 *  "(?<prompt>[a-zA-Z0-9_ -\p{P}]+)" semantically compared with 
 *  "(?<comparetext>[a-zA-Z0-9_ -\p{P}]+)" should 
 *  (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) 
 *  ?(?<semanticsimilarity>.+)?
 *  ```
 *  expected order = [model, prompt, comparetext, operator, semanticsimilarity]
 * 
 *  test YAML step = [modela, prompt, semanticSimilarityExpectation, semanticSimilarityOperator, semanticSimilarity] 
 *  test YAML step = [modelc, prompt, semanticSimilarityText, semanticOperator, Similarity]
 * 
 *  --> Compare variable names? Compare likeness?
 *  --> Compare the type / contents between two variables?
 * 
 * 
 */

const yamlContentSample2b = `
scenario: Make a complaint about a service without specifying the complaint
description: >
  Test for ability to understand the context of a complaint and request for more details
  when prompted with an ambiguous complaint

tokens:
  test:
    prompt: Assume you're a virtual assistant for a tech company.
      A user states that they're not satisfied with the service.
    modela: gpt-4-0613
    modelb: gpt-4-1106-preview
    modelc: gpt-4-0125-preview
    semanticSimilarityExpectation:
      I'm sorry to hear that. Could you please provide more details about the issue so I may further assist you?
      Your satisfaction is important to us and we would like to address your concerns.
    semanticSimilarityOperator: be greater than
    semanticSimilarity: 0.2

steps:
  - step: OpenAI model {{test.modela}} response to "{{test.prompt}}" semantically compared with "{{test.semanticSimilarityExpectation}}" should {{test.semanticSimilarityOperator}} {{test.semanticSimilarity}}
    data:
      __stepOrder: 2
  - step: OpenAI model {{model.b}} response to "{{test.prompt}}" semantically compared with "{{test.semanticSimilarityExpectation}}" should {{test.semanticSimilarityOperator}} {{test.semanticSimilarity}}
    data:
      __stepOrder: 2
  - step: OpenAI model {{model.c}} response to "{{test.qprompt}}" semantically compared with "{{test.semanticSimilarityExpectation}}" should {{test.semanticSimilarityOperator}} {{test.semanticSimilarity}}
    data:
      __stepOrder: 3
`;


const yamlContentSample3 = `
scenario: Contextual Ambiguity Resolution Test in Customer Support for Apparel Shipping
description: >
  Assess the model's ability to effectively handle ambiguous queries in a customer support context.
tokens:
  test:
    prompt: Assume you are a customer support chatbot of apparel company. A customer sent a message that says 'Where is my shipping'
    semanticSimilarityExpectation: Could you please provide me with your order number
    equalsOperator: contain
    equalsExpectation: order number
    semanticSimilarity: 0.15
    model: gpt-4-1106-preview
stes:
  - step: OpenAI model {{test.model}} response to "{{test.prompt}}" semantically compared with "{{test.semanticSimilarityExpectation}}" should be greater than {{test.semanticSimilarity}}
    data:
      __stepOrder: 1
`;


//   ██╗   ██╗ █████╗  ███╗   ███╗ ██╗            ██████╗  ██████╗       ██╗ ███████╗  ██████╗ ████████╗
//   ╚██╗ ██╔╝██╔══██╗ ████╗ ████║ ██║           ██╔═══██╗ ██╔══██╗      ██║ ██╔════╝ ██╔════╝ ╚══██╔══╝
//    ╚████╔╝ ███████║ ██╔████╔██║ ██║           ██║   ██║ ██████╔╝      ██║ █████╗   ██║         ██║   
//     ╚██╔╝  ██╔══██║ ██║╚██╔╝██║ ██║           ██║   ██║ ██╔══██╗ ██   ██║ ██╔══╝   ██║         ██║   
//      ██║   ██║  ██║ ██║ ╚═╝ ██║ ███████╗      ╚██████╔╝ ██████╔╝ ╚█████╔╝ ███████╗ ╚██████╗    ██║   
//      ╚═╝   ╚═╝  ╚═╝ ╚═╝     ╚═╝ ╚══════╝       ╚═════╝  ╚═════╝   ╚════╝  ╚══════╝  ╚═════╝    ╚═╝   
//
const validationFields = [
  "scenario",
  "description",
  "tokens",
  "test",
  "steps",
  "step",
  "data",
  "__stepOrder"
];

const baseOperators = [
  'be',
  'not be',
  'contain',
  'not contain',
  'be less than',
  'be greater than',
];


const validationKeyWords = [
  "prompt",
  "prompt1",
  "prompt2",
  "prompt3",
  "semanticSimilarityExpectation",
  "Operator",
  "Expectation",
  "semanticSimilarity",
  "model",
  "modela",
  "modelb",
  "modelc",
  "abOperator",
  "abExpectation",
  "semanticSimilarityOperator",
  "readabilityOperator",
  "schoolLevel",
  "equalsOperator",
  "equalsExpectation",
  "wordCountOperator",
  "wordCountExpectation"
];

// There should be eight(8) valid expressions as defined in the README
const validationExpression = [
  // stepID = CompletionEqualsAb
  'OpenAI model \\{\\{(?<modela>[a-zA-Z0-9_\\-\\.]+)\\}\\} and \\{\\{(?<modelb>[a-zA-Z0-9_\\-\\.]+)\\}\\} responses to "\\{\\{(?<prompt>[a-zA-Z0-9_ \\-\\p{P}\\.]+)\\}\\}" should \\{\\{(?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match)\\}\\} ?\\{\\{(?<expectation>.+)?\\}\\}',
  // stepID = CompletionEquals
  'OpenAI model \\{\\{(?<model>[a-zA-Z0-9_\\-\\.]+)\\}\\} response to "\\{\\{(?<prompt>[a-zA-Z0-9_ \\-\\p{P}\\.]+)\\}\\}" should \\{\\{(?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match)\\}\\} ?\\{\\{(?<expectation>.+)?\\}\\}',
  // stepID = CompletionReadability
  'OpenAI model \\{\\{(?<model>[a-zA-Z0-9_\\-\\.]+)\\}\\} school level of the response to "\\{\\{(?<prompt>[a-zA-Z0-9_ \\-\\p{P}\\.]+)\\}\\}" should \\{\\{(?<operator>be less than|be greater than|be one of|be|not be one of|not be)\\}\\} ?\\{\\{(?<schoollevel>.+)?\\}\\}',
  // stepID = CompletionSemanticSimilarity
  'OpenAI model \\{\\{(?<model>[a-zA-Z0-9_\\-\\.]+)\\}\\} response to "\\{\\{(?<prompt>[a-zA-Z0-9_ \\-\\p{P}\\.]+)\\}\\}" semantically compared with "\\{\\{(?<comparetext>[a-zA-Z0-9_ \\-\\p{P}\\.]+)\\}\\}" should \\{\\{(?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match)\\}\\} ?\\{\\{(?<semanticsimilarity>.+)?\\}\\}',
  // stepID = CompletionWordCount
  'OpenAI model \\{\\{(?<model>[a-zA-Z0-9_\\-\\.]+)\\}\\} word count in a response to "\\{\\{(?<prompt>[a-zA-Z0-9_ \\-\\p{P}\\.]+)\\}\\}" should \\{\\{(?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match)\\}\\} ?\\{\\{(?<expectation>.+)?\\}\\}',
  // stepID = EmbeddingsCosineSimilarity
  'OpenAI model \\{\\{(?<model>[a-zA-Z0-9_\\-\\.]+)\\}\\} cosine similarity of "\\{\\{(?<text1>[a-zA-Z0-9_ \\-\\.]+)\\}\\}" and "\\{\\{(?<text2>[a-zA-Z0-9_ \\-\\.]+)\\}\\}" should \\{\\{(?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match)\\}\\} ?\\{\\{(?<cosinesimilarity>.+)?\\}\\}',
  // stepID = CompletionTokenCost
  'OpenAI model \\{\\{(?<model>[a-zA-Z0-9_\\-\\.]+)\\}\\} ?\\{\\{(?<type>.+)?\\}\\} token cost in response to "\\{\\{(?<prompt>[a-zA-Z0-9_ \\-\\.]+)\\}\\}" should \\{\\{(?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match)\\}\\} ?\\{\\{(?<expectation>.+)?\\}\\} tokens',
  // stepID = CompletionResponseTime
  'OpenAI model \\{\\{(?<model>[a-zA-Z0-9_\\-\\.]+)\\}\\} response time in response to "\\{\\{(?<prompt>[a-zA-Z0-9_ \\-\\.]+)\\}\\}" should \\{\\{(?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match)\\}\\} ?\\{\\{(?<expectation>.+)?\\}\\} ms'
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




// COMMENTS ABOUT THINGS THAT NEED CHECKWING H
// 1) 

//
//   ██╗  ██╗  █████╗  ███╗   ██╗ ██████╗  ██╗      ███████╗ ██████╗  ███████╗
//   ██║  ██║ ██╔══██╗ ████╗  ██║ ██╔══██╗ ██║      ██╔════╝ ██╔══██╗ ██╔════╝
//   ███████║ ███████║ ██╔██╗ ██║ ██║  ██║ ██║      █████╗   ██████╔╝ ███████╗
//   ██╔══██║ ██╔══██║ ██║╚██╗██║ ██║  ██║ ██║      ██╔══╝   ██╔══██╗ ╚════██║
//   ██║  ██║ ██║  ██║ ██║ ╚████║ ██████╔╝ ███████╗ ███████╗ ██║  ██║ ███████║
//   ╚═╝  ╚═╝ ╚═╝  ╚═╝ ╚═╝  ╚═══╝ ╚═════╝  ╚══════╝ ╚══════╝ ╚═╝  ╚═╝ ╚══════╝
//
// this section contains the event handlers for the YAML object
// it should check the following: 
//     - ValidateYamlFormatHandler = the format of the YAML object, the keys should match the validationFields
//     - ValidateYamlExpressionHandler = the steps syntax should match the expression syntax as defined in the README
//     - ValidateYamlVariableHandler = syntax of the YAML object e.g. variables in steps matches the variables in the tokens

//type EventHandler = (scenario: any) => void;
type EventHandlerNames = "ValidateYamlFormatHandler" | "validateYamlContent"
interface ResultOutput {
  valid: boolean,
  message: string
}


interface Handler {
  setNext(handler: Handler): Handler;
  handle(scenario: Scenario): ResultOutput;
}

/**
 * This handler abstract class defines the structure of the event handlers. 
 * To be implemented by all event handlers
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
*  This is the last handler in the chain of handlers. It returns the object being handled in the chain.
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
 * This handler validates the format of the YAML object
 * i.e. checks if the required fields are present (scenario, description, tokens, steps)
 * 
 */
class ValidateYamlFormatHandler extends AbstractHandler {
  handle(scenario: Scenario): ResultOutput {
    if (this.validateYamlFormat(scenario)) {
      return this.nextHandler.handle(scenario);
    } else {
      const result: ResultOutput = {
        valid: false,
        message: "Error: YAML Validation failed. Invalid YAML Format."
      }
      return result;
    }
  }

  /**
   * ... class method
   * @param yamlContent 
   * @returns 
   */
  validateYamlFormat(scenario: Scenario): boolean {
    try {
      // Check if scenario has the required top level fields and if their types are valid
      const requiredTopLevelFields = ['scenario', 'description', 'tokens', 'steps'];
      if (
        Object.keys(scenario).length !== requiredTopLevelFields.length ||
        !requiredTopLevelFields.every(field => field in scenario) ||
        typeof scenario.scenario !== 'string' ||
        typeof scenario.description !== 'string' ||
        typeof scenario.tokens !== 'object' ||
        typeof scenario.steps !== 'object' ||
        !Array.isArray(scenario.steps)
      ) {
        throw new Error('Invalid YAML format... missing required fields');
      }

      // check if the test object exists
      if (
        !scenario.tokens.test ||
        Object.keys(scenario.tokens).length !== 1 ||
        typeof scenario.tokens.test !== 'object'
      ) {
        throw new Error('Invalid YAML format')
      }

      // Check each step
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

        ) {
          throw new Error('Invalid YAML format')
        }
      })

      return true;
    } catch (error) {
      return false;
    }
  }
}


/**
 * This handler validates the order of the steps in the YAML object
 * i.e. checks if the __stepOrder field is a positive integer, starting at 1 and incrementing by 1 for each new step
 * 
 */

class ValidateStepOrder extends AbstractHandler {
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
    // const stepOrders = steps.map(step => step.data.__stepOrder);

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
 * This handler checks if the semantic similarity number is between 0 and 1
 ******************* THIS SHOULD BE HANDLED IN THE REGEX EXPRESSION - CONFIRM WITH GRACE ********************
 * 
 */

// class ValidateSemanticSimilarityNumber extends AbstractHandler {
//   handle(scenario: Scenario): boolean {
//     if (this.validateSemanticSimilarityNumber(scenario)) {
//       console.log("Semantic similarity number is valid");
//       console.log("Moving onto next handler: ", this.nextHandler.constructor.name);
//       return this.nextHandler.handle(scenario);
//     } else {
//       console.log("Invalid semantic similarity number");
//       return false;
//     }
//   }

//   validateSemanticSimilarityNumber(scenario: Scenario) : boolean {
//     const steps = scenario.steps; 
//     const semanticSimilarities = steps.map(step => step.step.match(/{{(.*?)}}/g));
//     console.log("@@@@Semantic similarities: ", semanticSimilarities);  // e.g. returns [0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]
//     // const invalidSemanticSimilarities = semanticSimilarities.filter(similarity => typeof similarity === 'number' && (similarity <= 0 || similarity >= 1));
//     const invalidSemanticSimilarities = semanticSimilarities.filter(similarity => typeof similarity === 'number' && (similarity <= 0 || similarity >= 1));
//     if (invalidSemanticSimilarities.length > 0) {
//       console.error(`Invalid semantic similarity numbers found: ${invalidSemanticSimilarities}`);
//       return false;
//     } else {
//       console.log("Semantic similarity numbers are valid");
//       return true;
//     }
//   }
// }



// /**
//  * This handler checks if the word count expectation is a int greater than 0
//  * 
//  */

// class ValidateWordCountExpectation extends AbstractHandler {
//   handle(scenario: Scenario): boolean {
//     if (this.validateWordCountExpectation(scenario)) {
//       console.log("Word count expectation is valid");
//       console.log("Moving onto next handler: ", this.nextHandler.constructor.name);
//       return this.nextHandler.handle(scenario);
//     } else {
//       console.log("Invalid word count expectation");
//       return false;
//     }
//   }
//   validateWordCountExpectation(scenario: Scenario) : boolean {
//     const steps = scenario.steps;
//     const wordCountExpectations = steps.map(step => step.step.match(/{{(.*?)}}/g));
//     const invalidWordCountExpectations = wordCountExpectations.filter(expectation => typeof expectation === 'number' && expectation < 0);
//     if (invalidWordCountExpectations.length > 0) {
//       console.error(`Invalid word count expectations found: ${invalidWordCountExpectations}`);
//       return false;
//     } else {
//       console.log("Word count expectations are valid");
//       return true;
//     }
//   }

// }


/**
 * This handler validates the syntax of the step expression
 * e.g. a step should match the following expression exactly (ignoring the {{ parameters }}): 
 *      ```
 *      'OpenAI model {{ modelA }} and {{ modelB }} responses to 
 *      "{{ prompt }}" should {{ operator }} {{ expectation }}'
 *      ```
 * 
 */
class ValidateYamlExpressionHandler extends AbstractHandler {
  handle(scenario: Scenario): ResultOutput {
    return
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
  handle(scenario): ResultOutput {

    // console.log("Inside ValidateYamlVariableHandler...")
    // const scenario = parse(scenario) as Scenario;
    const steps = scenario.steps;
    const tokensTestVariableList = Object.keys(scenario.tokens.test);
    for (const step of steps) {
      try {
        // console.log("checking step: ", step.step);
        let resultCheckVariableKeyToStepParam = this.checkVariableKeyToStepParam([step], tokensTestVariableList);
        let resultCheckVariableOrder = this.checkVariableOrder([step], tokensTestVariableList);
        
        if (!resultCheckVariableKeyToStepParam || !resultCheckVariableOrder) {
          // if (!resultCheckVariableKeyToStepParam) {
          throw new Error("Invalid variable name(s) found in step: " + step.step);
        }
      } catch (error) {
        const result: ResultOutput = {
          valid: false,
          message: error.message
        }
        return result;
      }
    };
    // console.log("All variables are valid");
    // console.log("Moving onto next handler: ", this.nextHandler.constructor.name);
    return this.nextHandler.handle(scenario);

  }

  /**
   * Checks if the variables in the steps match the variables declared under tokens->tests
   * @param steps: a list of steps in the scenario as objects
   * @param tokens: a list of variables declared under tokens->tests as strings
   * @returns 
   */
  checkVariableKeyToStepParam(steps: any[], tokens: string[]) {
    let invalidVariables: string[] = [];
    try {
      const stepVariableList = steps.flatMap(step => {
        const matches = step.step.match(/{{(.*?)(\..*?)?}}/g);
        return matches ? matches.map(match => match.replace('{{test.', '{{').slice(2, -2)) : [];
      });

      stepVariableList.forEach(variable => {
        // process.stdout.write("checking variable: " + variable);
        if (!tokens.includes(variable)) {
          invalidVariables.push(variable);
          // console.log(" = not found❌");
          return;
        }
        // console.log(" = passed✅");
      });
      if (invalidVariables.length > 0) {
        throw new Error(`Invalid variable name(s) found for this step: ${invalidVariables}`);
      } else {
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if the variables in the steps are in the correct order against 
   * the order of variables in any of the existing expressions
   * 
   * @param steps: a list of steps in the scenario as objects
   * @param tokens: a list of variables declared under tokens->tests as strings 
   */
  checkVariableOrder(steps: any[], tokens: string[]) {
    // console.log("\n@TO-DO@ checkVariableOrder: Implement this function");
    return true;
  }

}


//   ███████╗ █████╗   ██████╗  █████╗  ██████╗  ███████╗
//   ██╔════╝██╔══██╗ ██╔════╝ ██╔══██╗ ██╔══██╗ ██╔════╝
//   █████╗  ███████║ ██║      ███████║ ██║  ██║ █████╗  
//   ██╔══╝  ██╔══██║ ██║      ██╔══██║ ██║  ██║ ██╔══╝  
//   ██║     ██║  ██║ ╚██████╗ ██║  ██║ ██████╔╝ ███████╗
//   ╚═╝     ╚═╝  ╚═╝  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝  ╚══════╝
// 
//  this section takes care of the event handling i.e. takes the object and passes it thru the event handlers




function executeHandlers(yaml: string) {
  try {
    const scenario = parse(yaml) as Scenario;
    
    /**
     * Instantiate the event handlers
     */
    const validateYamlFormatHandler = new ValidateYamlFormatHandler();
    const ValidateStepOrderHandler = new ValidateStepOrder();
    // const ValidateSemanticSimilarityNumberHandler = new ValidateSemanticSimilarityNumber();
    // const ValidateWordCountExpectationHandler = new ValidateWordCountExpectation();
    // const validateYamlExpressionHandler = new ValidateYamlExpressionHandler();
    const validateYamlVariableHandler = new ValidateYamlVariableHandler();
    const defaultHandler = new DefaultHandler();

    /**
     * Set the chain of handlers order
     */
    validateYamlFormatHandler
    .setNext(ValidateStepOrderHandler)
    // .setNext(ValidateSemanticSimilarityNumberHandler)
    // .setNext(ValidateWordCountExpectationHandler)
    // .setNext(validateYamlExpressionHandler)
    .setNext(validateYamlVariableHandler)
    .setNext(defaultHandler);

    const result = validateYamlFormatHandler.handle(scenario);
    return result

  } catch (error) {
    const result: ResultOutput = {
      valid: false,
      message: "Error: YAML Validation failed. Could not parse YAML."
    }
    return result;
  }
}


/**
 * This function checks all the yaml files in a given folder
 */
function processYamlFiles(): void {
  const folderPath = path.join(__dirname, '../../../test/scenarios/ambiguity-tests');
  console.log("folderPath", folderPath);

  // Read directory contents synchronously
  const files = fs.readdirSync(folderPath);
  // console.log("files in the directory: ", files);

  // Filter for .yaml files
  const yamlFiles = files.filter(file => file.endsWith('.yml'));
  console.log("yaml files (.yml) found:", yamlFiles);

  // Loop through each YAML file
  yamlFiles.forEach((file, index) => {
    const filePath = path.join(folderPath, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    console.log("typeof file: ", typeof file)
    console.log("typeof fileContent: ", typeof fileContent)
    try {
      var result = executeHandlers(fileContent)
      console.log(`file ${index + 1}: ${file}`)
      console.log(result)
      console.log()
    } catch (error) {
      const result = {

      }
    }
  });
}


// Drive the program.
try {
  processYamlFiles()  // checks all the yaml files in the test folder

  // const scenario1 = parse(yamlContentSample1) as Scenario;
  // const scenario2 = parse(yamlContentSample2) as Scenario;
  // const scenario2b = parse(yamlContentSample2b) as Scenario;
  // const scenario3 = parse(yamlContentSample3) as Scenario;
  // var result = executeHandlers(scenario1);
  // console.log("Test 1 - ResultOutput object: ", result);
  // var result = executeHandlers(scenario2);
  // console.log("Test 2 - ResultOutput object: ", result);
  // var result = executeHandlers(scenario2b);
  // console.log("Test 3 - ResultOutput object: ", result);
} catch (error) {
  console.log(error)
}




