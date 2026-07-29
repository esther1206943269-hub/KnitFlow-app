async function updateAllSlotsToRealProjects() {
  const blobId = '019fad5d-d517-7a2e-865c-07ea483c07da';
  const url = `https://jsonblob.com/api/jsonBlob/${blobId}`;

  const realProjects = [
    { id: 'proj_fiona_cappa', name: 'Fiona Cappa', type: 'grid', rows: 24, cols: 20, updatedAt: new Date().toISOString() },
    { id: 'proj_cable_pattern', name: '麻花针花样', type: 'grid', rows: 20, cols: 18, updatedAt: new Date().toISOString() },
    { id: 'proj_stranded_jacquard', name: '横渡提花练习', type: 'grid', rows: 22, cols: 20, updatedAt: new Date().toISOString() }
  ];

  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    let data = { userProjectsMap: {} };
    if (res.ok) {
      data = await res.json();
    }

    const map = data.userProjectsMap || {};

    // 覆盖所有的广播与账号槽
    Object.keys(map).forEach(key => {
      map[key] = realProjects;
    });

    map['global_sync_slot'] = realProjects;
    map['latest_backup'] = realProjects;
    map['guest'] = realProjects;
    map['acc_77吃掉地球'] = realProjects;

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ userProjectsMap: map })
    });
    console.log('Successfully updated ALL JsonBlob slots to the 3 real projects! Status:', putRes.status);
  } catch (e) {
    console.error('Update error:', e);
  }
}

updateAllSlotsToRealProjects();
