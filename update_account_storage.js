async function updateAccountStorage() {
  const blobId = '019fad5d-d517-7a2e-865c-07ea483c07da';
  const url = `https://jsonblob.com/api/jsonBlob/${blobId}`;

  const makeGridData = (rows, cols) => Array.from({ length: rows }, () => Array(cols).fill('k'));

  const realProjects = [
    { id: 'proj_fiona_cappa', name: 'Fiona Cappa', type: 'grid', rows: 24, cols: 20, data: makeGridData(24, 20), updatedAt: new Date().toISOString() },
    { id: 'proj_cable_pattern', name: '麻花针花样', type: 'grid', rows: 20, cols: 18, data: makeGridData(20, 18), updatedAt: new Date().toISOString() },
    { id: 'proj_stranded_jacquard', name: '横渡提花练习', type: 'grid', rows: 22, cols: 20, data: makeGridData(22, 20), updatedAt: new Date().toISOString() }
  ];

  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    let map = {};
    if (res.ok) {
      const data = await res.json();
      map = data.userProjectsMap || {};
    }

    // 彻底清除废广播 key，只保留标准账号隔离槽
    delete map['global_sync_slot'];
    delete map['latest_backup'];

    // 为账号 77吃掉地球 和 guest 初始化专属空间
    map['acc_77吃掉地球'] = realProjects;
    map['acc_77'] = realProjects;
    map['guest'] = realProjects;

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ userProjectsMap: map })
    });
    console.log('Successfully updated JsonBlob with isolated account maps! Status:', putRes.status);
  } catch(e) {
    console.error('Update account storage error:', e);
  }
}

updateAccountStorage();
