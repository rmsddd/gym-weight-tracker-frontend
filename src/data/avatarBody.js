// Full-body version of an avatar: the same head as the round portrait (see avatars.js) on a
// cartoon body whose muscle groups grow with how often the user trains them.
//
// `levels` maps a muscle group to 0..3 (0 = untrained, 3 = three sessions or more this week):
//   chest, back, shoulders, traps, biceps, triceps, forearms, abs, legs
// Everything is drawn in a 120x184 viewBox, facing the viewer, arms hanging at the sides.

import { avatarHeadMarkup, teePrint } from './avatars.js'

const INK = '#2B1736'
const TANK = '#6B3E8C'
const TANK_LIGHT = '#8250A8'
const TANK_DARK = '#4A2A63'
const SHORTS = '#3B2A52'
const SHOE = '#F5F0F4'

export const MUSCLE_GROUPS = ['chest', 'back', 'shoulders', 'traps', 'biceps', 'triceps', 'forearms', 'abs', 'legs']

const n = (value) => Math.round(value * 100) / 100
const ellipse = (cx, cy, rx, ry) => (attrs) =>
  `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" ${attrs}/>`
const path = (d) => (attrs) => `<path d="${d}" ${attrs}/>`

// Several overlapping shapes in one flat colour read as a single silhouette (no outlines)
function silhouette(shapes, fill) {
  return shapes.map((shape) => shape(`fill="${fill}"`)).join('')
}

