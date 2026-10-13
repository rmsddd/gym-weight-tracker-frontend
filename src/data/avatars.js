// Avatar drawings. The backend only stores the code (see App\Enums\Avatar), keep both lists in sync.
//
// Every avatar is a flat-vector head-and-shoulders portrait in a 64x64 viewBox, clipped to a
// circle: plain fills, no outlines, evenly lit (no shadow across the face).
// The scene (background glow, "WT" tee, headband, face) is shared and drawn by avatarMarkup();
// each character only supplies:
//   bg    [inner, outer] background colours     skin  head colour     neck  neck colour
//   back  drawn behind the body (ears, back hair, mane, spikes)
//   head  optional replacement head shape
//   front drawn over the head, under the headband and face (hair, beard, muzzle)
//   headband  false to leave the forehead bare (a hairstyle the band would hide)
//   eyes  'human' (small dark ovals), 'led' (robot screen), 'socket' (skull); default round
//   teeth true to draw a row of teeth instead of a mouth line (skeleton)
//   eye / mouth / brow  optional colours for the face (default dark)
//   tee   optional print for the shirt instead of "WT"; a ♥ in it is drawn as a red heart

const DARK = '#2B1736'

const humanEars = (skin) =>
  `<circle cx="17.2" cy="32" r="3.2" fill="${skin}"/><circle cx="46.8" cy="32" r="3.2" fill="${skin}"/>`

const roundEars = (fur, inner) =>
  `<circle cx="20" cy="18.6" r="5.6" fill="${fur}"/><circle cx="44" cy="18.6" r="5.6" fill="${fur}"/>` +
  `<circle cx="20" cy="18.6" r="2.9" fill="${inner}"/><circle cx="44" cy="18.6" r="2.9" fill="${inner}"/>`

const blush = (color) =>
  `<ellipse cx="22.4" cy="37" rx="2.7" ry="1.8" fill="${color}" opacity=".5"/><ellipse cx="41.6" cy="37" rx="2.7" ry="1.8" fill="${color}" opacity=".5"/>`

const muzzle = (fill, nose) =>
  `<ellipse cx="32" cy="38.8" rx="7.8" ry="5.7" fill="${fill}"/>` +
  `<path d="M29.3 35.1q2.7-1.5 5.4 0q-.5 2.7-2.7 2.7t-2.7-2.7z" fill="${nose}"/>` +
  `<circle cx="31.1" cy="35.5" r=".6" fill="#fff" opacity=".7"/>`

// A small hooked line, the way flat portraits hint at a nose
const nose = (color) =>
  `<path d="M32.2 32.6v3q0 1.3 1.6 1.2" fill="none" stroke="${color}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>`

