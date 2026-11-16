import { CENSUS_RADIUS } from './village-census.js';

export const CHARTER_BLOCKED_MESSAGE = '§cYou cannot place a Village Charter within 80 blocks of another Village Charter.';
export function charterKey(dimension, location) {
  return `${dimension}|${location.x},${location.y},${location.z}`;
}
export function preventClosePlacement(event, state, schedule) {
  const nearby = Object.values({...state.villages, ...state.placedCharters}).some(charter =>
    charter.dimension === event.block.dimension.id && Math.hypot(
      charter.location.x-event.block.location.x, charter.location.y-event.block.location.y,
      charter.location.z-event.block.location.z) <= CENSUS_RADIUS);
  if (!nearby) return;
  event.cancel = true;
  const player = event.player;
  if (player) schedule(() => player.sendMessage(CHARTER_BLOCKED_MESSAGE));
}
