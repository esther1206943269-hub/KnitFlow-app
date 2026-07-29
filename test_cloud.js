// Use Node.js native fetch

async function testCloudProjectsApi() {
  const url = 'https://api.restful-api.dev/objects';
  
  // 1. 先尝试获取现有用户 bin
  try {
    const resUser = await fetch(`${url}/ff8081819f7e10ae019f893c3adf1162`);
    console.log('User Bin status:', resUser.status);
    if (resUser.ok) {
      const data = await resUser.json();
      console.log('User Bin Keys:', Object.keys(data.data || {}));
    }
  } catch (e) {
    console.error('User Bin fetch error:', e.message);
  }

  // 2. 创建或测试项目存储 Bin
  try {
    const resPost = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'knitflow_global_projects_v1',
        data: {
          userProjectsMap: {}
        }
      })
    });
    const created = await resPost.json();
    console.log('Created Projects Bin ID:', created.id);
  } catch (e) {
    console.error('Projects Bin create error:', e.message);
  }
}

testCloudProjectsApi();
