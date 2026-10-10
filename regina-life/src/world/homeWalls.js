/**
 * Wall visibility modes for home interiors. OWNED BY work package B2 (B1 ships this stub, which only stores nothing and shows everything).
 *   'walk' : full walls, ceiling and ceiling fixtures (the only mode used while walking around)
 *   'up'   : full walls, ceiling and ceiling fixtures hidden (today's overhead view of the Studio)
 *   'cut'  : partition walls and the south exterior wall at 0.9 m, door lintels hidden, ceiling hidden (the Home view of multi-room layouts)
 *   'down' : every wall hidden
 * Wall pieces carry `userData.wall = { role: 'exterior' | 'partition' | 'lintel', side: 'N' | 'S' | 'E' | 'W' | null }`.
 */
export const WALL_MODES = ['walk', 'up', 'cut', 'down'];
export function applyWallMode(parts, mode) { void parts; void mode; }
