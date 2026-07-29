async function verifyJsonBlob() {
  const blobUrl = 'https://jsonblob.com/api/jsonBlob/1333333333333333333'; // 创建或使用专属 blob
  
  // 1. 创建专门用于 Users 的 Blob
  const usersRes = await fetch('https://jsonblob.com/api/jsonBlob', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
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
    })
  });

  const usersBlobId = usersRes.headers.get('location').split('/').pop();
  console.log('Users Blob ID:', usersBlobId);

  // 2. 创建专门用于 Projects 的 Blob
  const projectsRes = await fetch('https://jsonblob.com/api/jsonBlob', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ userProjectsMap: {} })
  });

  const projectsBlobId = projectsRes.headers.get('location').split('/').pop();
  console.log('Projects Blob ID:', projectsBlobId);
}

verifyJsonBlob();
