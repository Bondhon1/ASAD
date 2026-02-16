import { NextResponse } from "next/server";
import { getInstituteSuggestions } from '../../../../lib/institutes-data';

export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache for 5 minutes - static data

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") || undefined;

    const results = getInstituteSuggestions(q, 100);

    return NextResponse.json({ suggestions: results }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'max-age=300'
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
