import bdCollege from './bd_collegeName_data.json';
import bdMadrasha from './bd_madrashaName_data.json';
import bdSchool from './bd_schoolName_data.json';
import englishMedium from './english_medium_data.json';
import nuUni from './nu_Uni_data.json';
import privateUni from './private_Uni_data.json';
import publicUni from './public_Uni_data.json';

export type InstituteRecord = {
  name: string;
  eiin?: number | string;
  institutionType?: string;
  [key: string]: any;
};

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

export const INSTITUTES: InstituteRecord[] = Array.from(map.values());

export function getInstituteSuggestions(q?: string, limit = 100) {
  const needle = (q || '').trim().toLowerCase();
  if (!needle) return INSTITUTES.slice(0, limit).map((it) => ({ label: it.name.split(/\s+/)[0] || it.name, value: it.name, eiin: it.eiin, institutionType: it.institutionType }));
  const results: InstituteRecord[] = [];
  for (const it of INSTITUTES) {
    if (it.name.toLowerCase().includes(needle)) results.push(it);
    if (results.length >= limit) break;
  }
  return results.map((it) => ({ label: it.name.split(/\s+/)[0] || it.name, value: it.name, eiin: it.eiin, institutionType: it.institutionType }));
}

export default {
  INSTITUTES,
  getInstituteSuggestions,
};
