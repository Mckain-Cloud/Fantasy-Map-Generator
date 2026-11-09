import fs from 'fs';

const lines = fs.readFileSync('Lamehue.map','utf8').split('\n');
const burgs = JSON.parse(lines[149]);
const spec = JSON.parse(fs.readFileSync('world-spec-1764576899640.json','utf8'));

const W = 1600, H = 1000;

console.log('Location'.padEnd(30), 'Spec(x,y)'.padEnd(16), 'Expected(px)'.padEnd(16), 'Actual(px)'.padEnd(16), 'Dist(px)', 'State');
console.log('-'.repeat(110));

for (const b of burgs) {
  if (!b || !b.name) continue;

  let specLoc = null;
  for (const loc of spec.locations) {
    if (loc.name === b.name) { specLoc = loc; break; }
  }
  if (!specLoc) {
    for (const loc of spec.locations) {
      if (b.name.includes(loc.name) || loc.name.includes(b.name)) { specLoc = loc; break; }
    }
  }

  if (specLoc) {
    const expX = specLoc.x * W;
    const expY = specLoc.y * H;
    const dist = Math.sqrt((b.x - expX)**2 + (b.y - expY)**2);
    console.log(
      b.name.padEnd(30),
      ('('+specLoc.x+','+specLoc.y+')').padEnd(16),
      ('('+expX.toFixed(0)+','+expY.toFixed(0)+')').padEnd(16),
      ('('+b.x.toFixed(0)+','+b.y.toFixed(0)+')').padEnd(16),
      dist.toFixed(0).padStart(7),
      '  st='+b.state+' spec_owner='+specLoc.owner
    );
  }
}

console.log('\nMISSING LOCATIONS (not found as burgs):');
for (const loc of spec.locations) {
  const found = burgs.some(b => b && b.name && (b.name === loc.name || b.name.includes(loc.name) || loc.name.includes(b.name)));
  if (!found) {
    console.log('  -', loc.name, `at spec(${loc.x},${loc.y})`, `expected px(${(loc.x*W).toFixed(0)},${(loc.y*H).toFixed(0)})`, 'owner='+loc.owner);
  }
}

console.log('\nSTATE ASSIGNMENT ERRORS (burg in wrong state):');
const stateIdToIndex = new Map();
spec.states.forEach((s, i) => stateIdToIndex.set(s.id, i + 1));

for (const b of burgs) {
  if (!b || !b.name) continue;
  let specLoc = spec.locations.find(l => l.name === b.name);
  if (!specLoc) specLoc = spec.locations.find(l => b.name.includes(l.name) || l.name.includes(b.name));
  if (!specLoc) continue;

  const expectedState = stateIdToIndex.get(specLoc.owner) || 0;
  if (b.state !== expectedState && specLoc.owner !== 'no_owner') {
    const actualStateName = ['Neutrals','Corgak Clan','Riverlands League','Dragonmarch Wilds'][b.state] || '?';
    console.log(`  - ${b.name}: in state ${b.state} (${actualStateName}) but spec says owner=${specLoc.owner} (state ${expectedState})`);
  }
}
