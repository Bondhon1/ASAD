import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").toLowerCase();

    const dataDir = path.join(process.cwd(), "bd-all-institutes", "data");
    const files = await fs.readdir(dataDir);

    const map = new Map<string, { name: string; eiin?: number | string; institutionType?: string }>();

    await Promise.all(
      files.map(async (file) => {
        if (!file.endsWith('.json')) return;
        try {
          const content = await fs.readFile(path.join(dataDir, file), 'utf8');
          const arr = JSON.parse(content);
          if (Array.isArray(arr)) {
            for (const item of arr) {
              const name = (item?.name || '').toString().trim();
              if (!name) continue;
              if (q && !name.toLowerCase().includes(q)) continue;
              if (!map.has(name)) {
                map.set(name, { name, eiin: item?.eiin, institutionType: item?.institutionType });
              }
            }
          }
        } catch (e) {
          // ignore malformed files
        }
      })
    );

    const suggestions = Array.from(map.values()).slice(0, 100).map((it) => {
      const firstWord = it.name.split(/\s+/)[0] || it.name;
      return { label: firstWord, value: it.name, eiin: it.eiin, institutionType: it.institutionType };
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
