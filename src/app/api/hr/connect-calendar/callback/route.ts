import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    // Redirect to interviews page with error
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/hr/interviews?calendar_error=${error}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/hr/interviews?calendar_error=no_code`
    );
  }

  // Redirect to interviews page with code - let the frontend handle the exchange
  return NextResponse.redirect(
    `${process.env.NEXTAUTH_URL}/dashboard/hr/interviews?calendar_code=${code}`
  );
}
