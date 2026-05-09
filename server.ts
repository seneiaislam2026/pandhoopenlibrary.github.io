import 'dotenv/config';
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
        return res.status(400).json({ error: "GEMINI_API_KEY is not set. Please set it in Settings." });
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const { contents, systemInstruction, tools } = req.body;
      
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          tools: tools
        }
      });

      res.json({ 
        text: response.text,
        functionCalls: response.functionCalls,
        content: response.candidates?.[0]?.content
      });
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      const msg = error?.message || String(error);
      if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
        return res.status(400).json({ error: "Invalid Gemini API key. Please check your settings." });
      }
      res.status(500).json({ error: msg });
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
        console.error('❌ SMS Config Missing:', { hasKey: !!apiKey, hasSender: !!senderId });
        return res.status(500).json({ 
          success: false, 
          error: 'SMS API কনফিগার করা নেই। অনুগ্রহ করে Settings থেকে SMS_API_KEY এবং SMS_SENDER_ID সেট করুন।' 
        });
      }
      
      // Try bulksmsbd.com (most stable) but keep .net as an option if needed
      const baseURL = 'https://bulksmsbd.com/api/smsapi';
      
      console.log(`📡 Sending SMS to ${cleanNumber} via ${baseURL}...`);
      
      const params = new URLSearchParams();
      params.append('api_key', apiKey);
      params.append('type', 'unicode');
      params.append('number', cleanNumber);
      params.append('senderid', senderId);
      params.append('message', message);

      // Make the POST request
      const proxyResponse = await fetch(baseURL, {
        method: 'POST',
        body: params,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const data = await proxyResponse.text();
      console.log('📬 SMS API raw response:', data);
      
      let json: any = {};
      try { json = JSON.parse(data); } catch(e) {}
      
      // 202 is the successful submission code for BulkSMSBD
      const isSuccess = 
        Number(json.response_code) === 202 || 
        json.success === true || 
        json.status === "success" || 
        json.response_code === "202" ||
        (json.message && json.message.toLowerCase().includes('success'));
      
      if (isSuccess) {
          console.log(`✅ SMS successfully submitted to ${cleanNumber}`);
      } else {
          console.error(`⚠️ SMS API returned an issue for ${cleanNumber}:`, data);
      }
      
      res.json({ 
        success: isSuccess, 
        data: json, 
        rawData: data,
        message: isSuccess ? 'SMS sent successfully' : (json.message || 'SMS API error')
      });
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
