export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { number, message } = JSON.parse(event.body || '{}');
    
    if (!number || !message) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
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

    const apiKey = process.env.SMS_API_KEY || "T445ZnbHEELavHNv3Tdw";
    let senderId = process.env.SMS_SENDER_ID || "8809617634384";
    
    if (senderId.startsWith('+')) senderId = senderId.substring(1);
    
    if (!apiKey || !senderId) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing SMS API configuration' })
      };
    }

    const url = `https://bulksmsbd.net/api/smsapi?api_key=${apiKey}&type=unicode&number=${cleanNumber}&senderid=${senderId}&message=${encodeURIComponent(message)}`;
    
    const response = await fetch(url);
    const data = await response.text();
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, apiResponse: data })
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
