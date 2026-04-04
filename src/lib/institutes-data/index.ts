export type InstituteRecord = {
  name: string;
  eiin?: number | string;
  institutionType?: string;
  [key: string]: any;
};

let INSTITUTES: InstituteRecord[] | null = null;

// Lazy load institute data only when needed
function loadInstitutesData(): InstituteRecord[] {
  if (INSTITUTES !== null) return INSTITUTES;
  
  // Dynamic imports to prevent bundling in all serverless functions
  const bdCollege = require('./bd_collegeName_data.json');
  const bdMadrasha = require('./bd_madrashaName_data.json');
  const bdSchool = require('./bd_schoolName_data.json');
  const englishMedium = require('./english_medium_data.json');
  const nuUni = require('./nu_Uni_data.json');
  const privateUni = require('./private_Uni_data.json');
  const publicUni = require('./public_Uni_data.json');
  
  const allArrays: InstituteRecord[][] = [
    bdCollege as any,
    bdMadrasha as any,
    bdSchool as any,
    englishMedium as any,
    nuUni as any,
    privateUni as any,
    publicUni as any,
  ];

  // Merge into single de-duplicated list keyed by normalized name
  const map = new Map<string, InstituteRecord>();
  for (const arr of allArrays) {
    if (!Array.isArray(arr)) continue;
    for (const it of arr) {
      const name = (it?.name || '').toString().trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { name, eiin: it?.eiin, institutionType: it?.institutionType });
      }
    }
  }

  INSTITUTES = Array.from(map.values());
  return INSTITUTES;
}

export function getInstituteSuggestions(q?: string, limit = 100) {
  const institutes = loadInstitutesData();
  const needle = (q || '').trim().toLowerCase();
  if (!needle) return institutes.slice(0, limit).map((it) => ({ label: it.name.split(/\s+/)[0] || it.name, value: it.name, eiin: it.eiin, institutionType: it.institutionType }));
  const results: InstituteRecord[] = [];
  for (const it of institutes) {
    if (it.name.toLowerCase().includes(needle)) results.push(it);
    if (results.length >= limit) break;
  }
  return results.map((it) => ({ label: it.name.split(/\s+/)[0] || it.name, value: it.name, eiin: it.eiin, institutionType: it.institutionType }));
}

export default {
  get INSTITUTES() {
    return loadInstitutesData();
  },
  getInstituteSuggestions,
};
