async function testMoreServices() {
  console.log('Testing jsonblob, keyvalue, etc...');

  // 1. jsonblob.com
  try {
    const res = await fetch('https://jsonblob.com/api/jsonBlob', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ users: [], userProjectsMap: {} })
    });
    console.log('jsonblob status:', res.status);
    if (res.ok) {
      const loc = res.headers.get('location');
      console.log('jsonblob location:', loc);
    }
  } catch (e) {
    console.error('jsonblob error:', e.message);
  }

  // 2. keyvalue.xyz
  try {
    const keyRes = await fetch('https://api.keyvalue.xyz/new/knitflow_sync_key', { method: 'POST' });
    console.log('keyvalue status:', keyRes.status);
    if (keyRes.ok) {
      const text = await keyRes.text();
      console.log('keyvalue key url:', text.trim());
    }
  } catch(e) {
    console.error('keyvalue error:', e.message);
  }
}

testMoreServices();
