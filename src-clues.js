// clues.js — what the tech SEES when inspecting each part.
//
// Every part has a `normal` list (what it looks like when it's working right). A part that is
// involved in a fault has an extra list for that fault. The faulty part shows real symptoms;
// parts next to it can show side effects. No clue ever says "this is the problem" — the player
// has to put the pieces together.
//
// Jayson: edit these freely. Each line is one observation. Keep them to what a tech would
// notice in the field.

import { JOB } from './src-faults.js';
import { SITE } from './src-sites-index.js';

export const CLUES = {
  doorOperator: {
    normal: [
      'Operator housing is secure and the arm fasteners are tight.',
      'From 90°, the door takes about 8 seconds to close and eases into the latch.',
      'Motor runs smooth and quiet. No grinding or chatter.',
    ],
    operator: [
      'Operator housing is secure and the arm fasteners are tight.',
      'The door builds speed in the last few inches and hits the frame hard.',
      'Pulling the door open from outside takes noticeably more force than it should.',
    ],
    slow: [
      'Operator housing is secure and the arm fasteners are tight.',
      'From full open the door creeps closed. It takes a long time to latch.',
      'Opening force feels light.',
    ],
  },
  doorCloser: {
    normal: [
      'Closer body and arm are tight. No oil on the body or the floor.',
      'From 90°, the door takes about 8 seconds to close and eases into the latch.',
      'Opening force feels normal for an exterior door.',
    ],
    operator: [
      'Closer body and arm are tight. No oil on the body or the floor.',
      'The door builds speed in the last few inches and hits the frame hard.',
      'Pulling the door open takes noticeably more force than it should.',
    ],
    slow: [
      'Closer body and arm are tight. No oil on the body or the floor.',
      'From full open the door creeps closed. It takes a long time to latch.',
      'Opening force feels light.',
    ],
    leak: [
      'Oily film on the closer body, with drips on the floor underneath.',
      'Door swings shut fast and slams into the frame.',
      'Opening force feels light, almost no resistance.',
    ],
  },
  panicDevice: {
    normal: [
      'Push pad presses smoothly with even travel across its length.',
      'Latch bolt pulls all the way back when the pad is pushed.',
      'End caps and mounting screws are tight.',
    ],
    panic: [
      'Push pad feels stiff and gritty near the bottom of its travel.',
      'With the pad pushed in, the tip of the latch bolt still sticks out past the edge.',
      'Fresh drag marks on the latch edge of the door.',
    ],
  },
  electricStrike: {
    normal: [
      'Strike faceplate is clean with no unusual wear.',
      'Latch sits centered in the keeper with an even gap above and below.',
      'Keeper releases with a solid click when the access control fires.',
    ],
    strike: [
      'Strike shows visible contact marks.',
      'Latch appears to contact the upper edge of the strike.',
      'Keeper releases with a click when the access control fires.',
    ],
    sag: [
      'Strike faceplate is clean and tight on the jamb.',
      'Latch appears to contact the LOWER edge of the strike.',
      'Keeper releases with a click when the access control fires.',
    ],
    nopower: [
      'Strike faceplate is clean and the latch sits centered in the keeper.',
      'No click from the strike when a card is read.',
      'The keeper stays locked, holding the latch.',
    ],
  },
  accessPanel: {
    normal: [
      'Controller power LED is on. Board looks clean, no burn marks.',
      'Access control produces an audible click at the strike when access is granted.',
      'Wiring terminals are tight with no corrosion.',
    ],
    nopower: [
      'Controller power LED is on. The board logs every badge read.',
      'When a badge is read, the LOCK output LED on the board never lights.',
      'The small 3A blade fuse on the lock power output looks darkened.',
    ],
    reader: [
      'Controller power LED is on. Board looks clean, no burn marks.',
      'Event log: no badge reads at all since the night of the storm.',
      'Pressing UNLOCK on the controller clicks the strike open just fine.',
    ],
  },
  cardReader: {
    normal: [
      'Reader is mounted tight. Cable entry is sealed against weather.',
      'Reader beeps and flashes green when a valid badge is read.',
      'You hear the strike click at the door right after the green flash.',
    ],
    nopower: [
      'Reader is mounted tight. Cable entry is sealed against weather.',
      'Reader beeps and flashes green when a valid badge is read.',
      'No click from the door after the green flash. The reader is doing its job.',
    ],
    reader: [
      'Reader LED is dark. Holding a badge to it: no beep, no flash.',
      'The rubber seal at the cable entry is cracked. Water stains run down inside the housing.',
      'A little green corrosion on the terminal block behind it.',
    ],
  },
  doorAlignment: {
    normal: [
      'All four hinges are tight. Door is not sagging.',
      'Gaps around the door are even top to bottom.',
      'Door swings freely with no rubbing on the frame.',
    ],
    strike: [
      'All four hinges are tight. Door is not sagging.',
      'Gaps around the door are even top to bottom.',
      'Light rub mark on the strike jamb at latch height.',
    ],
    panic: [
      'All four hinges are tight. Door is not sagging.',
      'Gaps around the door are even top to bottom.',
      'Door sometimes stays caught at the latch edge instead of swinging free.',
    ],
    sag: [
      'Top hinge screws are loose. The hinge leaf moves when you lift on the door.',
      'Gap at the top on the latch side is wider than at the hinge side.',
      'Door scuffs the threshold near the latch side.',
    ],
  },
  adaPushPlate: {
    normal: [
      'Plate is mounted solid on the bollard.',
      'Every press sends the operator an open signal.',
    ],
    plate: [
      'Plate is mounted solid on the bollard.',
      'Pressing the plate: nothing. The operator never starts.',
      'Weather staining and corrosion around the edge of the plate.',
    ],
  },
  adaPushPlateInside: {
    normal: [
      'Plate is mounted solid on the panel.',
      'Every press sends the operator an open signal.',
    ],
  },
  activationSensor: {
    normal: [
      'Sensors are clean and aimed at the approach area.',
      'Door opens as soon as someone steps into the detection zone.',
    ],
  },
};

