export const JUGGERNAUT = 'jagsby_frontier:juggernaut';
const SHIELD_STANCE = 'jagsby_frontier:shield_stance';

export function blockGuardShield(event) {
  const {hurtEntity: guard, damageSource} = event;
  if (guard.typeId !== JUGGERNAUT || guard.getProperty(SHIELD_STANCE) !== 'raised') return;
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
