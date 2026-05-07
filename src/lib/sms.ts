export const sendSMS = async (number: string, message: string) => {
  try {
    if (!number || !message) return false;

    const apiUrl = (import.meta as any).env.PROD ? '/.netlify/functions/send-sms' : '/api/send-sms';
    
    // Send the request to our backend
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ number, message })
    });

    const data = await response.json();
    console.log('Backend SMS status:', data);
    return data.success;
  } catch (error) {
    console.error('Failed to send SMS via backend:', error);
    return false;
  }
};
