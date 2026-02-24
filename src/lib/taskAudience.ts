import { prisma } from './prisma';

export type AudienceSpec = {
  all?: boolean;
  services?: string[];
  sectors?: string[];
  clubs?: string[];
  committees?: string[];
  departments?: string[];
  serviceNames?: string[];
  sectorNames?: string[];
  clubNames?: string[];
};

function uniqueClean(list: (string | null | undefined)[] = []): string[] {
  return Array.from(new Set(list.filter(Boolean) as string[]));
}

export function parseAudience(assignedGroup?: string | null): AudienceSpec {
  if (!assignedGroup) return {};
  try {
    const parsed = JSON.parse(assignedGroup);
    if (parsed && typeof parsed === 'object') return parsed as AudienceSpec;
    return {};
  } catch (e) {
    console.warn('Failed to parse assignedGroup', e);
    return {};
  }
}

async function resolveIdsFromNames(names: string[] | undefined, kind: 'service' | 'sector' | 'club'): Promise<string[]> {
  const list = uniqueClean(names || []);
  if (!list.length) return [];
  if (kind === 'service') {
    const rows = await prisma.service.findMany({
      where: { OR: list.map((n) => ({ name: { equals: n, mode: 'insensitive' } })) },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
  if (kind === 'sector') {
    const rows = await prisma.sector.findMany({
      where: { OR: list.map((n) => ({ name: { equals: n, mode: 'insensitive' } })) },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
  const rows = await prisma.club.findMany({
    where: { OR: list.map((n) => ({ name: { equals: n, mode: 'insensitive' } })) },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function resolveAudienceUserIds(audience: AudienceSpec, opts?: { includeRequesterId?: string | null; fallbackTargetIds?: string[] }) {
  const ids = new Set<string>();

  if (opts?.includeRequesterId) ids.add(opts.includeRequesterId);
  if (opts?.fallbackTargetIds?.length) opts.fallbackTargetIds.forEach((i) => ids.add(i));

  // All OFFICIAL users
  if (audience.all) {
    const users = await prisma.user.findMany({ where: { status: 'OFFICIAL' }, select: { id: true } });
    users.forEach((u) => ids.add(u.id));
    return Array.from(ids);
  }

  const serviceIds = uniqueClean([...(audience.services || [])]);
  const sectorIds = uniqueClean([...(audience.sectors || [])]);
  const clubIds = uniqueClean([...(audience.clubs || [])]);

  // Resolve by names if provided
  if (audience.serviceNames?.length) {
    const resolved = await resolveIdsFromNames(audience.serviceNames, 'service');
    resolved.forEach((i) => serviceIds.push(i));
  }
  if (audience.sectorNames?.length) {
    const resolved = await resolveIdsFromNames(audience.sectorNames, 'sector');
    resolved.forEach((i) => sectorIds.push(i));
  }
  if (audience.clubNames?.length) {
    const resolved = await resolveIdsFromNames(audience.clubNames, 'club');
    resolved.forEach((i) => clubIds.push(i));
  }

  if (serviceIds.length) {
    const profiles = await prisma.volunteerProfile.findMany({ where: { serviceId: { in: serviceIds } }, select: { userId: true } });
    profiles.forEach((p) => ids.add(p.userId));
  }

  if (sectorIds.length) {
    const profiles = await prisma.volunteerProfile.findMany({ where: { sectors: { hasSome: sectorIds } }, select: { userId: true } });
    profiles.forEach((p) => ids.add(p.userId));
  }

  if (clubIds.length) {
    const profiles = await prisma.volunteerProfile.findMany({ where: { clubs: { hasSome: clubIds } }, select: { userId: true } });
    profiles.forEach((p) => ids.add(p.userId));
  }

  if (audience.committees?.length) {
    const members = await prisma.committeeMember.findMany({ where: { committeeId: { in: audience.committees } }, select: { userId: true } });
    members.forEach((m) => ids.add(m.userId));
  }

  if (audience.departments?.length) {
    const committees = await prisma.committee.findMany({ where: { departmentId: { in: audience.departments } }, include: { members: true } });
    committees.flatMap((c) => c.members).forEach((m) => ids.add(m.userId));
  }

  return Array.from(ids);
}

export function isUserInAudience(audience: AudienceSpec, user: { id: string; status?: string | null; volunteerProfile?: { serviceId?: string | null; service?: { name?: string | null } | null; sectors?: string[]; clubs?: string[] } | null; committeeMemberships?: { committeeId: string }[] | null }, fallbackTargetIds?: string[]) {
  // "all" targets only OFFICIAL members — always false for non-OFFICIAL users
  if (audience.all) return user.status === 'OFFICIAL';

  if (fallbackTargetIds && fallbackTargetIds.includes(user.id)) return true;

  const vp = user.volunteerProfile;

  if (audience.services?.length && vp?.serviceId && audience.services.includes(vp.serviceId)) return true;
  if (audience.serviceNames?.length && vp?.service?.name) {
    const match = audience.serviceNames.some((n) => n?.toLowerCase() === vp.service?.name?.toLowerCase());
    if (match) return true;
  }

  if (audience.sectors?.length && vp?.sectors?.length) {
    const has = vp.sectors.some((s) => audience.sectors!.includes(s));
    if (has) return true;
  }
  if (audience.sectorNames?.length && vp?.sectors?.length) {
    const lower = new Set((audience.sectorNames || []).map((s) => s.toLowerCase()));
    const has = vp.sectors.some((s) => lower.has(s.toLowerCase()));
    if (has) return true;
  }

  if (audience.clubs?.length && vp?.clubs?.length) {
    const has = vp.clubs.some((c) => audience.clubs!.includes(c));
    if (has) return true;
  }
  if (audience.clubNames?.length && vp?.clubs?.length) {
    const lower = new Set((audience.clubNames || []).map((c) => c.toLowerCase()));
    const has = vp.clubs.some((c) => lower.has(c.toLowerCase()));
    if (has) return true;
  }

  if (audience.committees?.length && user.committeeMemberships?.length) {
    const has = user.committeeMemberships.some((m) => audience.committees!.includes(m.committeeId));
    if (has) return true;
  }

  return false;
}
