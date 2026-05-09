
import { GoogleGenerativeAI } from "@google/generative-ai";

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  const apiKey = process.env.GEMINI_API_KEY || "AIzaSyC7HnIFbb2E15H15lf-MN_K463mcQoFwuA";
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE" || apiKey === "your_api_key_here") {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: "GEMINI_API_KEY is not set or is a placeholder in Netlify Environment Variables. Please add a valid API Key." })
    };
  }

  try {
    const { contents, systemInstruction, tools } = JSON.parse(event.body || '{}');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction 
    });
    
    const result = await model.generateContent({
      contents: contents,
      tools: tools
    });

    const response = result.response;
    const text = response.text();
    const functionCalls = response.functionCalls();
    const content = response.candidates?.[0]?.content;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, functionCalls, content })
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

