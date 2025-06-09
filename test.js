// This file only work to develop a website of html,css,javascript

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Create folder and save files
function createTodoWebsite(projectName, files) {
  const folderPath = path.join(process.cwd(), projectName);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }

  files.forEach(file => {
    const filePath = path.join(folderPath, file.name);
    fs.writeFileSync(filePath, file.content, "utf8");
    console.log(`✅ Created ${file.name}`);
  });
}

const prompt = `
what is in my package.json file.
Return the output in this JSON format:
[
  {
    "name": "index.html",
    "content": "<!DOCTYPE html>...full html..."
  },
  {
    "name": "style.css",
    "content": "body { ... }"
  },
  {
    "name": "script.js",
    "content": "document.addEventListener(...)"
  }
]
Do not return explanation. Only return JSON array with exact code files.
`;

async function generateTodoProject() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    // Clean up and parse JSON safely
    const jsonStart = raw.indexOf("[");
    const jsonEnd = raw.lastIndexOf("]");
    const jsonText = raw.slice(jsonStart, jsonEnd + 1);

    const files = JSON.parse(jsonText);
    createTodoWebsite("todo-website", files);

    console.log("🎉 Project generated successfully!");
  } catch (err) {
    console.error("❌ Error:", err.message || err);
  }
}

generateTodoProject();
