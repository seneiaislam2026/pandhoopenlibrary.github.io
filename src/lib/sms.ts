export const sendSMS = async (number: string, message: string) => {
  try {
    if (!number || !message) return false;

    const apiUrl = '/api/send-sms';
    
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
    
    if (!data.success) {
      console.error('SMS Send Error:', data.message || data.error || 'Unknown error');
      // We don't want to show a toast for every auto-alert, but for manual triggers it's good.
      // However, we'll let the caller handle the toast if they want.
    }
    
    return data.success;
  } catch (error) {
    console.error('Failed to send SMS via backend:', error);
    return false;
  }
};
