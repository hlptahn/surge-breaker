/**
 * Self-contained, offline ISO/IEC 18004 QR Code Matrix Generator (Byte Mode, EC Level L).
 * Produces a 2D boolean matrix (true = dark module, false = light module) with zero external
 * dependencies and zero network requests.
 */

interface VersionSpec {
  version: number;
  totalDataCodewords: number;
  ecCodewordsPerBlock: number;
  numBlocks: number;
  alignmentCenters: number[];
  versionInfoBits?: number;
}

// ISO/IEC 18004 Table 9 & Annex E for Error Correction Level L (Versions 1..8)
const VERSION_SPECS_L: VersionSpec[] = [
  { version: 1, totalDataCodewords: 19, ecCodewordsPerBlock: 7, numBlocks: 1, alignmentCenters: [] },
  { version: 2, totalDataCodewords: 34, ecCodewordsPerBlock: 10, numBlocks: 1, alignmentCenters: [6, 18] },
  { version: 3, totalDataCodewords: 55, ecCodewordsPerBlock: 15, numBlocks: 1, alignmentCenters: [6, 22] },
  { version: 4, totalDataCodewords: 80, ecCodewordsPerBlock: 20, numBlocks: 1, alignmentCenters: [6, 26] },
  { version: 5, totalDataCodewords: 108, ecCodewordsPerBlock: 26, numBlocks: 1, alignmentCenters: [6, 30] },
  { version: 6, totalDataCodewords: 136, ecCodewordsPerBlock: 18, numBlocks: 2, alignmentCenters: [6, 34] },
  {
    version: 7,
    totalDataCodewords: 156,
    ecCodewordsPerBlock: 20,
    numBlocks: 2,
    alignmentCenters: [6, 22, 38],
    versionInfoBits: 0x07c94,
  },
  {
    version: 8,
    totalDataCodewords: 194,
    ecCodewordsPerBlock: 24,
    numBlocks: 2,
    alignmentCenters: [6, 24, 42],
    versionInfoBits: 0x085bc,
  },
];

// GF(256) log/exp tables with primitive polynomial 0x11D (x^8 + x^4 + x^3 + x^2 + 1)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function buildReedSolomonGenerator(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function computeReedSolomonRemainder(data: Uint8Array, ecDegree: number): Uint8Array {
  const gen = buildReedSolomonGenerator(ecDegree);
  const rem = new Uint8Array(ecDegree);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ rem[0];
    for (let j = 0; j < ecDegree - 1; j++) {
      rem[j] = rem[j + 1] ^ gfMul(gen[j + 1], factor);
    }
    rem[ecDegree - 1] = gfMul(gen[ecDegree], factor);
  }
  return rem;
}

function encodeUtf8Bytes(text: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text);
  }
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    bytes.push(text.charCodeAt(i) & 0xff);
  }
  return new Uint8Array(bytes);
}

