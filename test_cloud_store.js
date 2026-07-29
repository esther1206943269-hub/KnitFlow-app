async function testCloudStore() {
  const blobId = '019fad5d-d517-7a2e-865c-07ea483c07da';
  const url = `https://jsonblob.com/api/jsonBlob/${blobId}`;
  
  try {
    console.log('1. Reading from JsonBlob...');
    const getRes = await fetch(url, { headers: { 'Accept': 'application/json' } });
    console.log('GET status:', getRes.status);
    const json = await getRes.json();
    console.log('GET content:', JSON.stringify(json));

    console.log('2. Writing test global_sync_slot...');
    const userProjectsMap = json.userProjectsMap || {};
    userProjectsMap['global_sync_slot'] = [
      { id: 'test-proj-1', name: '全量同步测试项目', type: 'grid', updatedAt: new Date().toISOString() }
    ];

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ userProjectsMap })
    });
    console.log('PUT status:', putRes.status);
    console.log('Test completed successfully!');
  } catch (e) {
    console.error('Error testing cloud store:', e);
  }
}

testCloudStore();
