async function seedJsonBlob() {
  console.log('Seeding JsonBlob cloud database...');
  
  const usersUrl = 'https://jsonblob.com/api/jsonBlob/019fad5d-d3d0-760a-ad36-eafcd57b8d50';
  const projectsUrl = 'https://jsonblob.com/api/jsonBlob/019fad5d-d517-7a2e-865c-07ea483c07da';

  // 1. 获取现有 users 并包含 77吃掉地球
  const usersData = {
    users: [
      {
        "id": "u_1784705773774",
        "username": "77吃掉地球",
        "account": "esther1206943269@gmail.com",
        "password": "123heiwuyaSHAZI",
        "createdAt": "2026-07-22T07:36:13.774Z",
        "avatar": "avatar_preset_2.png"
      },
      {
        "id": "u_1784797367053",
        "username": "大不丢",
        "account": "13376984951",
        "password": "wj5529387",
        "createdAt": "2026-07-23T09:02:47.053Z"
      },
      {
        "id": "u_1784916025526",
        "username": "狗狗米是织咪",
        "account": "15662641811",
        "password": "Wsy201013",
        "createdAt": "2026-07-24T18:00:25.526Z"
      },
      {
        "id": "u_1784989912197",
        "username": "shushu",
        "account": "13812673157",
        "password": "shushuknitting",
        "createdAt": "2026-07-25T14:31:52.197Z"
      }
    ]
  };

  await fetch(usersUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(usersData)
  });
  console.log('Successfully seeded Cloud Users to JsonBlob!');

  // 测试从 Projects Blob 读
  const pRes = await fetch(projectsUrl, { headers: { 'Accept': 'application/json' } });
  const pData = await pRes.json();
  console.log('Projects Blob Status:', pRes.status, pData);
}

seedJsonBlob();
