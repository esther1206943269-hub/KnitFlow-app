async function inspectJsonBlob() {
  const blobId = '019fad5d-d517-7a2e-865c-07ea483c07da';
  const url = `https://jsonblob.com/api/jsonBlob/${blobId}`;
  
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      console.log('JSONBLOB FULL DATA:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('HTTP STATUS:', res.status);
    }
  } catch (e) {
    console.error('Inspect error:', e);
  }
}

inspectJsonBlob();