function computeFormatBits(ecLevelIndicator: number, maskPattern: number): number {
  const data = ((ecLevelIndicator & 0x3) << 3) | (maskPattern & 0x7);
  let rem = data << 10;
  for (let i = 14; i >= 10; i--) {
    if ((rem >> i) & 1) {
      rem ^= 0x537 << (i - 10);
    }
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function applyMaskCondition(mask: number, row: number, col: number): boolean {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    case 7:
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

function computePenaltyScore(modules: boolean[][]): number {
  const size = modules.length;
  let penalty = 0;

  // Rule 1: 5+ consecutive modules of same color in rows and columns
  for (let r = 0; r < size; r++) {
    let runColor = modules[r][0];
    let runLen = 1;
    for (let c = 1; c < size; c++) {
      if (modules[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  for (let c = 0; c < size; c++) {
    let runColor = modules[0][c];
    let runLen = 1;
    for (let r = 1; r < size; r++) {
      if (modules[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  // Rule 2: 2x2 blocks of same color
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const val = modules[r][c];
      if (
        modules[r][c + 1] === val &&
        modules[r + 1][c] === val &&
        modules[r + 1][c + 1] === val
      ) {
        penalty += 3;
      }
    }
  }

  // Rule 4: Balance of dark and light modules
  let darkCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) darkCount++;
    }
  }
  const total = size * size;
  const k = Math.ceil((Math.abs(darkCount * 20 - total * 10) / total) - 1);
  if (k > 0) penalty += k * 10;

  return penalty;
}

/**
 * Generates a square 2D boolean matrix representing the QR Code for `text`.
 */
export function generateQrMatrix(text: string): boolean[][] {
  const payload = encodeUtf8Bytes(text);

  // Pick smallest Version (1..8) that fits payload in Byte Mode (4-bit mode + 8-bit count)
  let spec = VERSION_SPECS_L[VERSION_SPECS_L.length - 1];
  for (let i = 0; i < VERSION_SPECS_L.length; i++) {
    if (payload.length + 2 <= VERSION_SPECS_L[i].totalDataCodewords) {
      spec = VERSION_SPECS_L[i];
      break;
    }
  }

  // 1. Build bit stream: Mode 0100 (4 bits) + Byte count (8 bits) + Payload + Terminator + Padding
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  pushBits(0b0100, 4);
  pushBits(payload.length, 8);
  for (let i = 0; i < payload.length; i++) {
    pushBits(payload[i], 8);
  }

  const maxDataBits = spec.totalDataCodewords * 8;
  const terminatorLen = Math.min(4, maxDataBits - bits.length);
  pushBits(0, terminatorLen);

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const dataCodewords = new Uint8Array(spec.totalDataCodewords);
  for (let i = 0; i < bits.length / 8; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | bits[i * 8 + b];
    }
    dataCodewords[i] = byte;
  }

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  for (let i = bits.length / 8; i < spec.totalDataCodewords; i++) {
    dataCodewords[i] = padBytes[padIdx % 2];
    padIdx++;
  }

  // 2. Split into blocks, compute Reed-Solomon EC codewords, and interleave
  const blockDataLen = Math.floor(spec.totalDataCodewords / spec.numBlocks);
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];

  for (let b = 0; b < spec.numBlocks; b++) {
    const start = b * blockDataLen;
    const block = dataCodewords.slice(start, start + blockDataLen);
    dataBlocks.push(block);
    ecBlocks.push(computeReedSolomonRemainder(block, spec.ecCodewordsPerBlock));
  }

  const finalCodewords: number[] = [];
  for (let i = 0; i < blockDataLen; i++) {
    for (let b = 0; b < spec.numBlocks; b++) {
      finalCodewords.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < spec.ecCodewordsPerBlock; i++) {
    for (let b = 0; b < spec.numBlocks; b++) {
      finalCodewords.push(ecBlocks[b][i]);
    }
  }

  // 3. Initialize module grid & function-pattern reservation grid
  const size = 17 + spec.version * 4;
  const baseModules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFunctionModule = (r: number, c: number, dark: boolean) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return;
    baseModules[r][c] = dark;
    isFunction[r][c] = true;
  };

  // Finder patterns + white separators at 3 corners
  const placeFinderPattern = (topR: number, leftC: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = topR + dr;
        const c = leftC + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuterBorder = dr === -1 || dr === 7 || dc === -1 || dc === 7;
        const inRing = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunctionModule(r, c, !inOuterBorder && (inRing || inCenter));
      }
    }
  };

  placeFinderPattern(0, 0);
  placeFinderPattern(0, size - 7);
  placeFinderPattern(size - 7, 0);

  // Timing patterns along row 6 and col 6
  for (let i = 8; i < size - 8; i++) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // Alignment patterns (skipping overlap with finder corners)
  const centers = spec.alignmentCenters;
  for (let i = 0; i < centers.length; i++) {
    for (let j = 0; j < centers.length; j++) {
      const cr = centers[i];
      const cc = centers[j];
      if (
        (cr === 6 && cc === 6) ||
        (cr === 6 && cc === size - 7) ||
        (cr === size - 7 && cc === 6)
      ) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setFunctionModule(cr + dr, cc + dc, dark);
        }
      }
    }
  }

  // Dark module and reserved format information areas
  setFunctionModule(4 * spec.version + 9, 8, true);
  for (let i = 0; i <= 8; i++) {
    if (!isFunction[8][i]) setFunctionModule(8, i, false);
    if (!isFunction[i][8]) setFunctionModule(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) setFunctionModule(8, size - 1 - i, false);
    if (!isFunction[size - 1 - i][8]) setFunctionModule(size - 1 - i, 8, false);
  }

  // Optional 18-bit version info for Version >= 7
  if (spec.version >= 7 && spec.versionInfoBits !== undefined) {
    for (let i = 0; i < 18; i++) {
      const bit = ((spec.versionInfoBits >> i) & 1) !== 0;
      const a = Math.floor(i / 3);
      const b = (i % 3) + size - 11;
      setFunctionModule(a, b, bit);
      setFunctionModule(b, a, bit);
    }
  }

  // 4. Place data + EC bits in upward/downward 2-column zig-zag scan
  let bitIdx = 0;
  const totalBits = finalCodewords.length * 8;
  let upward = true;

  for (let rightCol = size - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol = 5; // skip vertical timing line
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (let dc = 0; dc < 2; dc++) {
        const c = rightCol - dc;
        if (isFunction[r][c]) continue;
        let dark = false;
        if (bitIdx < totalBits) {
          const byte = finalCodewords[bitIdx >> 3];
          dark = ((byte >> (7 - (bitIdx & 7))) & 1) !== 0;
          bitIdx++;
        }
        baseModules[r][c] = dark;
      }
    }
    upward = !upward;
  }

  // Helper to write 15-bit Format Information (EC Level L = 01)
  const writeFormatInfo = (grid: boolean[][], maskPattern: number) => {
    const formatBits = computeFormatBits(0b01, maskPattern);
    // Top-left around finder
    for (let i = 0; i <= 5; i++) grid[8][i] = ((formatBits >> i) & 1) !== 0;
    grid[8][7] = ((formatBits >> 6) & 1) !== 0;
    grid[8][8] = ((formatBits >> 7) & 1) !== 0;
    grid[7][8] = ((formatBits >> 8) & 1) !== 0;
    for (let i = 9; i < 15; i++) grid[14 - i][8] = ((formatBits >> i) & 1) !== 0;

    // Top-right and bottom-left
    for (let i = 0; i < 8; i++) {
      grid[8][size - 1 - i] = ((formatBits >> i) & 1) !== 0;
    }
    for (let i = 8; i < 15; i++) {
      grid[size - 15 + i][8] = ((formatBits >> i) & 1) !== 0;
    }
    grid[size - 8][8] = true; // fixed dark module
  };

  // 5. Evaluate all 8 masks and choose the one with the lowest penalty
  let bestGrid: boolean[][] = baseModules;
  let bestPenalty = Infinity;

  for (let mask = 0; mask < 8; mask++) {
    const candidate = baseModules.map((row) => [...row]);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!isFunction[r][c] && applyMaskCondition(mask, r, c)) {
          candidate[r][c] = !candidate[r][c];
        }
      }
    }
    writeFormatInfo(candidate, mask);
    const score = computePenaltyScore(candidate);
    if (score < bestPenalty) {
      bestPenalty = score;
      bestGrid = candidate;
    }
  }

  return bestGrid;
}
