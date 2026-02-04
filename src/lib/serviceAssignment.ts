/**
 * Auto-assign services based on institute name
 */

const INSTITUTE_SERVICE_MAP: Record<string, string> = {
  "Viqarunnisa Noon School & College": "cmks3ivm20000kzo8vq9b5uwt",
  "Viqarunnisa Noon School and College": "cmks3ivm20000kzo8vq9b5uwt",
  "viqarunnisa noon school & college": "cmks3ivm20000kzo8vq9b5uwt",
  "viqarunnisa noon school and college": "cmks3ivm20000kzo8vq9b5uwt",
  "VIQARUNNISA NOON SCHOOL & COLLEGE": "cmks3ivm20000kzo8vq9b5uwt",
  "VIQARUNNISA NOON SCHOOL AND COLLEGE": "cmks3ivm20000kzo8vq9b5uwt",
  "Ideal School & College": "cmks3iwc70001kzo8p8w00bja",
  "Ideal School and College": "cmks3iwc70001kzo8p8w00bja",
  "ideal school & college": "cmks3iwc70001kzo8p8w00bja",
  "ideal school and college": "cmks3iwc70001kzo8p8w00bja",
  "IDEAL SCHOOL & COLLEGE": "cmks3iwc70001kzo8p8w00bja",
  "IDEAL SCHOOL AND COLLEGE": "cmks3iwc70001kzo8p8w00bja",
};

export function getServiceIdForInstitute(instituteName: string): string | null {
  if (!instituteName) return null;
  
  // Direct match
  if (INSTITUTE_SERVICE_MAP[instituteName]) {
    return INSTITUTE_SERVICE_MAP[instituteName];
  }
  
  // Case-insensitive match
  const lowerName = instituteName.toLowerCase().trim();
  for (const [key, value] of Object.entries(INSTITUTE_SERVICE_MAP)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  
  return null;
}
