async function seedProjectsToJsonBlob() {
  const blobId = '019fad5d-d517-7a2e-865c-07ea483c07da';
  const url = `https://jsonblob.com/api/jsonBlob/${blobId}`;
  
  const projects = [
    { id: 'proj_fiona_cappa', name: 'Fiona Cappa', type: 'grid', rows: 24, cols: 20, updatedAt: new Date().toISOString() },
    { id: 'proj_cable_pattern', name: '麻花针花样', type: 'grid', rows: 20, cols: 18, updatedAt: new Date().toISOString() },
    { id: 'proj_stranded_jacquard', name: '横渡提花练习', type: 'grid', rows: 22, cols: 20, updatedAt: new Date().toISOString() }
  ];

  const userProjectsMap = {
    'global_sync_slot': projects,
    'latest_backup': projects,
    'acc_77吃掉地球': projects,
    'guest': projects
  };

  try {
    const putRes = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ userProjectsMap })
    });
    console.log('Seeded projects into JsonBlob with status:', putRes.status);
  } catch(e) {
    console.error('Seed error:', e);
  }
}

seedProjectsToJsonBlob();
