async function testServices() {
  console.log('Testing alternative JSON Cloud Storage APIs...');
  
  // 测试 1: 创建全新的 api.restful-api.dev object
  try {
    const res = await fetch('https://api.restful-api.dev/objects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'knitflow_cloud_storage_v2',
        data: { users: [], userProjectsMap: {} }
      })
    });
    console.log('restful-api.dev status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('New restful-api Object ID:', data.id);
    } else {
      const err = await res.text();
      console.log('restful-api err:', err);
    }
  } catch (e) {
    console.error('restful-api fetch error:', e.message);
  }

  // 测试 2: npoint.io
  try {
    const res = await fetch('https://api.npoint.io', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: [], userProjectsMap: {} })
    });
    console.log('npoint status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('New npoint ID:', data.id);
    }
  } catch(e) {
    console.error('npoint fetch error:', e.message);
  }

  // 测试 3: jsonstorage.net
  try {
    const res = await fetch('https://api.jsonstorage.net/v1/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: [], userProjectsMap: {} })
    });
    console.log('jsonstorage status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('New jsonstorage URI:', data.uri);
    }
  } catch(e) {
    console.error('jsonstorage fetch error:', e.message);
  }
}

testServices();
