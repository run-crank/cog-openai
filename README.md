# OpenAI Cog

This is a [Crank][what-is-crank] Cog for OpenAI, providing
steps and assertions for you to validate the state and behavior of your
OpenAI instance.

* [Installation](#installation)
* [Usage](#usage)
* [Development and Contributing](#development-and-contributing)

## Installation

Ensure you have the `crank` CLI and `docker` installed and running locally,
then run the following.  You'll be prompted to enter your OpenAI
credentials once the Cog is successfully installed.

```shell-session
$ crank cog:install stackmoxie/openai
```

Note: You can always re-authenticate later.

## Usage

### Authentication
<!-- run `crank cog:readme stackmoxie/openai` to update -->
<!-- authenticationDetails -->
You will be asked for the following authentication details on installation. To avoid prompts in a CI/CD context, you can provide the same details as environment variables.

| Field | Install-Time Environment Variable | Description |
| --- | --- | --- |
| **apiKey** | `CRANK_STACKMOXIE_OPENAI__APIKEY` | OpenAI API Key |

```shell-session
# Re-authenticate by running this
$ crank cog:auth stackmoxie/openai
```
<!-- authenticationDetailsEnd -->

### Steps
Once installed, the following steps will be available for use in any of your
Scenario files.

<!-- run `crank cog:readme stackmoxie/openai` to update -->
<!-- stepDetails -->
| Name (ID) | Expression | Expected Data |
| --- | --- | --- |
| **Compare OpenAI GPT model A and B prompt responses from completion**<br>(`CompletionEqualsAb`) | `OpenAI model (?<modela>[a-zA-Z0-9_-]+) and (?<modelb>[a-zA-Z0-9_-]+) responses to "(?<prompt>[a-zA-Z0-9_ -]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<expectation>.+)?` | - `prompt`: User Prompt to send to GPT Model <br><br>- `modela`: GPT Model A to use for completion <br><br>- `modelb`: GPT Model A to use for completion <br><br>- `operator`: Check Logic (be, not be, contain, not contain, be greater than, be less than, be set, not be set, be one of, or not be one of) <br><br>- `expectation`: Expected GPT model response value |
| --- | --- | --- |
| **Check OpenAI GPT prompt response from completion**<br>(`CompletionEquals`) | `OpenAI model (?<model>[a-zA-Z0-9_-]+) response to "(?<prompt>[a-zA-Z0-9_ -]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<expectation>.+)?` | - `prompt`: User Prompt to send to GPT Model <br><br>- `model`: GPT Model to use for completion <br><br>- `operator`: Check Logic (be, not be, contain, not contain, be greater than, be less than, be set, not be set, be one of, or not be one of) <br><br>- `expectation`: Expected GPT model response value |
| --- | --- | --- |
| **Check OpenAI GPT prompt response FRES reading ease evaluation**<br>(`CompletionReadability`) | `OpenAI model (?<model>[a-zA-Z0-9_-]+) school level of the response to "(?<prompt>[a-zA-Z0-9_ -]+)" should (?<operator>be less than|be greater than|be one of|be|not be one of|not be) ?(?<schoollevel>.+)?` | - `prompt`: User Prompt to send to GPT Model <br><br>- `model`: GPT Model to use for completion <br><br>- `operator`: Check Logic (be, not be, contain, not contain, be greater than, be less than, be set, not be set, be one of, or not be one of) <br><br>- `schoollevel`: Expected School Level (5th grade, 6th grade, 7th grade, 8th & 9th grade, 10th to 12th grade, College, College Graduate, Professional) |
| --- | --- | --- |
| **Check OpenAI GPT semantic similarity of response to provided text from completion**<br>(`CompletionSemanticSimilarity`) | `OpenAI model (?<model>[a-zA-Z0-9_-]+) response to "(?<prompt>[a-zA-Z0-9_ -]+)" semantically compared with "(?<comparetext>[a-zA-Z0-9_ -]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<semanticsimilarity>.+)?` | - `prompt`: User Prompt to send to GPT Model <br><br>- `model`: GPT Model to use for completion <br><br>- `operator`: Check Logic (be, not be, contain, not contain, be greater than, be less than, be set, not be set, be one of, or not be one of) <br><br>- `semanticsimilarity`: Expected Semantic Similarity Score (Levenstein Distance 0-1) | `comparetext`: Expected text to compare to GPT response |
| --- | --- | --- |
| **Check OpenAI GPT prompt response word count from completion**<br>(`CompletionWordCount`) | `OpenAI model (?<model>[a-zA-Z0-9_-]+) word count in a response to "(?<prompt>[a-zA-Z0-9_ -]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<expectation>.+)?` | - `prompt`: User Prompt to send to GPT Model <br><br>- `model`: GPT Model to use for completion <br><br>- `operator`: Check Logic (be, not be, contain, not contain, be greater than, be less than, be set, not be set, be one of, or not be one of) <br><br>- `expectation`: Expected GPT word count |
| --- | --- | --- |
| **Check OpenAI GPT cosine similarity of two texts based on embeddings**<br>(`EmbeddingsCosineSimilarity`) | `OpenAI model (?<model>[a-zA-Z0-9_-]+) cosine similarity of "(?<text1>[a-zA-Z0-9_ -]+)" and "(?<text2>[a-zA-Z0-9_ -]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<semanticsimilarity>.+)?` | - `text1`: First text to compare <br><br>- `text2`: Second text to compare <br><br>- `model`: GPT Embeddings Model to use <br><br>-
`operator`: Check Logic (be, not be, contain, not contain, be greater than, be less than, be set, not be set, be one of, or not be one of) <br><br>- `cosinesimilarity`: Expected Cosine Similarity Score (0-1) |

<!-- stepDetailsEnd -->

## Development and Contributing
Pull requests are welcome. For major changes, please open an issue first to
discuss what you would like to change. Please make sure to add or update tests
as appropriate.

### Setup

1. Install node.js (v12.x+ recommended)
2. Clone this repository.
3. Install dependencies via `npm install`
4. Run `npm start` to validate the Cog works locally (`ctrl+c` to kill it)
5. Run `crank cog:install --source=local --local-start-command="npm start"` to
   register your local instance of this Cog. You may need to append a `--force`
   flag or run `crank cog:uninstall stackmoxie/openai` if you've already
   installed the distributed version of this Cog.

### Adding/Modifying Steps
Modify code in `src/steps` and validate your changes by running
`crank cog:step stackmoxie/openai` and selecting your step.

To add new steps, create new step classes in `src/steps`. Use existing steps as
a starting point for your new step(s). Note that you will need to run
`crank registry:rebuild` in order for your new steps to be recognized.

Always add tests for your steps in the `test/steps` folder. Use existing tests
as a guide.

### Modifying the API Client or Authentication Details
Modify the ClientWrapper class at `src/client/client-wrapper.ts`.

- If you need to add or modify authentication details, see the
  `expectedAuthFields` static property.
- If you need to expose additional logic from the wrapped API client, add a new
  public method to the wrapper class or mixins, which can then be called in any
  step.
- It's also possible to swap out the wrapped API client completely. You should
  only have to modify code within this class or mixins to achieve that.

Note that you will need to run `crank registry:rebuild` in order for any
changes to authentication fields to be reflected. Afterward, you can
re-authenticate this Cog by running `crank cog:auth stackmoxie/openai`

### Tests and Housekeeping
Tests can be found in the `test` directory and run like this: `npm test`.
Ensure your code meets standards by running `npm run lint`.

[what-is-crank]: https://crank.run?utm_medium=readme&utm_source=stackmoxie%2Fopenai
