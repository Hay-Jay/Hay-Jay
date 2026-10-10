/**
 * Fixture builders for home layouts: kind -> (g, kit, ctx) => void. OWNED BY work package B2 (B1 ships this stub).
 *
 * A builder only creates VISUALS, in LOCAL coordinates, parented to the group `g` that the framework (world/homeBuilder.js) has placed at the
 * fixture's pose with `g.rotation.y = rot * PI / 2`. It never creates colliders, interactables, ambient blobs or lights: the framework derives the
 * collider from the layout's rows, the interactables from FIXTURE_KINDS[kind].uses (positions via rotXZ) and the blob from the footprint.
 *   g    : THREE.Group at the pose.
 *   kit  : the helper kit (add, box, mat, label, ...) whose coordinates are LOCAL to `g` when called through kit.local(g).
 *   ctx  : { pose: {x, z, rot}, kind, def: FIXTURE_KINDS[kind], fixture, layout, room, rnd }
 * A test asserts Object.keys(FIXTURE_BUILDERS) equals Object.keys(FIXTURE_KINDS).
 */
export const FIXTURE_BUILDERS = {};
/** Register (or replace) the builder for a kind. */
export function registerFixtureKind(kind, fn) { FIXTURE_BUILDERS[kind] = fn; return fn; }