export const avatars = [
  {
    code: 'athlete',
    name: 'Athlete',
    bg: ['#5EEAD4', '#0F766E'],
    skin: '#F8CFAB',
    neck: '#E9B28A',
    eyes: 'human',
    brow: '#B4521E',
    mouth: '#C2503F',
    back:
      `<path d="M43.5 19.5q14 1.5 12 20.5q-.8 6.5-5.5 9q1.5-10-6.5-16.5z" fill="#E8662A"/>` +
      `<path d="M15.6 33Q14 13 32 13T48.4 33z" fill="#E8662A"/>` +
      humanEars('#F8CFAB'),
    front:
      `<path d="M17.2 29.5Q17 15.3 32 15.3T46.8 29.5Q44.5 23.5 39 21.8Q32.5 27.5 17.2 29.5z" fill="#F0802B"/>` +
      blush('#FF7A93') +
      `<circle cx="22" cy="34.4" r=".5" fill="#D98E66"/><circle cx="23.8" cy="35.6" r=".5" fill="#D98E66"/><circle cx="40.2" cy="35.6" r=".5" fill="#D98E66"/><circle cx="42" cy="34.4" r=".5" fill="#D98E66"/>` +
      nose('#D9976F'),
  },
  {
    code: 'andrei',
    name: 'Andrei',
    bg: ['#FFD166', '#D9730B'],
    skin: '#B9764F',
    neck: '#96593A',
    eyes: 'human',
    brow: '#1E1512',
    mouth: '#F3D9C9',
    back: humanEars('#B9764F'),
    front:
      `<path d="M17.2 28.5Q17 15.3 32 15.3T46.8 28.5Q45.4 22.6 41.2 21Q32 18.8 22.8 21Q18.6 22.6 17.2 28.5z" fill="#1E1512"/>` +
      `<path d="M17.3 33Q18 47.3 32 47.3T46.7 33Q44.6 36.2 42.6 36.6Q41 44.6 32 44.6T21.4 36.6Q19.4 36.2 17.3 33z" fill="#1E1512"/>` +
      `<path d="M26.4 38.2q5.6-2.8 11.2 0q-5.6-.8-11.2 0z" fill="#1E1512"/>` +
      nose('#8F5334'),
  },
  {
    code: 'marian',
    name: 'Marian',
    bg: ['#FDA4AF', '#BE123C'],
    skin: '#9C6038',
    neck: '#7E4A28',
    eyes: 'human',
    brow: '#241812',
    mouth: '#4A1F1A',
    tee: 'I ♥ IRIS',
    headband: false,
    back:
      // a full head of hair in two lobes that rise from the middle part and fall to the sides
      `<path d="M12.8 31Q8.4 9.6 22 7.4Q29.4 6.4 32 10.4Q34.6 6.4 42 7.4Q55.6 9.6 51.2 31z" fill="#3A2A22"/>` +
      humanEars('#9C6038'),
    front:
      // middle part: the hairline starts high at the parting and sweeps down to the temples,
      // leaving the forehead open
      `<path d="M32 15.3Q17 15.3 17 31Q18.8 31.4 19.7 29.2Q21.4 21.2 32 18.2z" fill="#3A2A22"/>` +
      `<path d="M32 15.3Q47 15.3 47 31Q45.2 31.4 44.3 29.2Q42.6 21.2 32 18.2z" fill="#3A2A22"/>` +
      // the parting itself, and blond streaks combed away from it on each side
      `<path d="M32 10.6V18.2" fill="none" stroke="#1C120E" stroke-width="1" stroke-linecap="round"/>` +
      `<path d="M30.8 12.2Q24.5 11.6 19.8 18M33.2 12.2Q39.5 11.6 44.2 18M30.2 16.4Q23.6 17.4 19.8 24.6M33.8 16.4Q40.4 17.4 44.2 24.6M27 9.6Q20.6 10.4 16.6 17M37 9.6Q43.4 10.4 47.4 17" fill="none" stroke="#F4C534" stroke-width="1.3" stroke-linecap="round"/>` +
      // a small, quiet goatee: just the tip of the chin
      `<path d="M29.9 44.3Q32 43.6 34.1 44.3Q34.3 46.6 32 46.8Q29.7 46.6 29.9 44.3z" fill="#3A2A22" opacity=".8"/>` +
      nose('#7A4526'),
  },
  {
    code: 'grandpa',
    name: 'Grandpa',
    bg: ['#93C5FD', '#2B55A8'],
    skin: '#F6CDA9',
    neck: '#E5B48C',
    eyes: 'human',
    brow: '#E4E4EC',
    mouth: '#C2503F',
    back:
      `<circle cx="16.4" cy="28.5" r="4.6" fill="#EDEDF3"/><circle cx="47.6" cy="28.5" r="4.6" fill="#EDEDF3"/>` +
      `<circle cx="16" cy="34.5" r="4.4" fill="#EDEDF3"/><circle cx="48" cy="34.5" r="4.4" fill="#EDEDF3"/>`,
    front:
      blush('#FF8FA3') +
      // beard hugging the jaw, then the moustache, like the white-bearded rider in flat sets
      `<path d="M17.4 34Q18 47.4 32 47.4T46.6 34Q44.4 38.6 41.6 39.4Q38 43.4 32 43.4T22.4 39.4Q19.6 38.6 17.4 34z" fill="#EDEDF3"/>` +
      `<path d="M32 37q-4.2-2.2-9 1.4q5.2 2.8 9 .7q3.8 2.1 9-.7q-4.8-3.6-9-1.4z" fill="#FFFFFF"/>` +
      `<circle cx="26" cy="31" r="4.6" fill="#fff" fill-opacity=".18" stroke="#3B2A1E" stroke-width="1.2"/><circle cx="38" cy="31" r="4.6" fill="#fff" fill-opacity=".18" stroke="#3B2A1E" stroke-width="1.2"/>` +
      `<path d="M30.6 30.6q1.4-1 2.8 0M21.4 30.4l-3.2-1M42.6 30.4l3.2-1" fill="none" stroke="#3B2A1E" stroke-width="1.2" stroke-linecap="round"/>`,
  },
  {
    code: 'dino',
    name: 'Dino',
    bg: ['#C4A1FF', '#5B2FA8'],
    skin: '#6FCB3F',
    neck: '#57A82E',
    back: `<path d="M19.5 21l3-10 4.5 6.5 5-10.5 5 10.5 4.5-6.5 3 10z" fill="#FFC93C"/>`,
    front:
      `<ellipse cx="32" cy="39.4" rx="10.2" ry="6.2" fill="#8FDD5F"/>` +
      `<ellipse cx="29" cy="36.4" rx=".9" ry="1.3" fill="#3F8A1F"/><ellipse cx="35" cy="36.4" rx=".9" ry="1.3" fill="#3F8A1F"/>` +
      `<circle cx="19.8" cy="34.6" r="1.2" fill="#57A82E"/><circle cx="21.4" cy="37.8" r=".8" fill="#57A82E"/><circle cx="44.2" cy="34.6" r="1.2" fill="#57A82E"/><circle cx="42.6" cy="37.8" r=".8" fill="#57A82E"/>` +
      `<path d="M30.4 20.6l1.6-3 1.6 3z" fill="#FFC93C"/>`,
  },
  {
    code: 'bear',
    name: 'Bear',
    bg: ['#A7F3D0', '#1F8A5B'],
    skin: '#8A5533',
    neck: '#6E4226',
    back: roundEars('#8A5533', '#B67C54'),
    front: muzzle('#B67C54', '#3A2116'),
  },
  {
    code: 'lion',
    name: 'Lion',
    bg: ['#A5B4FC', '#3238A8'],
    skin: '#FFC24D',
    neck: '#E0A02A',
    back:
      [
        [49, 31], [45.75, 41], [37.25, 47.17], [26.75, 47.17], [18.25, 41],
        [15, 31], [18.25, 21], [26.75, 14.83], [37.25, 14.83], [45.75, 21],
      ]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.6" fill="#C8601C"/>`)
        .join('') +
      `<circle cx="32" cy="31" r="17.4" fill="#C8601C"/>` +
      `<circle cx="20.6" cy="19" r="4.4" fill="#FFC24D"/><circle cx="43.4" cy="19" r="4.4" fill="#FFC24D"/>` +
      `<circle cx="20.6" cy="19" r="2.2" fill="#E0A02A"/><circle cx="43.4" cy="19" r="2.2" fill="#E0A02A"/>`,
    front:
      muzzle('#FFF0CC', '#A8431A') +
      `<circle cx="26.6" cy="39" r=".55" fill="#C8601C"/><circle cx="27.8" cy="40.8" r=".55" fill="#C8601C"/><circle cx="37.4" cy="39" r=".55" fill="#C8601C"/><circle cx="36.2" cy="40.8" r=".55" fill="#C8601C"/>`,
  },
  {
    code: 'robot',
    name: 'Robot',
    bg: ['#FF9BCF', '#A8186F'],
    skin: '#DCE4F0',
    neck: '#97A5BD',
    eyes: 'led',
    eye: '#5FF3EC',
    mouth: '#5B6B86',
    back:
      `<path d="M32 17V9.5" fill="none" stroke="#97A5BD" stroke-width="2.2" stroke-linecap="round"/>` +
      `<circle cx="32" cy="8.4" r="3.2" fill="#FFD23F"/>` +
      `<rect x="13.4" y="26.5" width="5" height="9" rx="2" fill="#97A5BD"/><rect x="45.6" y="26.5" width="5" height="9" rx="2" fill="#97A5BD"/>`,
    head: `<rect x="17" y="16" width="30" height="30.5" rx="8.5" fill="#DCE4F0"/>`,
    front:
      `<rect x="20.3" y="25.6" width="23.4" height="11.4" rx="5.4" fill="#12293A"/>` +
      `<circle cx="21.8" cy="41.6" r="1.1" fill="#97A5BD"/><circle cx="42.2" cy="41.6" r="1.1" fill="#97A5BD"/>`,
  },
  {
    code: 'dog',
    name: 'Dog',
    bg: ['#7DD3FC', '#1D6FB0'],
    skin: '#E6B273',
    neck: '#C28F52',
    back:
      `<ellipse cx="17" cy="30.5" rx="5.2" ry="11.5" fill="#8A5A2B" transform="rotate(12 17 30.5)"/>` +
      `<ellipse cx="47" cy="30.5" rx="5.2" ry="11.5" fill="#8A5A2B" transform="rotate(-12 47 30.5)"/>`,
    front: `<ellipse cx="38.4" cy="30.6" rx="6.2" ry="6.8" fill="#C68F52"/>` + muzzle('#FBE9CC', '#3A2116'),
  },
  {
    code: 'tiger',
    name: 'Tiger',
    bg: ['#86EFAC', '#0F766E'],
    skin: '#FF9F38',
    neck: '#E08420',
    back: roundEars('#FF9F38', '#FFE3C2'),
    front:
      `<path d="M19.4 35.5q3.5-3 7-1.5q-1.5 6 2 9.5q-6 1.5-9-8z" fill="#FFF3E0"/><path d="M44.6 35.5q-3.5-3-7-1.5q1.5 6-2 9.5q6 1.5 9-8z" fill="#FFF3E0"/>` +
      muzzle('#FFF3E0', '#E0527A') +
      `<path d="M17.6 29.6l4.4 1.4M17.4 33.8l4.2.2M46.4 29.6l-4.4 1.4M46.6 33.8l-4.2.2" fill="none" stroke="#3A2116" stroke-width="1.7" stroke-linecap="round"/>`,
  },
  {
    code: 'skeleton',
    name: 'Skeleton',
    bg: ['#B8C4D6', '#3F4C63'],
    skin: '#F1EDE2',
    neck: '#DAD4C4',
    eyes: 'socket',
    eye: '#F1EDE2',
    brow: '#2B2530',
    teeth: true,
    back: '',
    // round cranium narrowing into a squarer jaw
    head: `<path d="M32 15.6c9 0 15 6.2 15 14.6c0 4.4-1.6 7.4-4 9.6v3.4c0 2.2-1.8 3.8-4 3.8H25c-2.2 0-4-1.6-4-3.8v-3.4c-2.4-2.2-4-5.2-4-9.6c0-8.4 6-14.6 15-14.6z" fill="#F1EDE2"/>`,
    front: `<path d="M32 34.8l-2 3.6q2 1 4 0z" fill="#2B2530"/>`,
  },
]

