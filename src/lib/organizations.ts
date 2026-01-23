export const SERVICES = [
  { key: 'VNSC', label: 'VNSC Service - Viqarunnisa Noon School & College', auto: true },
  { key: 'ISC', label: 'ISC Service - Ideal School & College', auto: true },
  { key: 'UHSC', label: 'UHSC Service - Uttara High School & College', auto: false },
  { key: 'BBGGC', label: 'BBGGC Service - Begum Badrunnessa Government Girls College', auto: false },
  { key: 'MED', label: 'Medical Service', auto: false },
  { key: 'GENERAL', label: 'General Volunteer Service', auto: false },
  { key: 'UNI1', label: 'University Service 1', auto: false },
  { key: 'UNI2', label: 'University Service 2', auto: false },
];

export const SECTORS = [
  'Education Sector',
  'Cultural Sector',
  'Photography Sector',
  'Charity Sector',
  'Nature & Environment Sector',
  'Blood Bank Sector',
  'Medical Sector',
];

export const CLUBS = [
  'ASAD Memers Club (AMC)',
  'ASAD Sports Club (ASC)',
  'ASAD English Language Club (AELC)',
];

export function autoAssignServiceFromInstitute(instituteName?: string | null) {
  if (!instituteName) return null;
  const n = instituteName.toLowerCase();
  if (n.includes('viqarunnisa') || n.includes('viqarunnisa noon')) return 'VNSC Service - Viqarunnisa Noon School & College';
  if (n.includes('ideal school') || n.includes('ideal') || n.includes('ideal school & college')) return 'ISC Service - Ideal School & College';
  return null;
}
