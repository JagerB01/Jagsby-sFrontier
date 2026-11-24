import { recordedPower } from './village-census.js';

export const JUGGERNAUT = 'jagsby_frontier:juggernaut';
export const GUARD_HORSE = 'jagsby_frontier:guard_horse';
export const PATROL = 'jagsby_frontier:provincial_patrol';
const SHIELD_STANCE = 'jagsby_frontier:shield_stance';
export const LEADER_PROPERTY = 'jagsby_frontier:squad_leader';
const SQUAD_RADIUS = 12;
const SQUAD_SIZE = 4;
const LEADERSHIP = new Map([
  ['jagsby_frontier:lancer', 0],
  ['jagsby_frontier:horse_lancer', 0],
  [JUGGERNAUT, 1],
  ['jagsby_frontier:swordsman', 2],
  ['jagsby_frontier:arbalist', 3],
]);
const TOWN_GUARDS = new Set([...LEADERSHIP.keys()].map(id => id.replace(':', ':town_')));

const membershipKey = id => `jagsby_frontier:guard_membership:${id}`;
const squadKey = id => `jagsby_frontier:guard_squad:${id}`;

export function isFrontierGuard(entity) {
  return LEADERSHIP.has(entity.typeId) || isTownGuard(entity);
}

export function isTownGuard(entity) {
  return TOWN_GUARDS.has(entity.typeId);
}

export function townGuardLimit(village, sanctuaryLevel) {
  return Math.min(sanctuaryLevel, Math.ceil(recordedPower(village) / 2));
}

export function isJuggernaut(entity) {
  return entity.typeId === JUGGERNAUT || entity.typeId === 'jagsby_frontier:town_juggernaut';
}

function membersOf(world, id) {
  const saved = id && world.getDynamicProperty(squadKey(id));
  return saved ? JSON.parse(saved) : [];
}

export function squadLeader(roster) {
  return roster.length ? roster.reduce((first, guard) =>
    LEADERSHIP.get(guard.typeId) < LEADERSHIP.get(first.typeId) ? guard : first) : undefined;
}

function markSquadLeader(world, roster) {
  const leader = squadLeader(roster);
  if (!leader) return;
  for (const member of roster) {
    const entity = world.getEntity(member.id);
    // Set every loaded member because property changes take effect on the next tick.
    if (entity?.isValid) entity.setProperty(LEADER_PROPERTY, member.id === leader.id);
  }
}

export function joinGuardSquad(world, guard) {
  if (!guard.isValid || !LEADERSHIP.has(guard.typeId) || guard.getDynamicProperty?.(PATROL)) return;
  const ownSquad = world.getDynamicProperty(membershipKey(guard.id));
  const ownRoster = membersOf(world, ownSquad);
  if (ownRoster.some(member => member.id === guard.id)) {
    markSquadLeader(world, ownRoster);
    return;
  }

  const origin = guard.location;
  const nearby = guard.dimension.getEntities({
    families: ['frontier_guard'], location: origin, maxDistance: SQUAD_RADIUS,
  }).filter(member => member.id !== guard.id && member.isValid && LEADERSHIP.has(member.typeId)
    && !member.getDynamicProperty?.(PATROL));
  const distance = position => Math.hypot(position.x - origin.x, position.y - origin.y, position.z - origin.z);
  nearby.sort((a, b) => distance(a.location) - distance(b.location) || a.id.localeCompare(b.id));
  let squad = guard.id;
  let roster = [];
  for (const member of nearby) {
    const candidate = world.getDynamicProperty(membershipKey(member.id));
    const candidateRoster = membersOf(world, candidate);
    if (!candidateRoster.length || candidateRoster.length >= SQUAD_SIZE) continue;
    squad = candidate;
    roster = candidateRoster;
    break;
  }
  roster.push({id: guard.id, typeId: guard.typeId});
  world.setDynamicProperty(membershipKey(guard.id), squad);
  world.setDynamicProperty(squadKey(squad), JSON.stringify(roster));
  markSquadLeader(world, roster);
}

export function removeGuardFromSquad(world, deadGuard) {
  if (!LEADERSHIP.has(deadGuard.typeId)) return;
  const membership = membershipKey(deadGuard.id);
  const squad = world.getDynamicProperty(membership);
  if (!squad) return;
  const roster = membersOf(world, squad).filter(member => member.id !== deadGuard.id);
  world.setDynamicProperty(squadKey(squad), roster.length ? JSON.stringify(roster) : undefined);
  world.setDynamicProperty(membership, undefined);
  markSquadLeader(world, roster);
}

export function blockGuardShield(event) {
  const {hurtEntity: guard, damageSource} = event;
  if (!isJuggernaut(guard) || guard.getProperty(SHIELD_STANCE) !== 'raised') return;
  const {cause, damagingEntity, damagingProjectile} = damageSource;
  if (cause !== 'entityAttack' && cause !== 'projectile') return;

  const velocity = cause === 'projectile' ? damagingProjectile?.getVelocity() : undefined;
  const origin = damagingEntity?.location ?? damagingProjectile?.location;
  const flying = velocity && Math.hypot(velocity.x, velocity.z) > 0.001;
  if (!flying && !origin) return;

  const x = flying ? -velocity.x : origin.x - guard.location.x;
  const z = flying ? -velocity.z : origin.z - guard.location.z;
  const view = guard.getViewDirection();
  if (view.x * x + view.z * z > 0) event.cancel = true;
}
