import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

// This endpoint expects a JSON body: { fileName, mimeType, data: base64 }
// It will proxy the upload to Vercel Blob using VERCEL_BLOB_TOKEN and return the public URL.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { fileName, mimeType, data } = body as { fileName?: string; mimeType?: string; data?: string };
    if (!fileName || !data) return NextResponse.json({ error: 'fileName and data required' }, { status: 400 });

    const tokenEnvMap = [
      ['VERCEL_BLOB_TOKEN', process.env.VERCEL_BLOB_TOKEN],
      ['BLOB_READ_WRITE_TOKEN', process.env.BLOB_READ_WRITE_TOKEN],
      ['BLOB_TOKEN', process.env.BLOB_TOKEN],
      ['VERCEL_BLOB_READ_WRITE_TOKEN', process.env.VERCEL_BLOB_READ_WRITE_TOKEN],
    ];
    const found = tokenEnvMap.find(([, v]) => !!v);
    const blobToken = found ? found[1] : undefined;
    if (!blobToken) {
      console.error('DEBUG blob token not found in environment');
      return NextResponse.json({ error: 'Server not configured for blob uploads' }, { status: 500 });
    }
    // Do not log token or its source in production.

    // create blob entry to receive upload
    // prepare binary buffer and accurate size (bytes)
    const buffer = Buffer.from(data, 'base64');
    const size = buffer.length;

    const metaRes = await fetch('https://api.vercel.com/v1/blob', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${blobToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: fileName, size, contentType: mimeType || 'application/octet-stream' })
    });

    if (!metaRes.ok) {
      const text = await metaRes.text();
      console.error('vercel blob meta error', text);
      // Fallback: return a data URL so the client can still use the image
      const dataUrl = `data:${mimeType || 'application/octet-stream'};base64,${data}`;
      return NextResponse.json({ url: dataUrl, fallback: true, details: text });
    }

    const meta = await metaRes.json();
    const uploadUrl = meta.uploadURL || meta.upload_url || meta.uploadUrl || meta.upload_url;
    const publicUrl = meta.url || meta.publicUrl || meta.file || meta.public_url;
    if (!uploadUrl) return NextResponse.json({ error: 'Invalid blob response', details: meta }, { status: 502 });
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType || 'application/octet-stream',
        'Content-Length': String(buffer.length),
      },
      body: buffer
    });

    if (!putRes.ok) {
      const text = await putRes.text();
      console.error('vercel blob upload error', text);
      // Fallback to data URL so client can continue
      const dataUrl = `data:${mimeType || 'application/octet-stream'};base64,${data}`;
      return NextResponse.json({ url: dataUrl, fallback: true, details: text });
    }

    return NextResponse.json({ url: publicUrl || meta.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
