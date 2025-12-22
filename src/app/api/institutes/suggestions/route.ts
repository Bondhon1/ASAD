import { NextResponse } from "next/server";
import { getInstituteSuggestions } from '../../../../lib/institutes-data';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") || undefined;

    const results = getInstituteSuggestions(q, 100);

    return NextResponse.json({ suggestions: results });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
