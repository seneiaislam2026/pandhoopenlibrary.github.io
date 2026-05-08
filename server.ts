import express from 'express';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for AI bot
  app.post('/api/gemini', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE" || apiKey === "your_api_key_here") {
        return res.status(400).json({ error: "GEMINI_API_KEY is not set or is a placeholder. Please set a valid Gemini API key in your AI Studio Environment settings." });
      }

      const { GoogleGenAI } = await import('@google/genai');
      let genAI;
      try {
         genAI = new GoogleGenAI({ apiKey });
      } catch (err: any) {
         return res.status(400).json({ error: "Invalid API key provided to Google Gen AI SDK." });
      }

      const { contents, systemInstruction } = req.body;
      try {
        const result = await genAI.models.generateContent({
          model: "gemini-2.5-flash",
          contents: contents,
          config: {
            systemInstruction: systemInstruction 
          }
        });
        res.json({ text: result.text });
      } catch (genError: any) {
        console.error('Gemini Generate Error Details:', genError);
        // Gen AI throws errors that sometimes have specific status formats
        const msg = genError?.message || String(genError);
        if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
            return res.status(400).json({ error: "The provided GEMINI_API_KEY is invalid. Please check your API key in the settings." });
        }
        if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
            return res.status(429).json({ error: "API limit reached. Please try again after a minute." });
        }
        throw genError;
      }
    } catch (error: any) {
      console.error('Server Gemini API error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // API route for sending SMS
  app.post('/api/send-sms', async (req, res) => {
    try {
      const { number, message } = req.body;
      if (!number || !message) {
        return res.status(400).json({ success: false, error: 'Missing number or message' });
      }

      // Clean up the phone number (remove +88, spaces, dashes)
      let cleanNumber = number.replace(/\D/g, '');
      if (cleanNumber.startsWith('880')) {
        cleanNumber = cleanNumber;
      } else if (cleanNumber.startsWith('0')) {
        cleanNumber = '88' + cleanNumber;
      } else if (cleanNumber.length === 10) {
        cleanNumber = '880' + cleanNumber;
      }

      const apiKey = process.env.SMS_API_KEY;
      const senderId = process.env.SMS_SENDER_ID;
      
      if (!apiKey || !senderId) {
        return res.status(500).json({ error: 'Missing SMS API configuration' });
      }
      
      // Must use unicode for Bengali
      const url = `https://bulksmsbd.net/api/smsapi?api_key=${apiKey}&type=unicode&number=${cleanNumber}&senderid=${senderId}&message=${encodeURIComponent(message)}`;
      
      // Make the fetch from the server
      const proxyResponse = await fetch(url);
      const data = await proxyResponse.text();
      
      // Parse JSON safely
      let json: any = {};
      try { json = JSON.parse(data); } catch(e) {}
      
      if (json.response_code === 202) {
          console.log(`✅ SMS successfully submitted to ${cleanNumber}`);
      } else {
          console.error(`⚠️ SMS API returned an issue for ${cleanNumber}:`, data);
      }
      
      res.json({ success: true, data: json, rawData: data });
    } catch (error: any) {
      console.error('Server SMS API error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // We would serve static here, but AI studio usually handles this or 'npm run build' handles this.
    // Assuming standard dist
    const path = await import('path');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
