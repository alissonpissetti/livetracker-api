import { haversineMeters } from '../common/geo.util';

export const COLLAPSE_NEARBY_RADIUS_M = 40;
export const COLLAPSE_NEARBY_MAX_GAP_SEC = 90;

export type CollapsibleLocation = {
  latitude: number;
  longitude: number;
  recorded_at: string;
};

export type CollapseNearbyOptions = {
  radiusM?: number;
  maxGapSec?: number;
};

function gapSecondsBetween(
  anchor: CollapsibleLocation,
  current: CollapsibleLocation,
): number {
  return (
    Math.abs(
      new Date(current.recorded_at).getTime() -
        new Date(anchor.recorded_at).getTime(),
    ) / 1000
  );
}

function isNearbyInSpaceAndTime<T extends CollapsibleLocation>(
  anchor: T,
  current: T,
  radiusM: number,
  maxGapSec: number,
): boolean {
  const distance = haversineMeters(
    anchor.latitude,
    anchor.longitude,
    current.latitude,
    current.longitude,
  );

  if (distance > radiusM) {
    return false;
  }

  return gapSecondsBetween(anchor, current) <= maxGapSec;
}

/** Funde leituras consecutivas no mesmo lugar e horário próximo (mantém a mais recente). */
export function collapseNearbyLocations<T extends CollapsibleLocation>(
  points: T[],
  options: CollapseNearbyOptions = {},
): T[] {
  const radiusM = options.radiusM ?? COLLAPSE_NEARBY_RADIUS_M;
  const maxGapSec = options.maxGapSec ?? COLLAPSE_NEARBY_MAX_GAP_SEC;

  if (points.length <= 1) {
    return points;
  }

  const collapsed: T[] = [points[0]];

  for (let index = 1; index < points.length; index += 1) {
    const anchor = collapsed[collapsed.length - 1];
    const current = points[index];

    if (isNearbyInSpaceAndTime(anchor, current, radiusM, maxGapSec)) {
      collapsed[collapsed.length - 1] = current;
    } else {
      collapsed.push(current);
    }
  }

  return collapsed;
}
