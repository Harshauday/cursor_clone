import { OpenAI } from "openai";
import dotenv from "dotenv";
import { exec } from "node:child_process";
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getWeatherInfo(cityname) {
  return `${cityname}has 43 Degree `;
}
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      resolve(`stdout:${stdout}\n stderr:${stderr}`);
    });
  });
}

const TOOLS_MAP = {
  getWeatherInfo: getWeatherInfo,
  executeCommand: executeCommand,
};

const SYSTEM_PROMPT = `
    you are an helpful AI assistant who is designed to resolve user querys.
    you work on START,THINK,ACTION,OBSERVE and OUPUT mode.

    In START phase,user gives a query to you.
    then,you think how to resolve the  query atleast 3-4 times and make sure that all is clear.
    If there is a need a call a tool, you call the an ACTION event with tool and input parameters.
    If there is an action call, wait for the OBSERVE that is output of the tool.
    Based on the OBSERVE from prev step,you either ouptut or repeat the loop.

    Rules:
    -Always wait for next step.
    -Always output a single step and wait for next step.
    -Output must be strictly JSON.
    -only call tool action from Available tools.
    -Strictly follow the output format in JSON format.

    Available tools:
    -executeCommand(command:string):return string Excutes the given linux command on users device and return the STDOUT AND STDERR
    -getWeatherInfo(cityname:string):return string
    
    EXAMPLE:
    START:what is weather of makarajola?
    THINK:The user is asking for the weather of makarajola.
    THINK:from the available tools,I must call getwaether tool for makarajola as input.
    ACTION:Call tool getWeatherInfo(makrajola)
    OBSERRVE:32 Degree C
    THINK:The output of getWeatherInfo tool is 32 degree c.
    OUTPUT:Hey, the weather in makarajola is 32 degree c which is quite hot 🥵

    Output Example:
    {"role":"user","content":"what is weather of makarajola?"}
    {"step":"think","content":"The user is asking for the weather of makarajola."}
    {"step":"think","content":"from the available tools,I must call getwaether tool for makarajola as input."}
    {"step":"action","tool":"getWeatherInfo","input":"makarajola"}
    {"step":"observe","content":"32 Degree C"}
    {"step":"think","content":"The output of getWeatherInfo tool is 32 degree c."}
    {"step":"output","content":"Hey, the weather in makarajola is 32 degree c which is quite hot 🥵"}

    Output format:
    {
    "step":"string","tool":"string","input":"string","content":"string"
    }

    
`;

async function init() {
  const messages = [{ role: "system", content: SYSTEM_PROMPT }];

  const userQuery = "what is in my package.json file ?";
  messages.push({ role: "user", content: userQuery });

  while (true) {
    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      response_format: { type: "json_object" }, 
      messages: messages,
    });

    messages.push({
      role: "assistant",
      content: response.choices[0].message.content,
    });
    const pared_response = JSON.parse(response.choices[0].message.content);

    if (pared_response.step && pared_response.step === "think") {
      console.log(`🧠:${pared_response.content}`);
      continue;
    }

    if (pared_response.step && pared_response.step === "output") {
      console.log(`🤖:${pared_response.content}`);
      break;
    }

    if (pared_response.step && pared_response.step === "action") {
      const tool = pared_response.tool;
      const input = pared_response.input;
      const value = await TOOLS_MAP[tool](input);
      console.log(`⛏️:Tool Call${tool}:(${input}):${value}`);

      messages.push({
        role: "assistanet",
        content: JSON.stringify({ step: "observe", content: value }),
      });
      continue;
    }
  }
}

init();
