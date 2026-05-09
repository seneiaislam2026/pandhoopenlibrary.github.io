
import { GoogleGenAI } from "@google/genai";

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE" || apiKey === "your_api_key_here") {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: "GEMINI_API_KEY is not set or is a placeholder in Netlify Environment Variables. Please add a valid API Key." })
    };
  }

  let ai;
  try {
     ai = new GoogleGenAI({ apiKey: apiKey as string });
  } catch (initErr: any) {
     return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: "Invalid API key string format provided to GenAI SDK." })
    };
  }

  try {
    const { contents, systemInstruction, tools } = JSON.parse(event.body || '{}');
    
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        tools: tools
      }
    });

    const text = response.text;
    const functionCalls = response.functionCalls;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, functionCalls })
    };
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
       return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: "The provided GEMINI_API_KEY is invalid. Please check your API key in the Netlify settings." })
       };
    }
    if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
       return {
          statusCode: 429,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: "API limit reached. Please try again after a minute." })
       };
    }
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: msg })
    };
  }
};