export const DEFAULT_AVATAR = 'dino'

export function findAvatar(code) {
  return avatars.find((avatar) => avatar.code === code) ?? avatars.find((a) => a.code === DEFAULT_AVATAR)
}

const line = (d, color, width) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`

const happyArcs = (color) => line('M22.8 32q3.2-4.6 6.4 0M34.8 32q3.2-4.6 6.4 0', color, 2)
const calmBrows = (color) => line('M23 26.9q3-1.5 6-.2M35 26.7q3-1.3 6 .2', color, 1.4)
const raisedBrows = (color) => line('M23 25.9q3-2 6-.6M35 25.3q3-1.4 6 .6', color, 1.4)
const angryBrows = (color) => line('M22.4 26l6.4 2.3M41.6 26l-6.4 2.3', color, 1.7)

function eyes(avatar, expression) {
  const eye = avatar.eye ?? DARK
  const brow = avatar.brow ?? DARK

  if (avatar.eyes === 'led') {
    if (expression === 'record') return happyArcs(eye)
    if (expression === 'focused') return line('M23.4 31.6h5.2M35.4 31.6h5.2', eye, 2.6)
    return `<rect x="23.6" y="28.4" width="4.8" height="5.8" rx="2.4" fill="${eye}"/><rect x="35.6" y="28.4" width="4.8" height="5.8" rx="2.4" fill="${eye}"/>`
  }

  if (avatar.eyes === 'socket') {
    const sockets = `<ellipse cx="25.8" cy="30.6" rx="4.4" ry="4.8" fill="#2B2530"/><ellipse cx="38.2" cy="30.6" rx="4.4" ry="4.8" fill="#2B2530"/>`
    if (expression === 'record') return sockets + line('M23.6 31.8q2.2-3.4 4.4 0M36 31.8q2.2-3.4 4.4 0', eye, 1.6)
    if (expression === 'focused') {
      return (
        sockets +
        `<circle cx="26.4" cy="31.4" r="1.3" fill="${eye}"/><circle cx="37.6" cy="31.4" r="1.3" fill="${eye}"/>` +
        line('M20.6 24.6l7.4 2.4M43.4 24.6l-7.4 2.4', brow, 1.8)
      )
    }
    return sockets + `<circle cx="26.2" cy="30.6" r="1.7" fill="${eye}"/><circle cx="37.8" cy="30.6" r="1.7" fill="${eye}"/>`
  }

  if (avatar.eyes === 'human') {
    if (expression === 'record') return happyArcs(eye) + raisedBrows(brow)
    const ovals =
      `<ellipse cx="26" cy="31.4" rx="1.7" ry="2.2" fill="${eye}"/><ellipse cx="38" cy="31.4" rx="1.7" ry="2.2" fill="${eye}"/>` +
      `<circle cx="26.6" cy="30.6" r=".6" fill="#fff"/><circle cx="38.6" cy="30.6" r=".6" fill="#fff"/>`
    return ovals + (expression === 'focused' ? angryBrows(brow) : calmBrows(brow))
  }

  // round: a white disc with a pupil, for the animals
  if (expression === 'record') return happyArcs(eye)
  const whites = `<circle cx="26" cy="31" r="3.1" fill="#fff"/><circle cx="38" cy="31" r="3.1" fill="#fff"/>`
  if (expression === 'focused') {
    return (
      whites +
      `<circle cx="26.6" cy="31.7" r="1.6" fill="${eye}"/><circle cx="37.4" cy="31.7" r="1.6" fill="${eye}"/>` +
      angryBrows(brow)
    )
  }
  return (
    whites +
    `<circle cx="26.4" cy="31.3" r="1.7" fill="${eye}"/><circle cx="37.6" cy="31.3" r="1.7" fill="${eye}"/>` +
    `<circle cx="27" cy="30.6" r=".6" fill="#fff"/><circle cx="38.2" cy="30.6" r=".6" fill="#fff"/>`
  )
}

function teeth(expression) {
  const gaps = (top, bottom) =>
    [28.1, 30.7, 33.3, 35.9].map((x) => `M${x} ${top}V${bottom}`).join('')

  if (expression === 'record') {
    // jaw dropped: a dark gap between two rows of teeth
    return (
      `<rect x="25.4" y="39.6" width="13.2" height="7" rx="2" fill="#2B2530"/>` +
      `<rect x="25.4" y="39.6" width="13.2" height="2.4" rx="1" fill="#fff"/><rect x="25.4" y="44.4" width="13.2" height="2.2" rx="1" fill="#fff"/>` +
      line(gaps(39.8, 41.8) + gaps(44.6, 46.4), '#2B2530', 0.7)
    )
  }
  return `<rect x="25.4" y="40" width="13.2" height="4.6" rx="1.6" fill="#fff"/>` + line(`M25.8 42.3h12.4${gaps(40.2, 44.4)}`, '#2B2530', 0.7)
}

function mouthAndExtras(avatar, expression) {
  const mouth = avatar.mouth ?? '#3A2230'
  const sweat = `<path d="M14.2 20.4q3 4.4 0 6q-3-1.6 0-6z" fill="#9BE1FF"/>`
  const star = (x, y, s) =>
    `<path d="M${x} ${y - s}q${s * 0.25} ${s * 0.75} ${s} ${s}q-${s * 0.75} ${s * 0.25}-${s} ${s}q-${s * 0.25}-${s * 0.75}-${s}-${s}q${s * 0.75}-${s * 0.25} ${s}-${s}z" fill="#FFE066"/>`
  const stars = star(11, 16, 4) + star(54, 13, 3.2) + star(53, 44, 2.4)

  if (avatar.teeth) {
    if (expression === 'focused') return teeth(expression) + sweat
    return teeth(expression) + (expression === 'record' ? stars : '')
  }

  if (expression === 'focused') return line('M28.4 40.9q3.6-1.3 7.2 0', mouth, 1.6) + sweat

  if (expression === 'record') {
    return (
      `<path d="M27.2 38.8q4.8 7.2 9.6 0z" fill="#7A1F3D"/>` +
      `<path d="M29.8 42q2.2-1.5 4.4 0q-2.2 1.9-4.4 0z" fill="#FF7A9C"/>` +
      stars
    )
  }

  return line('M28 39.8q4 3.2 8 0', mouth, 1.6)
}

// Rough advance widths of Nunito's heavy capitals, in ems: enough to centre a short print
const printWidth = (text, size) => [...text].reduce((sum, char) => sum + (char === 'I' ? 0.31 : char === ' ' ? 0.26 : 0.66), 0) * size

/**
 * What is printed on the shirt, centred on x with its baseline on y: "WT", or the avatar's own
 * `tee`, where a ♥ becomes a drawn heart. Shared by the round portrait and the full body.
 */
export function teePrint(avatar, x, y, size) {
  // An avatar's own print is the point of its shirt: white with a dark edge, so it reads at any size
  const paint = avatar.tee
    ? `font-weight="900" fill="#FFFFFF" stroke="#3B1F52" stroke-width="${(size * 0.12).toFixed(2)}" paint-order="stroke" stroke-linejoin="round"`
    : `font-weight="800" fill="#FFD1EC"`
  const text = (content, tx, anchor) =>
    `<text x="${tx.toFixed(2)}" y="${y}" text-anchor="${anchor}" font-size="${size}" ${paint} font-family="Nunito, sans-serif">${content}</text>`

  if (!avatar.tee?.includes('♥')) return text(avatar.tee ?? 'WT', x, 'middle')

  const [before, after] = avatar.tee.split('♥').map((part) => part.trim())
  const h = 0.95 * size
  const gap = 0.24 * size
  const left = x - (printWidth(before, size) + printWidth(after, size) + h + 2 * gap) / 2
  const cx = left + printWidth(before, size) + gap + h / 2
  const cy = y - 0.36 * size
  const p = (dx, dy) => `${(cx + dx * h).toFixed(2)} ${(cy + dy * h).toFixed(2)}`

  return (
    text(before, cx - h / 2 - gap, 'end') +
    `<path d="M${p(0, 0.44)}C${p(-0.62, 0.04)} ${p(-0.38, -0.54)} ${p(0, -0.2)}C${p(0.38, -0.54)} ${p(0.62, 0.04)} ${p(0, 0.44)}z" fill="#FF4D6D" stroke="#3B1F52" stroke-width="${(size * 0.12).toFixed(2)}" paint-order="stroke" stroke-linejoin="round"/>` +
    text(after, cx + h / 2 + gap, 'start')
  )
}

/**
 * Head, hair/muzzle, headband and face, in the 64x64 portrait space (head centred on 32,31).
 * `avatar.back` is not included: it has to be drawn first, behind the body. Shared by the round
 * portrait below and the full-body drawing in avatarBody.js.
 */
export function avatarHeadMarkup(avatar, expression = 'normal') {
  const head = avatar.head ?? `<ellipse cx="32" cy="31" rx="15" ry="15.4" fill="${avatar.skin}"/>`
  const headband =
    avatar.headband === false
      ? ''
      : // a knot on the side, then the band
        `<path d="M45.4 21.8l5.6-2.6-1.2 4 3.8 2.4-7.2-.2z" fill="#D11480"/>` +
        `<path d="M17.8 24.8Q32 19.2 46.2 24.8L43.7 19.5Q32 15.7 20.3 19.5z" fill="#FF3FA4"/>`

  return (
    head +
    avatar.front +
    headband +
    eyes(avatar, expression) +
    mouthAndExtras(avatar, expression)
  )
}

/**
 * The whole drawing as SVG markup for a 64x64 viewBox. `uid` must be unique per rendered avatar:
 * it namespaces the clip path and gradient ids.
 */
export function avatarMarkup(avatar, expression = 'normal', uid = 'avatar') {
  return (
    `<defs>` +
    `<clipPath id="${uid}-clip"><circle cx="32" cy="32" r="31"/></clipPath>` +
    `<radialGradient id="${uid}-bg" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${avatar.bg[0]}"/><stop offset="1" stop-color="${avatar.bg[1]}"/></radialGradient>` +
    `</defs>` +
    `<g clip-path="url(#${uid}-clip)">` +
    `<rect width="64" height="64" fill="url(#${uid}-bg)"/>` +
    `<circle cx="32" cy="30" r="24" fill="#fff" opacity=".13"/>` +
    avatar.back +
    // neck with the chin's shadow on it, then the WT tee with a round neckline
    `<rect x="27.4" y="42" width="9.2" height="10" fill="${avatar.neck}"/>` +
    `<path d="M27.4 45.6q4.6 3 9.2 0v-3.6h-9.2z" fill="#1B0F26" opacity=".14"/>` +
    `<path d="M7 67Q8 48.6 32 48.6T57 67z" fill="#6B3E8C"/>` +
    `<path d="M26.4 49Q32 55 37.6 49z" fill="${avatar.neck}"/>` +
    teePrint(avatar, 32, avatar.tee ? 59.5 : 59.8, avatar.tee ? 5.4 : 6) +
    avatarHeadMarkup(avatar, expression) +
    `</g>` +
    `<circle cx="32" cy="32" r="31" fill="none" stroke="#FFFFFF" stroke-width="2"/>`
  )
}