export function avatarBodyMarkup(avatar, levels = {}, uid = 'body', expression = 'normal') {
  const level = (group) => Math.max(0, Math.min(3, Number(levels[group]) || 0))
  const chest = level('chest')
  const back = level('back')
  const shoulders = level('shoulders')
  const traps = level('traps')
  const biceps = level('biceps')
  const triceps = level('triceps')
  const forearms = level('forearms')
  const abs = level('abs')
  const legs = level('legs')

  const skin = avatar.skin

  // Torso: lats and chest widen the shoulders, the waist stays put (the "V")
  const W = 18 + 1.6 * back + 1.1 * chest
  const WAIST = 14.5
  const edge = (y) => W - ((W - WAIST) * (y - 68)) / 42

  const arm = (side) => {
    const x = 60 + side * (W + 5.5 + 0.4 * shoulders + 0.5 * triceps + 0.6 * biceps)
    return silhouette(
      [
        ellipse(60 + side * (W + 2), 72, 5.5 + 1.3 * shoulders, 5.5 + 1.3 * shoulders), // deltoid
        ellipse(x, 86, 4.6, 11), // upper arm
        ellipse(x - side * (1.2 + 0.3 * biceps), 84, 3.2 + 1.15 * biceps, 7 + 0.5 * biceps), // biceps, inner side
        ellipse(x + side * (1.4 + 0.35 * triceps), 87, 3 + 1.1 * triceps, 7.5 + 0.5 * triceps), // triceps, outer side
        ellipse(x + side, 104, 3.8 + 0.85 * forearms, 9.5), // forearm
        ellipse(x + side, 115.5, 4.4, 4.4), // hand
      ],
      skin,
    )
  }

  const legX = (side) => 60 + side * (8 + 0.7 * legs)
  const leg = (side) =>
    silhouette(
      [
        ellipse(legX(side), 132, 6.3 + 1.25 * legs, 14), // thigh
        ellipse(legX(side), 154, 4.8 + 0.95 * legs, 11), // calf
      ],
      skin,
    ) +
    `<rect x="${n(legX(side) - 7 + side * 1.5)}" y="163.5" width="14" height="8.5" rx="4.2" fill="${SHOE}"/>` +
    `<path d="M${n(legX(side) - 3 + side * 1.5)} 166.4h6" fill="none" stroke="#E8158A" stroke-width="1.4" stroke-linecap="round"/>`

  const trapTop = 66 - 2.2 * traps
  const torso = silhouette(
    [
      path(`M55 54h10v16H55z`), // neck
      path(`M54.5 ${n(trapTop)}L${n(60 - W + 2)} 69.5H${n(60 + W - 2)}L65.5 ${n(trapTop)}z`), // traps
      path(`M${n(60 - W)} 69Q60 63 ${n(60 + W)} 69L${60 + WAIST} 110Q60 113 ${60 - WAIST} 110z`),
    ],
    skin,
  )

  const strap = 60 - W + 4.5
  const armhole = edge(83)
  const tank =
    `<path d="M${n(strap)} 68.2L51.5 67Q60 82 68.5 67L${n(120 - strap)} 68.2Q${n(60 + W - 1.5)} 76 ${n(60 + armhole)} 83L${60 + WAIST} 110Q60 113 ${60 - WAIST} 110L${n(60 - armhole)} 83Q${n(60 - W + 1.5)} 76 ${n(strap)} 68.2z" ` +
    `fill="${TANK}"/>`

  // A lighter swell under the tank with only its lower edge inked
  const pec = (side) => {
    const cx = n(60 + side * (6.2 + 0.7 * chest))
    const cy = n(81 + 0.3 * chest)
    const rx = n(5.2 + 1.3 * chest)
    const ry = n(3.6 + 0.9 * chest)
    return (
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${TANK_LIGHT}"/>` +
      `<path d="M${n(cx - rx)} ${cy}A${rx} ${ry} 0 0 0 ${n(cx + rx)} ${cy}" fill="none" stroke="${TANK_DARK}" stroke-width="1.2" stroke-linecap="round"/>`
    )
  }
  const pecs = chest > 0 ? pec(-1) + pec(1) : ''

  // An avatar with its own print keeps it on show: the abs are then inked only below it
  const printY = chest > 0 ? 98 : 92
  const absTop = avatar.tee ? printY + 2.5 : chest > 0 ? 90 : 86

  const absLines =
    abs > 0
      ? `<path d="M60 ${absTop}V108${[93.5, 99, 104.5]
          .slice(0, abs)
          .filter((y) => y > absTop)
          .map((y) => `M53.8 ${y}Q60 ${y + 1.4} 66.2 ${y}`)
          .join('')}" fill="none" stroke="${TANK_DARK}" stroke-width="1.3" stroke-linecap="round"/>`
      : ''

  const hem = legX(1) - 60 + 6.3 + 1.25 * legs + 1.4
  const shorts =
    `<path d="M${60 - WAIST - 0.6} 106.5H${60 + WAIST + 0.6}L${n(60 + hem)} 128H61.6L60 122.5L58.4 128H${n(60 - hem)}z" fill="${SHORTS}"/>` +
    `<path d="M${60 - WAIST} 110.4H${60 + WAIST}" fill="none" stroke="#E8158A" stroke-width="1.6" stroke-linecap="round"/>`

  const headTransform = 'translate(16.8 -3.85) scale(1.35)'

  return (
    `<defs><radialGradient id="${uid}-bg" cx="50%" cy="34%" r="75%"><stop offset="0" stop-color="${avatar.bg[0]}"/><stop offset="1" stop-color="${avatar.bg[1]}"/></radialGradient></defs>` +
    `<rect width="120" height="184" rx="14" fill="url(#${uid}-bg)"/>` +
    `<circle cx="60" cy="74" r="50" fill="#fff" opacity=".12"/>` +
    `<ellipse cx="60" cy="173.5" rx="34" ry="5" fill="${INK}" opacity=".3"/>` +
    `<g transform="${headTransform}">${avatar.back}</g>` +
    leg(-1) +
    leg(1) +
    arm(-1) +
    arm(1) +
    torso +
    tank +
    pecs +
    absLines +
    (abs > 0 && !avatar.tee ? '' : teePrint(avatar, 60, printY, avatar.tee ? 5.6 : 5.4)) +
    shorts +
    `<g transform="${headTransform}">${avatarHeadMarkup(avatar, expression)}</g>`
  )
}
