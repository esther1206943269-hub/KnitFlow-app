async function checkBlobProjects() {
  try {
    const res = await fetch('https://jsonblob.com/api/jsonBlob/019fad5d-d517-7a2e-865c-07ea483c07da', {
      headers: { 'Accept': 'application/json' }
    });
    const data = await res.json();
    console.log('--- CURRENT JSONBLOB PROJECTS ---');
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Fetch error:', e.message);
  }
}

checkBlobProjects();
