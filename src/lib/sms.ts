export const sendSMS = async (number: string, message: string) => {
  try {
    if (!number || !message) return false;

    // First try the standard /api/send-sms
    let response = await fetch('/api/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ number, message })
    });

    // If 404, it might be on Netlify without proxy rewrites working properly, so hit the function directly
    if (response.status === 404 || !response.ok) {
        try {
          const fallbackResponse = await fetch('/.netlify/functions/send-sms', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ number, message })
          });
          if (fallbackResponse.ok || fallbackResponse.status !== 404) {
             response = fallbackResponse;
          }
        } catch (fallbackErr) {
             console.log("Fallback SMS URL failed", fallbackErr);
        }
    }

    const textPayload = await response.text();
    let data;
    try {
        data = JSON.parse(textPayload);
    } catch(e) {
        console.error("Non-JSON SMS API response:", textPayload);
        return false;
    }
    
    if (!data.success) {
      console.error('SMS Send Error:', data.message || data.error || 'Unknown error', data);
    }
    
    return data.success;
  } catch (error) {
    console.error('Failed to send SMS via backend:', error);
    return false;
  }
};
