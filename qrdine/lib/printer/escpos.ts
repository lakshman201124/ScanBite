// ESC/POS command constants for 80mm thermal printers (48 chars per line)
export const ESC = 0x1b;
export const GS = 0x1d;
export const LINE_WIDTH = 48;

export const CMD = {
  INIT:       [ESC, 0x40],
  BOLD_ON:    [ESC, 0x45, 0x01],
  BOLD_OFF:   [ESC, 0x45, 0x00],
  ALIGN_L:    [ESC, 0x61, 0x00],
  ALIGN_C:    [ESC, 0x61, 0x01],
  ALIGN_R:    [ESC, 0x61, 0x02],
  LF:         [0x0a],
  CUT:        [GS, 0x56, 0x41, 0x00],
  FONT_SM:    [ESC, 0x4d, 0x01],
  FONT_NM:    [ESC, 0x4d, 0x00],
};

function encodeText(text: string): number[] {
  // Replace ₹ with Rs. for thermal compatibility
  const safe = text.replace(/₹/g, "Rs.");
  return Array.from(new TextEncoder().encode(safe));
}

function pad(str: string, len: number, align: "left" | "right" | "center" = "left"): string {
  const s = str.slice(0, len);
  if (align === "right") return s.padStart(len, " ");
  if (align === "center") {
    const sp = Math.max(0, len - s.length);
    const l = Math.floor(sp / 2);
    const r = sp - l;
    return " ".repeat(l) + s + " ".repeat(r);
  }
  return s.padEnd(len, " ");
}

export function buildBuffer(segments: number[][]): Uint8Array {
  const flat = segments.flat();
  return new Uint8Array(flat);
}

export function line(text: string): number[] {
  return [...encodeText(text), ...CMD.LF];
}

export function centeredLine(text: string): number[] {
  return [...CMD.ALIGN_C, ...encodeText(text), ...CMD.LF, ...CMD.ALIGN_L];
}

export function boldLine(text: string): number[] {
  return [...CMD.BOLD_ON, ...encodeText(text), ...CMD.BOLD_OFF, ...CMD.LF];
}

export function dashes(): number[] {
  return line("-".repeat(LINE_WIDTH));
}

export function twoColLine(left: string, right: string): number[] {
  const maxLeft = LINE_WIDTH - right.length - 1;
  const l = left.slice(0, maxLeft).padEnd(maxLeft, " ");
  return line(`${l} ${right}`);
}

export function threeColLine(left: string, mid: string, right: string): number[] {
  const rw = 8;
  const mw = 4;
  const lw = LINE_WIDTH - rw - mw - 2;
  const l = left.slice(0, lw).padEnd(lw, " ");
  const m = mid.padStart(mw, " ");
  const r = right.padStart(rw, " ");
  return line(`${l} ${m} ${r}`);
}
