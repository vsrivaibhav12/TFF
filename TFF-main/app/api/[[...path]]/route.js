import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

let cachedClient = null
async function getDb() {
  if (cachedClient) return cachedClient.db()
  const client = new MongoClient(process.env.MONGO_URL)
  await client.connect()
  cachedClient = client
  return client.db()
}

export async function GET(request, { params }) {
  const path = params?.path?.join('/') || ''
  if (path === '' || path === 'health') {
    return NextResponse.json({ ok: true, service: 'fiscal-fulcrum-api' })
  }
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function POST(request, { params }) {
  const path = params?.path?.join('/') || ''
  try {
    if (path === 'contact') {
      const body = await request.json()
      const db = await getDb()
      const doc = {
        ...body,
        createdAt: new Date(),
      }
      await db.collection('contact_submissions').insertOne(doc)
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
