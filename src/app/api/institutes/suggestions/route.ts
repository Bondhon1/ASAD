import { NextResponse } from "next/server";
import { getInstituteSuggestions } from '../../../../lib/institutes-data';

// Static data — no auth, no DB. Allow CDN/edge to cache per unique query string.
export const dynamic = "force-static";
export const revalidate = 3600; // Edge cache for 1 hour

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") || undefined;

    // Return empty for very short queries — client should debounce before calling
    if (q && q.trim().length < 2) {
      return NextResponse.json({ suggestions: [] }, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }
      });
    }

    const results = getInstituteSuggestions(q, 100);

    return NextResponse.json({ suggestions: results }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'CDN-Cache-Control': 'max-age=3600'
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
