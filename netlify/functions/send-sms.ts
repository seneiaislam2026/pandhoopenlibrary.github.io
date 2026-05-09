const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  try {
    let body = event.body || '{}';
    if (event.isBase64Encoded) {
      body = Buffer.from(body, 'base64').toString('utf-8');
    }
    const { number, message } = JSON.parse(body);
    
    if (!number || !message) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing number or message' })
      };
    }

    let cleanNumber = number.replace(/\D/g, '');
    if (cleanNumber.startsWith('880')) {
      cleanNumber = cleanNumber;
    } else if (cleanNumber.startsWith('0')) {
      cleanNumber = '88' + cleanNumber;
    } else if (cleanNumber.length === 10) {
      cleanNumber = '880' + cleanNumber;
    }

    let apiKey = process.env.SMS_API_KEY;
    if (!apiKey || apiKey === "undefined" || apiKey.includes("YOUR_")) {
      apiKey = "T445ZnbHEELavHNv3Tdw";
    }
    
    let senderId = process.env.SMS_SENDER_ID;
    if (!senderId || senderId === "undefined" || senderId.includes("YOUR_")) {
      senderId = "8809617634384";
    }
    
    if (senderId.startsWith('+')) senderId = senderId.substring(1);
    
    if (!apiKey || !senderId) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing SMS API configuration' })
      };
    }

    const url = `https://bulksmsbd.net/api/smsapi?api_key=${apiKey}&type=unicode&number=${cleanNumber}&senderid=${senderId}&message=${encodeURIComponent(message)}`;
    
    const response = await fetch(url);
    const rawData = await response.text();
    console.log('📬 SMS API raw response (Netlify):', rawData);

    let json: any = {};
    try { json = JSON.parse(rawData); } catch(e) {}
    
    const isSuccess = 
      Number(json.response_code) === 202 || 
      json.success === true || 
      json.status === "success" || 
      json.response_code === "202" ||
      (json.message && json.message.toLowerCase().includes('success'));

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: isSuccess, 
        data: json,
        rawData: rawData,
        message: isSuccess ? 'SMS sent successfully' : (json.message || 'SMS API error')
      })
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
