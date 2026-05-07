
import { GoogleGenAI } from "@google/genai";

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: "GEMINI_API_KEY is not set in Netlify Environment Variables" })
    };
  }

  try {
    const { contents, systemInstruction } = JSON.parse(event.body || '{}');
    const genAI = new GoogleGenAI({ apiKey: apiKey as string });
    const result = await genAI.models.generateContent({ 
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction 
      }
    });

    const text = result.text;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
