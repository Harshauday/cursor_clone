import dotenv from "dotenv";
import { exec } from "node:child_process";
import { GoogleGenerativeAI } from "@google/generative-ai";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Tools
function getWeatherInfo(cityname) {
  return `${cityname} has 43 Degree`;
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
  getWeatherInfo,
  executeCommand,
};

const SYSTEM_PROMPT = `
You are a helpful AI assistant who works in the following format:

START: User gives a query.
THINK: Think step-by-step how to solve it. Repeat 3-4 thoughts.
ACTION: Call a tool (from available tools).
OBSERVE: Wait for tool's response and observe it.
OUTPUT: Provide the final result to the user.

Always output in strict JSON format:
{
  "step":"string", 
  "tool":"string (if step is 'action')", 
  "input":"string (if step is 'action')", 
  "content":"string"
}

Available tools:
- executeCommand(command:string): Execute a Linux command and return stdout/stderr.
- getWeatherInfo(cityname:string): Returns dummy weather info for now.

Example:
{"role":"user","content":"what is weather of makarajola?"}
{"step":"think","content":"User asked for weather of makarajola."}
{"step":"think","content":"We can use getWeatherInfo tool for this."}
{"step":"action","tool":"getWeatherInfo","input":"makarajola"}
{"step":"observe","content":"32 Degree C"}
{"step":"think","content":"The tool returned 32 degree c."}
{"step":"output","content":"Hey, the weather in makarajola is 32 degree c which is quite hot 🥵"}
`;

async function init() {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const messages = [
    { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
    { role: "user", parts: [{ text: "what is in my package.json" }] }
  ];

  while (true) {
    const result = await model.generateContent({
      contents: messages,
      generationConfig: { responseMimeType: "application/json" }
    });

    const raw = result.response.text().trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("❌ Error parsing Gemini response as JSON:", raw);
      break;
    }

    if (parsed.step === "think") {
      console.log(`🧠: ${parsed.content}`);
      messages.push({ role: "model", parts: [{ text: JSON.stringify(parsed) }] });
      continue;
    }

    if (parsed.step === "output") {
      console.log(`🤖: ${parsed.content}`);
      break;
    }

    if (parsed.step === "action") {
      const toolName = parsed.tool;
      const input = parsed.input;
      const result = await TOOLS_MAP[toolName](input);
      console.log(`⛏️ Tool Call: ${toolName}(${input}) => ${result}`);
      messages.push({ role: "model", parts: [{ text: JSON.stringify({ step: "observe", content: result }) }] });
      continue;
    }
  }
}

init();
