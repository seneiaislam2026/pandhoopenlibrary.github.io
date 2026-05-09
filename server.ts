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
      let apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE" || apiKey === "your_api_key_here" || apiKey === "undefined") {
        apiKey = "AIzaSyC7HnIFbb2E15H15lf-MN_K463mcQoFwuA";
      }

      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      
      const { contents, systemInstruction, tools } = req.body;
      
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
      
      res.json({ 
        text,
        functionCalls,
        content
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

      let apiKey = process.env.SMS_API_KEY;
      if (!apiKey || apiKey === "undefined" || apiKey.includes("YOUR_") || apiKey.trim() === "") {
        apiKey = "T445ZnbHEELavHNv3Tdw";
      }
      
      let senderId = process.env.SMS_SENDER_ID;
      if (!senderId || senderId === "undefined" || senderId.includes("YOUR_") || senderId.trim() === "") {
        senderId = "8809617634384";
      }
      
      // bulksmsbd.net expects the senderId without the + symbol usually
      if (senderId.startsWith('+')) {
        senderId = senderId.substring(1);
      }
      
      if (!apiKey || !senderId) {
        console.error('❌ SMS Config Missing:', { hasKey: !!apiKey, hasSender: !!senderId });
        return res.status(500).json({ 
          success: false, 
          error: 'SMS API কনফিগার করা নেই। অনুগ্রহ করে Settings থেকে SMS_API_KEY এবং SMS_SENDER_ID সেট করুন।' 
        });
      }
      
      const baseURL = 'https://bulksmsbd.net/api/smsapi';
      
      console.log(`📡 Sending SMS to ${cleanNumber} via ${baseURL}...`);
      
      const url = `${baseURL}?api_key=${apiKey}&type=unicode&number=${cleanNumber}&senderid=${senderId}&message=${encodeURIComponent(message)}`;

      // Make the GET request
      const proxyResponse = await fetch(url);
      
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
        (json.message && json.message.toLowerCase().includes('success')) ||
        (json.success_message && json.success_message.toLowerCase().includes('success'));
      
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
