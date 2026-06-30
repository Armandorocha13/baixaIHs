// Use native fetch built into Node.js

const API_BASE = 'http://localhost:3000';
const recipient = 'mandoqxo@gmail.com';

// 1x1 transparent pixel png
const dummyChartBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

async function run() {
  console.log(`Triggering report email to ${recipient}...`);
  try {
    const response = await fetch(`${API_BASE}/api/send-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipientEmail: recipient,
        chartImage: dummyChartBase64,
        cidade: 'all',
        kpis: {
          total: '389',
          sucessos: '389',
          taxa: '100.0%'
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Server returned an error');
    }
    console.log('Success! API response:', data);
  } catch (err) {
    console.error('Failed to trigger report email:', err);
  }
}

run();
