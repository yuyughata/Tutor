// Reading levels replace age groups everywhere a person can see. Ages are never shown.
export const LEVELS = [
  { id: 'sunrise', name: 'Sunrise', descriptor: 'Assisted Reader' },
  { id: 'spark', name: 'Spark', descriptor: 'Emergent Reader' },
  { id: 'seeker', name: 'Seeker', descriptor: 'Developing Reader' },
];
export const levelName = (id) => LEVELS.find((l) => l.id === id)?.name ?? id;
export const levelFull = (id) => { const l = LEVELS.find((x) => x.id === id); return l ? `${l.name} · ${l.descriptor}` : id; };
