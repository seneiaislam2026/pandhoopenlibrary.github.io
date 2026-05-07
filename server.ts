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
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not set" });
      }
      const { GoogleGenAI } = await import('@google/genai');
      const genAI = new GoogleGenAI({ apiKey });
      const { contents, systemInstruction } = req.body;
      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction 
        }
      });
      res.json({ text: result.text });
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
