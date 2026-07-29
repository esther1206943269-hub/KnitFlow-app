async function checkCloudData() {
  const usersUrl = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019f893c3adf1162';
  const projectsUrl = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019fad3c49424274';

  try {
    const uRes = await fetch(usersUrl);
    const uData = await uRes.json();
    console.log('--- CLOUD USERS ---');
    console.log(JSON.stringify(uData.data ? uData.data.users : uData, null, 2));
  } catch (e) {
    console.error('Fetch users error:', e.message);
  }

  try {
    const pRes = await fetch(projectsUrl);
    const pData = await pRes.json();
    console.log('--- CLOUD PROJECTS ---');
    console.log('Projects Bin Keys:', Object.keys(pData.data ? pData.data.userProjectsMap || {} : {}));
    console.log(JSON.stringify(pData.data ? pData.data.userProjectsMap : pData, null, 2));
  } catch (e) {
    console.error('Fetch projects error:', e.message);
  }
}

checkCloudData();