if (SITE) Object.assign(CLUES, SITE.clues);

export function cluesFor(componentId, fault = JOB.fault) {
  const c = CLUES[componentId];
  if (!c) return ['Nothing unusual.'];
  return c[fault] || c.normal;
}

// Extra readings when the player INSPECTS with a measuring tool in hand.
// Mostly these help RULE THINGS OUT (power is good, door is plumb...). A part can have
// different readings for a fault: { normal: [...], faultId: [...] }.
export const TOOL_READINGS = {
  multimeter: {
    electricStrike: {
      normal: ['Multimeter: 24.1 VDC at the strike when access is granted, 0 V at rest.'],
      nopower: ['Multimeter: 0 V at the strike, even when access is granted.'],
    },
    accessPanel: {
      normal: [
        'Multimeter: power supply output steady at 24.2 VDC.',
        'Multimeter: relay output switches cleanly when a card is read.',
      ],
      nopower: [
        'Multimeter: power supply output steady at 24.2 VDC.',
        'Multimeter: 24 V going into the lock-output fuse, 0 V coming out of it.',
      ],
    },
    cardReader: {
      normal: ['Multimeter: steady 12 VDC at the reader terminals.'],
      reader: ['Multimeter: steady 12 VDC at the reader terminals. Power is there, but the reader never answers.'],
    },
    doorOperator: [
      'Multimeter: operator supply steady, no voltage drop while the motor runs.',
    ],
    adaPushPlate: {
      normal: ['Multimeter: plate contacts close cleanly on every press.'],
      plate: ['Multimeter: no continuity through the plate switch, even pressed in.'],
    },
    adaPushPlateInside: ['Multimeter: plate contacts close cleanly on every press.'],
  },
  level: {
    doorAlignment: {
      normal: [
        'Level: hinge jamb and strike jamb are both plumb.',
        'Level: door is plumb and the head is level.',
      ],
      sag: [
        'Level: hinge jamb and strike jamb are both plumb.',
        'Level: the door itself is out of plumb, dropping toward the latch side.',
      ],
    },
    panicDevice: ['Level: device is mounted level across the door.'],
    electricStrike: ['Level: strike jamb is plumb.'],
  },
};

if (SITE) for (const [tool, byPart] of Object.entries(SITE.toolReadings || {})) {
  TOOL_READINGS[tool] = { ...(TOOL_READINGS[tool] || {}), ...byPart };
}

export function readingsFor(tool, componentId, fault = JOB.fault) {
  const r = (TOOL_READINGS[tool] || {})[componentId];
  if (!r) return null;
  return Array.isArray(r) ? r : r[fault] || r.normal;
}
