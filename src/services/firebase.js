const FIREBASE_URL = 'https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app'

export const fbGet = async (path) => {
  const res = await fetch(`${FIREBASE_URL}/${path}.json`)
  return res.json()
}

export const fbSet = async (path, data) => {
  await fetch(`${FIREBASE_URL}/${path}.json`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

export const fbPush = async (path, data) => {
  const res = await fetch(`${FIREBASE_URL}/${path}.json`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
  return res.json()
}

export const fbDelete = async (path) => {
  await fetch(`${FIREBASE_URL}/${path}.json`, {
    method: 'DELETE'
  })
}

export const fbUpdate = async (path, data) => {
  await fetch(`${FIREBASE_URL}/${path}.json`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

