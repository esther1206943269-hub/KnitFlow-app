async function seedCompleteProjects() {
  const blobId = '019fad5d-d517-7a2e-865c-07ea483c07da';
  const url = `https://jsonblob.com/api/jsonBlob/${blobId}`;

  const makeGridData = (rows, cols) => {
    return Array.from({ length: rows }, () => Array(cols).fill('k'));
  };

  const realProjects = [
    {
      id: 'proj_fiona_cappa',
      name: 'Fiona Cappa',
      type: 'grid',
      rows: 24,
      cols: 20,
      currentLoc: 1,
      updatedAt: new Date().toISOString(),
      data: makeGridData(24, 20)
    },
    {
      id: 'proj_cable_pattern',
      name: '麻花针花样',
      type: 'grid',
      rows: 20,
      cols: 18,
      currentLoc: 1,
      updatedAt: new Date().toISOString(),
      data: makeGridData(20, 18)
    },
    {
      id: 'proj_stranded_jacquard',
      name: '横渡提花练习',
      type: 'grid',
      rows: 22,
      cols: 20,
      currentLoc: 1,
      updatedAt: new Date().toISOString(),
      data: makeGridData(22, 20)
    }
  ];

  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    let map = {};
    if (res.ok) {
      const data = await res.json();
      map = data.userProjectsMap || {};
    }

    Object.keys(map).forEach(k => {
      map[k] = realProjects;
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
    console.log('Successfully seeded COMPLETE gridData projects to JsonBlob! Status:', putRes.status);
  } catch (e) {
    console.error('Seed complete projects error:', e);
  }
}

seedCompleteProjects();
