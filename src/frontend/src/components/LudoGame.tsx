import { useCallback, useEffect, useRef, useState } from "react";
import { useReckon } from "../App";
import AdBanner from "./AdBanner";

interface LudoGameProps {
  open: boolean;
  onClose: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const COLS = 15;
const PLAYER_COLORS = ["#FF3B5C", "#00E676", "#FFD600", "#2979FF"];
const PLAYER_LIGHT = ["#ffcdd2", "#c8e6c9", "#fff9c4", "#bbdefb"];
const PLAYER_NAMES = ["Red", "Green", "Yellow", "Blue"];
const TOKENS_PER_PLAYER = 4;

// Home base squares (top-left corner of each 6x6 zone)
const HOME_ZONES: [number, number][] = [
  [0, 0],
  [0, 9],
  [9, 9],
  [9, 0],
];

// The 52-square main path (row, col)
const MAIN_PATH: [number, number][] = [
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [6, 5],
  [5, 6],
  [4, 6],
  [3, 6],
  [2, 6],
  [1, 6],
  [0, 6],
  [0, 7],
  [0, 8],
  [1, 8],
  [2, 8],
  [3, 8],
  [4, 8],
  [5, 8],
  [6, 9],
  [6, 10],
  [6, 11],
  [6, 12],
  [6, 13],
  [6, 14],
  [7, 14],
  [8, 14],
  [8, 13],
  [8, 12],
  [8, 11],
  [8, 10],
  [8, 9],
  [9, 8],
  [10, 8],
  [11, 8],
  [12, 8],
  [13, 8],
  [14, 8],
  [14, 7],
  [14, 6],
  [13, 6],
  [12, 6],
  [11, 6],
  [10, 6],
  [9, 6],
  [8, 5],
  [8, 4],
  [8, 3],
  [8, 2],
  [8, 1],
  [8, 0],
  [7, 0],
  [6, 0],
];

// Each player's home column (leading to center), 6 squares
const HOME_COLS: [number, number][][] = [
  [
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
    [7, 6],
  ], // Red
  [
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
    [6, 7],
  ], // Green
  [
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
    [7, 8],
  ], // Yellow
  [
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
    [8, 7],
  ], // Blue
];

// Path index where each player starts (enters the board)
const PLAYER_START_IDX = [0, 13, 26, 39];

// Safe path indices (cannot capture here)
const SAFE_PATH_IDXS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Home token positions (2x2 grid inside home zone)
const HOME_TOKEN_OFFSETS: [number, number][] = [
  [1.5, 1.5],
  [1.5, 3.5],
  [3.5, 1.5],
  [3.5, 3.5],
];

// ─── Types ───────────────────────────────────────────────────────────────────
interface Token {
  player: number;
  id: number;
  pos: number; // -1 = home, 0..57 = path+homecol (0..51 = main, 52..57 = home col)
  finished: boolean;
}

interface Anim {
  tokenKey: string; // `${player}_${id}`
  steps: [number, number][]; // list of [row,col] positions to visit
  stepIdx: number;
  progress: number; // 0..1 within current step
  onDone: () => void;
}

interface GameState {
  tokens: Token[];
  currentPlayer: number;
  phase: "roll" | "move" | "wait";
  diceValue: number | null;
  winner: number | null;
  message: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function initTokens(): Token[] {
  const tokens: Token[] = [];
  for (let p = 0; p < 4; p++)
    for (let i = 0; i < TOKENS_PER_PLAYER; i++)
      tokens.push({ player: p, id: i, pos: -1, finished: false });
  return tokens;
}

function getTokenPos(t: Token): [number, number] {
  if (t.pos === -1) {
    const [hr, hc] = HOME_ZONES[t.player];
    const [dr, dc] = HOME_TOKEN_OFFSETS[t.id];
    return [hr + dr, hc + dc];
  }
  if (t.finished) return [7, 7];
  const absIdx = (PLAYER_START_IDX[t.player] + t.pos) % 52;
  if (t.pos >= 52) {
    const hci = t.pos - 52;
    return HOME_COLS[t.player][Math.min(hci, 5)];
  }
  return MAIN_PATH[absIdx];
}

function canMove(t: Token, dice: number): boolean {
  if (t.finished) return false;
  if (t.pos === -1) return dice === 6;
  const newPos = t.pos + dice;
  if (newPos > 57) return false;
  return true;
}

// ─── Drawing ─────────────────────────────────────────────────────────────────
const CELL_COLORS: Record<string, string> = {};

function buildCellColors() {
  const pathSet = new Set(MAIN_PATH.map(([r, c]) => `${r},${c}`));
  const safeSet = new Set<string>();
  for (const i of SAFE_PATH_IDXS) {
    const [r, c] = MAIN_PATH[i];
    safeSet.add(`${r},${c}`);
  }

  for (let r = 0; r < COLS; r++) {
    for (let c = 0; c < COLS; c++) {
      const k = `${r},${c}`;
      // Home zones
      if (r < 6 && c < 6) {
        CELL_COLORS[k] = "#ffcdd2";
        continue;
      }
      if (r < 6 && c > 8) {
        CELL_COLORS[k] = "#c8e6c9";
        continue;
      }
      if (r > 8 && c > 8) {
        CELL_COLORS[k] = "#fff9c4";
        continue;
      }
      if (r > 8 && c < 6) {
        CELL_COLORS[k] = "#bbdefb";
        continue;
      }
      // Center
      if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
        CELL_COLORS[k] = "#f3f3f3";
        continue;
      }
      // Home columns
      const hcR = HOME_COLS[0].some(([hr, hc]) => hr === r && hc === c);
      if (hcR) {
        CELL_COLORS[k] = "#ef9a9a";
        continue;
      }
      const hcG = HOME_COLS[1].some(([hr, hc]) => hr === r && hc === c);
      if (hcG) {
        CELL_COLORS[k] = "#a5d6a7";
        continue;
      }
      const hcY = HOME_COLS[2].some(([hr, hc]) => hr === r && hc === c);
      if (hcY) {
        CELL_COLORS[k] = "#fff176";
        continue;
      }
      const hcB = HOME_COLS[3].some(([hr, hc]) => hr === r && hc === c);
      if (hcB) {
        CELL_COLORS[k] = "#90caf9";
        continue;
      }
      // Safe squares
      if (safeSet.has(k)) {
        CELL_COLORS[k] = "#e8f5e9";
        continue;
      }
      // Path
      if (pathSet.has(k)) {
        CELL_COLORS[k] = "#ffffff";
        continue;
      }
      CELL_COLORS[k] = "#eeeeee";
    }
  }
}
buildCellColors();

function drawBoard(ctx: CanvasRenderingContext2D, sz: number) {
  const cell = sz / COLS;

  // Background
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, sz, sz);

  // Grid cells
  for (let r = 0; r < COLS; r++) {
    for (let c = 0; c < COLS; c++) {
      const col = CELL_COLORS[`${r},${c}`] ?? "#eee";
      ctx.fillStyle = col;
      ctx.fillRect(c * cell + 1, r * cell + 1, cell - 2, cell - 2);
    }
  }

  // Home zone inner squares (colored circles)
  const homeInner = [
    { p: 0, r: 1, c: 1, w: 4, h: 4, color: PLAYER_COLORS[0] },
    { p: 1, r: 1, c: 10, w: 4, h: 4, color: PLAYER_COLORS[1] },
    { p: 2, r: 10, c: 10, w: 4, h: 4, color: PLAYER_COLORS[2] },
    { p: 3, r: 10, c: 1, w: 4, h: 4, color: PLAYER_COLORS[3] },
  ];
  for (const { r, c, w, h, color } of homeInner) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(c * cell + 4, r * cell + 4, w * cell - 8, h * cell - 8, 8);
    ctx.fill();
    // white inner circle
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.roundRect(
      c * cell + 12,
      r * cell + 12,
      w * cell - 24,
      h * cell - 24,
      6,
    );
    ctx.fill();
  }

  // Safe star markers
  for (const i of SAFE_PATH_IDXS) {
    const [sr, sc] = MAIN_PATH[i];
    drawStar(
      ctx,
      sc * cell + cell / 2,
      sr * cell + cell / 2,
      cell * 0.28,
      cell * 0.14,
      5,
    );
  }

  // Center arrows (triangles pointing to center)
  const cx = 7.5 * cell;
  const cy = 7.5 * cell;
  const tr = cell * 1.2;
  const arrows = [
    { angle: 0, color: PLAYER_COLORS[0] }, // Red from left
    { angle: 90, color: PLAYER_COLORS[1] }, // Green from top
    { angle: 180, color: PLAYER_COLORS[2] }, // Yellow from right
    { angle: 270, color: PLAYER_COLORS[3] }, // Blue from bottom
  ];
  for (const { angle, color } of arrows) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -tr);
    ctx.lineTo(tr * 0.6, 0);
    ctx.lineTo(-tr * 0.6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Grid lines
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, sz);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cell);
    ctx.lineTo(sz, i * cell);
    ctx.stroke();
  }

  // Border
  ctx.strokeStyle = "#37474f";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, sz - 2, sz - 2);
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points: number,
) {
  ctx.save();
  ctx.fillStyle = "rgba(255,200,0,0.7)";
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / points - Math.PI / 2;
    i === 0
      ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
      : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTokens(
  ctx: CanvasRenderingContext2D,
  sz: number,
  tokens: Token[],
  anim: Anim | null,
  selected: string | null,
  movable: string[],
  pulse: number,
) {
  const cell = sz / COLS;
  const r = cell * 0.38;

  // Group tokens by cell to offset overlapping
  const cellGroups: Record<string, Token[]> = {};
  for (const t of tokens) {
    if (t.finished) continue;
    let animPos: [number, number] | null = null;
    const key = `${t.player}_${t.id}`;
    if (anim && anim.tokenKey === key) {
      const cur = anim.steps[anim.stepIdx];
      const nxt = anim.steps[anim.stepIdx + 1] ?? cur;
      const pr = anim.progress;
      animPos = [
        cur[0] + (nxt[0] - cur[0]) * pr,
        cur[1] + (nxt[1] - cur[1]) * pr,
      ];
    }
    const [tr, tc] = animPos ?? getTokenPos(t);
    const gk = `${Math.round(tr * 10) / 10},${Math.round(tc * 10) / 10}`;
    if (!cellGroups[gk]) cellGroups[gk] = [];
    cellGroups[gk].push(t);
  }

  for (const group of Object.values(cellGroups)) {
    for (const [gi, t] of group.entries()) {
      const key = `${t.player}_${t.id}`;
      let animPos: [number, number] | null = null;
      if (anim && anim.tokenKey === key) {
        const cur = anim.steps[anim.stepIdx];
        const nxt = anim.steps[anim.stepIdx + 1] ?? cur;
        const pr = anim.progress;
        animPos = [
          cur[0] + (nxt[0] - cur[0]) * pr,
          cur[1] + (nxt[1] - cur[1]) * pr,
        ];
      }
      const [tr, tc] = animPos ?? getTokenPos(t);

      const offsets = [
        [-0.18, -0.18],
        [0.18, -0.18],
        [-0.18, 0.18],
        [0.18, 0.18],
      ];
      const [or, oc] = group.length > 1 ? offsets[gi] : [0, 0];
      const px = (tc + 0.5 + oc) * cell;
      const py = (tr + 0.5 + or) * cell;
      const baseR = group.length > 1 ? r * 0.72 : r;

      const isMovable = movable.includes(key);
      const isSel = selected === key;
      const col = PLAYER_COLORS[t.player];

      // Pulse scale for movable tokens
      const pulseScale = isMovable
        ? 1.0 + 0.15 * (0.5 + 0.5 * Math.sin(pulse * 4))
        : 1.0;
      const tokenR = baseR * pulseScale;

      ctx.save();

      // Drop shadow for all tokens
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(0,0,0,0.8)";

      // Strong neon glow for movable tokens
      if (isMovable) {
        const glow = 0.5 + 0.5 * Math.sin(pulse * 4);
        ctx.shadowColor = col;
        ctx.shadowBlur = 25;
        // Outer glow ring
        ctx.beginPath();
        ctx.arc(px, py, tokenR + 5 + glow * 3, 0, Math.PI * 2);
        ctx.strokeStyle = `${col}b3`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.shadowBlur = 25;
        ctx.shadowColor = col;
      }

      // Selected outer yellow ring
      if (isSel) {
        ctx.beginPath();
        ctx.arc(px, py, tokenR + 5, 0, Math.PI * 2);
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 4;
        ctx.shadowColor = "#FFD700";
        ctx.shadowBlur = 15;
        ctx.stroke();
      }

      // 3D radial gradient fill
      const grad = ctx.createRadialGradient(
        px - tokenR * 0.3,
        py - tokenR * 0.3,
        tokenR * 0.05,
        px,
        py,
        tokenR,
      );
      // Lighten color for highlight
      grad.addColorStop(0, "rgba(255,255,255,0.9)");
      grad.addColorStop(0.3, col);
      grad.addColorStop(1, "rgba(0,0,0,0.6)");

      ctx.beginPath();
      ctx.arc(px, py, tokenR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // White border (always thick)
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.shadowBlur = 4;
      ctx.shadowColor = "rgba(255,255,255,0.5)";
      ctx.stroke();

      // Player number inside token
      const playerNum = t.player + 1;
      const fontSize = Math.round(tokenR * 0.9);
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowBlur = 3;
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.fillText(String(playerNum), px, py + 1);

      ctx.restore();
    }
  }
}

function drawDice(
  ctx: CanvasRenderingContext2D,
  value: number | null,
  rolling: boolean,
  x: number,
  y: number,
  sz: number,
  canRoll: boolean,
  pulse: number,
) {
  ctx.save();
  const r = 10;
  // Glow
  if (canRoll) {
    const g = 0.5 + 0.5 * Math.sin(pulse * 3);
    ctx.shadowColor = "#a855f7";
    ctx.shadowBlur = 15 + g * 10;
  }
  ctx.fillStyle = rolling ? "#ede9fe" : canRoll ? "#f5f3ff" : "#ccc";
  ctx.beginPath();
  ctx.roundRect(x, y, sz, sz, r);
  ctx.fill();
  ctx.strokeStyle = canRoll ? "#7c3aed" : "#999";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  if (value === null) {
    ctx.fillStyle = "#999";
    ctx.font = `bold ${sz * 0.4}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", x + sz / 2, y + sz / 2);
    return;
  }

  const dotColor = "#1a0a2e";
  const dot = (dx: number, dy: number) => {
    ctx.beginPath();
    ctx.arc(x + dx * sz, y + dy * sz, sz * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.fill();
  };

  const layouts: [number, number][][] = [
    [[0.5, 0.5]],
    [
      [0.28, 0.28],
      [0.72, 0.72],
    ],
    [
      [0.28, 0.28],
      [0.5, 0.5],
      [0.72, 0.72],
    ],
    [
      [0.28, 0.28],
      [0.72, 0.28],
      [0.28, 0.72],
      [0.72, 0.72],
    ],
    [
      [0.28, 0.28],
      [0.72, 0.28],
      [0.5, 0.5],
      [0.28, 0.72],
      [0.72, 0.72],
    ],
    [
      [0.28, 0.25],
      [0.72, 0.25],
      [0.28, 0.5],
      [0.72, 0.5],
      [0.28, 0.75],
      [0.72, 0.75],
    ],
  ];
  for (const [dx, dy] of layouts[value - 1] ?? []) {
    dot(dx, dy);
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LudoGame({ open, onClose }: LudoGameProps) {
  const { currentUser } = useReckon();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>({
    tokens: initTokens(),
    currentPlayer: 0,
    phase: "roll",
    diceValue: null,
    winner: null,
    message: "Red's turn — Roll the dice!",
  });
  const animRef = useRef<Anim | null>(null);
  const pulseRef = useRef(0);
  const rafRef = useRef<number>(0);
  const selectedRef = useRef<string | null>(null);
  const movableRef = useRef<string[]>([]);
  const confettiRef = useRef<
    {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      life: number;
    }[]
  >([]);
  const diceRollRef = useRef<{
    frames: number;
    left: number;
    target: number;
    onDone: (v: number) => void;
  } | null>(null);
  const diceDisplayRef = useRef<number | null>(null);
  const soundOnRef = useRef(true);
  const [, forceRender] = useState(0);
  const rerender = () => forceRender((n) => n + 1);
  const [soundOn, setSoundOn] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Expose currentUser to satisfy the import (not used in game logic)
  void currentUser;

  const playSound = useCallback((type: "roll" | "move" | "capture" | "win") => {
    if (!soundOnRef.current) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const beep = (freq: number, dur: number, delay = 0) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g);
        g.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        g.gain.setValueAtTime(0.12, ctx.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + delay + dur,
        );
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + dur);
      };
      if (type === "roll") {
        beep(300, 0.08);
        beep(400, 0.08, 0.1);
        beep(500, 0.1, 0.2);
      } else if (type === "move") {
        beep(660, 0.1);
      } else if (type === "capture") {
        beep(220, 0.15);
        beep(180, 0.2, 0.15);
      } else if (type === "win") {
        for (const [i, f] of [880, 1100, 1320, 1540].entries()) {
          beep(f, 0.25, i * 0.2);
        }
      }
    } catch {}
  }, []);

  const spawnConfetti = useCallback((cx: number, cy: number) => {
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      confettiRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color: PLAYER_COLORS[Math.floor(Math.random() * 4)],
        life: 1,
      });
    }
  }, []);

  const getMovableTokens = useCallback(
    (player: number, dice: number): Token[] => {
      return stateRef.current.tokens.filter(
        (t) => t.player === player && canMove(t, dice),
      );
    },
    [],
  );

  const getMovableKeys = useCallback(
    (player: number, dice: number): string[] => {
      return getMovableTokens(player, dice).map((t) => `${t.player}_${t.id}`);
    },
    [getMovableTokens],
  );

  const applyMove = useCallback(
    (tokenKey: string, dice: number) => {
      const gs = stateRef.current;
      const [ps, is] = tokenKey.split("_").map(Number);
      const token = gs.tokens.find((t) => t.player === ps && t.id === is);
      if (!token) return;

      const steps = token.pos === -1 ? 1 : dice;
      const newPos = token.pos === -1 ? 0 : token.pos + dice;

      // Build animation path
      const animPath: [number, number][] = [getTokenPos(token)];
      if (token.pos === -1) {
        animPath.push(MAIN_PATH[PLAYER_START_IDX[token.player]]);
      } else {
        for (let s = 1; s <= steps; s++) {
          const p = token.pos + s;
          const absIdx = (PLAYER_START_IDX[token.player] + p) % 52;
          if (p >= 52) {
            const hci = p - 52;
            animPath.push(HOME_COLS[token.player][Math.min(hci, 5)]);
          } else {
            animPath.push(MAIN_PATH[absIdx]);
          }
        }
      }

      selectedRef.current = null;
      movableRef.current = [];
      gs.phase = "wait";

      animRef.current = {
        tokenKey,
        steps: animPath,
        stepIdx: 0,
        progress: 0,
        onDone: () => {
          animRef.current = null;
          const gs2 = stateRef.current;
          // Update token position
          token.pos = newPos;
          if (newPos >= 57) {
            token.finished = true;
            token.pos = 57;
          }

          // Check for captures (only on main path, not home col, not safe)
          let captured = false;
          if (newPos < 52 && newPos >= 0 && !token.finished) {
            const landAbsIdx = (PLAYER_START_IDX[token.player] + newPos) % 52;
            const isSafe = SAFE_PATH_IDXS.has(landAbsIdx);
            if (!isSafe) {
              for (const other of gs2.tokens) {
                if (
                  other.player === token.player ||
                  other.finished ||
                  other.pos < 0
                )
                  continue;
                if (other.pos >= 52) continue; // in home col
                const otherAbsIdx =
                  (PLAYER_START_IDX[other.player] + other.pos) % 52;
                if (otherAbsIdx === landAbsIdx) {
                  other.pos = -1; // send home
                  captured = true;
                  playSound("capture");
                }
              }
            }
          }

          // Check win
          const playerTokens = gs2.tokens.filter(
            (t) => t.player === token.player,
          );
          const allFinished = playerTokens.every((t) => t.finished);
          if (allFinished) {
            gs2.winner = token.player;
            gs2.phase = "wait";
            gs2.message = `🏆 ${PLAYER_NAMES[token.player]} wins!`;
            playSound("win");
            const canvas = canvasRef.current;
            if (canvas) spawnConfetti(canvas.width / 2, canvas.height / 2);
            return;
          }

          // Extra turn on 6
          if (dice === 6 && !captured) {
            gs2.phase = "roll";
            gs2.message = `${PLAYER_NAMES[token.player]} rolled 6 — roll again!`;
            if (token.player !== 0) {
              setTimeout(() => aiTurn(token.player), 900);
            }
          } else {
            // Next player
            const nextPlayer = (token.player + 1) % 4;
            gs2.currentPlayer = nextPlayer;
            gs2.diceValue = null;
            gs2.phase = "roll";
            gs2.message = `${PLAYER_NAMES[nextPlayer]}'s turn — Roll the dice!`;
            if (nextPlayer !== 0) {
              setTimeout(() => aiTurn(nextPlayer), 700);
            }
          }
        },
      };
      playSound("move");
    },
    [playSound, spawnConfetti],
  );

  const rollDiceFor = useCallback(
    (_player: number, onResult: (val: number) => void) => {
      playSound("roll");
      const target = Math.floor(Math.random() * 6) + 1;
      diceRollRef.current = {
        frames: 12,
        left: 12,
        target,
        onDone: onResult,
      };
    },
    [playSound],
  );

  const aiTurn = useCallback(
    (player: number) => {
      const gs = stateRef.current;
      if (gs.winner !== null || gs.currentPlayer !== player) return;
      gs.phase = "wait";
      gs.message = `${PLAYER_NAMES[player]} is thinking...`;

      setTimeout(() => {
        if (stateRef.current.currentPlayer !== player) return;
        rollDiceFor(player, (dice) => {
          stateRef.current.diceValue = dice;
          const movable = getMovableTokens(player, dice);
          if (movable.length === 0) {
            const nextPlayer = (player + 1) % 4;
            stateRef.current.currentPlayer = nextPlayer;
            stateRef.current.diceValue = null;
            stateRef.current.phase = "roll";
            stateRef.current.message = `${PLAYER_NAMES[nextPlayer]}'s turn — Roll the dice!`;
            if (nextPlayer !== 0) setTimeout(() => aiTurn(nextPlayer), 700);
            return;
          }
          // AI strategy: prefer captures, else prefer most advanced token
          let best = movable[0];
          for (const t of movable) {
            // Try to capture
            const newPos = t.pos === -1 ? 0 : t.pos + dice;
            if (newPos < 52) {
              const absIdx = (PLAYER_START_IDX[t.player] + newPos) % 52;
              const canCapture = stateRef.current.tokens.some(
                (other) =>
                  other.player !== player &&
                  !other.finished &&
                  other.pos >= 0 &&
                  other.pos < 52 &&
                  (PLAYER_START_IDX[other.player] + other.pos) % 52 === absIdx,
              );
              if (canCapture) {
                best = t;
                break;
              }
            }
            // Prefer entering if possible
            if (t.pos === -1 && dice === 6) {
              best = t;
              break;
            }
            // Prefer most advanced
            if (t.pos > best.pos) best = t;
          }
          setTimeout(() => {
            applyMove(`${best.player}_${best.id}`, dice);
          }, 600);
        });
      }, 600);
    },
    [rollDiceFor, getMovableTokens, applyMove],
  );

  // Canvas click handler
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const gs = stateRef.current;
      if (
        !gameStarted ||
        gs.winner !== null ||
        gs.currentPlayer !== 0 ||
        gs.phase !== "move" ||
        animRef.current
      )
        return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      const cell = canvas.width / COLS;

      // Check if clicked a movable token
      const tokens = gs.tokens.filter((t) => t.player === 0 && !t.finished);
      let clicked: Token | null = null;
      for (const t of tokens) {
        const [tr, tc] = getTokenPos(t);
        const px = (tc + 0.5) * cell;
        const py = (tr + 0.5) * cell;
        const dist = Math.hypot(mx - px, my - py);
        if (dist < cell * 0.45) {
          clicked = t;
          break;
        }
      }
      if (!clicked) return;
      const key = `${clicked.player}_${clicked.id}`;
      if (!movableRef.current.includes(key)) return;
      applyMove(key, gs.diceValue!);
    },
    [gameStarted, applyMove],
  );

  // Roll button handler
  const handleRoll = useCallback(() => {
    const gs = stateRef.current;
    if (
      !gameStarted ||
      gs.currentPlayer !== 0 ||
      gs.phase !== "roll" ||
      animRef.current ||
      gs.winner !== null
    )
      return;
    gs.phase = "wait";
    rollDiceFor(0, (dice) => {
      gs.diceValue = dice;
      const movable = getMovableKeys(0, dice);
      if (movable.length === 0) {
        const nextPlayer = 1;
        gs.currentPlayer = nextPlayer;
        gs.diceValue = null;
        gs.phase = "roll";
        gs.message = `No moves for Red! ${PLAYER_NAMES[nextPlayer]}'s turn.`;
        setTimeout(() => aiTurn(nextPlayer), 700);
        return;
      }
      movableRef.current = movable;
      gs.phase = "move";
      gs.message =
        dice === 6
          ? "You rolled 6! Pick a token."
          : `You rolled ${dice}! Pick a token.`;
    });
  }, [gameStarted, rollDiceFor, getMovableKeys, aiTurn]);

  // Main render loop
  useEffect(() => {
    if (!open || !gameStarted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let last = 0;

    const loop = (ts: number) => {
      const dt = Math.min((ts - last) / 1000, 0.05);
      last = ts;
      pulseRef.current += dt;

      // Advance dice roll animation
      const dr = diceRollRef.current;
      if (dr) {
        dr.left--;
        diceDisplayRef.current =
          dr.left > 2 ? Math.floor(Math.random() * 6) + 1 : dr.target;
        if (dr.left <= 0) {
          diceDisplayRef.current = dr.target;
          diceRollRef.current = null;
          dr.onDone(dr.target);
        }
      }

      // Advance token animation
      const anim = animRef.current;
      if (anim) {
        anim.progress += dt * 6;
        if (anim.progress >= 1) {
          anim.progress = 0;
          anim.stepIdx++;
          if (anim.stepIdx >= anim.steps.length - 1) {
            anim.onDone();
          }
        }
      }

      // Advance confetti
      confettiRef.current = confettiRef.current.filter((c) => c.life > 0);
      for (const c of confettiRef.current) {
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.15;
        c.life -= 0.018;
      }

      // Draw
      const sz = canvas.width;
      drawBoard(ctx, sz);
      drawTokens(
        ctx,
        sz,
        stateRef.current.tokens,
        animRef.current,
        selectedRef.current,
        movableRef.current,
        pulseRef.current,
      );

      // Draw confetti
      for (const c of confettiRef.current) {
        ctx.save();
        ctx.globalAlpha = c.life;
        ctx.fillStyle = c.color;
        ctx.fillRect(c.x, c.y, 6, 6);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [open, gameStarted]);

  // Resize canvas
  useEffect(() => {
    if (!open) return;
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const sz = Math.min(parent.clientWidth, parent.clientHeight, 520);
      canvas.width = sz;
      canvas.height = sz;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [open]);

  const startGame = () => {
    stateRef.current = {
      tokens: initTokens(),
      currentPlayer: 0,
      phase: "roll",
      diceValue: null,
      winner: null,
      message: "Red's turn — Roll the dice!",
    };
    animRef.current = null;
    diceRollRef.current = null;
    diceDisplayRef.current = null;
    confettiRef.current = [];
    selectedRef.current = null;
    movableRef.current = [];
    setGameStarted(true);
    rerender();
  };

  const gs = stateRef.current;
  const canRoll =
    gameStarted &&
    gs.currentPlayer === 0 &&
    gs.phase === "roll" &&
    !animRef.current &&
    gs.winner === null;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg,#0a0a18,#120528)",
          border: "1px solid rgba(150,100,255,0.35)",
          boxShadow: "0 0 80px rgba(120,60,255,0.25)",
          maxWidth: 700,
          width: "98vw",
          maxHeight: "97vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{
            borderBottom: "1px solid rgba(150,100,255,0.2)",
            background: "rgba(0,0,0,0.3)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🎲</span>
            <div>
              <h2 className="font-bold text-white text-base">Ludo</h2>
              <p className="text-xs" style={{ color: "rgba(200,150,255,0.6)" }}>
                2D Canvas Game
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-ocid="ludo.sound_toggle"
              onClick={() => {
                soundOnRef.current = !soundOn;
                setSoundOn((v) => !v);
              }}
              className="p-1.5 rounded-lg text-sm"
              style={{
                background: soundOn
                  ? "rgba(100,200,100,0.15)"
                  : "rgba(100,100,100,0.15)",
                border: `1px solid ${
                  soundOn ? "rgba(100,200,100,0.35)" : "rgba(100,100,100,0.25)"
                }`,
                color: soundOn ? "#86efac" : "#6b7280",
              }}
            >
              {soundOn ? "🔊" : "🔇"}
            </button>
            <button
              type="button"
              data-ocid="ludo.exit_button"
              onClick={() => {
                setGameStarted(false);
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.35)",
                color: "#fca5a5",
              }}
            >
              ✕ Exit
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Canvas area */}
          <div
            className="relative flex items-center justify-center p-2 flex-1"
            style={{ minHeight: 280 }}
          >
            <canvas
              ref={canvasRef}
              data-ocid="ludo.canvas_target"
              onClick={handleCanvasClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleCanvasClick(
                    e as unknown as React.MouseEvent<HTMLCanvasElement>,
                  );
                }
              }}
              tabIndex={0}
              style={{
                imageRendering: "pixelated",
                cursor: gs.phase === "move" ? "pointer" : "default",
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            />
            {!gameStarted && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="text-center p-8 rounded-2xl"
                  style={{
                    background: "rgba(10,10,24,0.9)",
                    border: "1px solid rgba(150,100,255,0.3)",
                  }}
                >
                  <div className="text-5xl mb-3">🎲</div>
                  <h3 className="text-white font-bold text-xl mb-2">
                    Ludo Game
                  </h3>
                  <p
                    className="text-xs mb-4"
                    style={{ color: "rgba(200,150,255,0.6)" }}
                  >
                    You are Red. 3 AI opponents.
                  </p>
                  <button
                    type="button"
                    data-ocid="ludo.start_button"
                    onClick={startGame}
                    className="px-6 py-2.5 rounded-xl font-bold text-white text-sm"
                    style={{
                      background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                      boxShadow: "0 0 20px rgba(120,60,255,0.5)",
                    }}
                  >
                    🎮 Start Game
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Side panel */}
          <div
            className="flex flex-col gap-2 p-3 md:w-48 flex-shrink-0"
            style={{
              borderTop: "1px solid rgba(150,100,255,0.15)",
              borderLeft: "1px solid rgba(150,100,255,0.1)",
              background: "rgba(0,0,0,0.25)",
            }}
          >
            {/* Player list */}
            <p className="text-xs" style={{ color: "rgba(200,150,255,0.5)" }}>
              Players
            </p>
            {PLAYER_NAMES.map((name, idx) => {
              const playerTokens = gs.tokens.filter((t) => t.player === idx);
              const finished = playerTokens.filter((t) => t.finished).length;
              const isCurrent =
                gameStarted && gs.currentPlayer === idx && gs.winner === null;
              return (
                <div
                  key={name}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                  style={{
                    background: isCurrent
                      ? `${PLAYER_COLORS[idx]}18`
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${
                      isCurrent
                        ? `${PLAYER_COLORS[idx]}50`
                        : "rgba(255,255,255,0.07)"
                    }`,
                    transition: "all 0.3s",
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{
                      background: PLAYER_COLORS[idx],
                      boxShadow: `0 0 5px ${PLAYER_COLORS[idx]}`,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white">
                      {name}
                      {idx === 0 ? " (You)" : " (AI)"}
                    </p>
                    <p
                      className="text-[10px]"
                      style={{ color: PLAYER_LIGHT[idx] }}
                    >
                      {gs.winner === idx ? "🏆 Won!" : `${finished}/4 home`}
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] animate-pulse text-yellow-300">
                      ▶
                    </span>
                  )}
                </div>
              );
            })}

            {/* Dice */}
            {gameStarted && (
              <div className="flex flex-col items-center gap-2 mt-2">
                <div style={{ width: 64, height: 64 }}>
                  <canvas
                    id="dice-canvas"
                    width={64}
                    height={64}
                    ref={(el) => {
                      if (!el) return;
                      const ctx2 = el.getContext("2d")!;
                      ctx2.clearRect(0, 0, 64, 64);
                      drawDice(
                        ctx2,
                        diceDisplayRef.current ?? gs.diceValue,
                        !!diceRollRef.current,
                        2,
                        2,
                        60,
                        canRoll,
                        pulseRef.current,
                      );
                    }}
                  />
                </div>
                {canRoll && (
                  <button
                    type="button"
                    data-ocid="ludo.dice_button"
                    onClick={handleRoll}
                    className="w-full py-2 rounded-xl text-xs font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                      boxShadow: "0 0 16px rgba(120,60,255,0.4)",
                      animation: "pulse 1s infinite",
                    }}
                  >
                    🎲 Roll!
                  </button>
                )}
              </div>
            )}

            {/* Status message */}
            {gameStarted && (
              <div
                className="px-2 py-2 rounded-lg text-center mt-1"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p className="text-[11px] text-white leading-tight">
                  {gs.message}
                </p>
                {gs.phase === "move" && gs.currentPlayer === 0 && (
                  <p
                    className="text-[10px] mt-1"
                    style={{ color: "rgba(200,150,255,0.7)" }}
                  >
                    Click a glowing token
                  </p>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col gap-1.5 mt-auto">
              {gs.winner !== null && (
                <button
                  type="button"
                  data-ocid="ludo.start_button"
                  onClick={startGame}
                  className="w-full py-2 rounded-xl font-bold text-xs text-white"
                  style={{
                    background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                    boxShadow: "0 0 16px rgba(120,60,255,0.4)",
                  }}
                >
                  🔄 Play Again
                </button>
              )}
              {gameStarted && gs.winner === null && (
                <button
                  type="button"
                  onClick={startGame}
                  className="w-full py-1.5 rounded-xl text-xs"
                  style={{
                    background: "rgba(100,100,100,0.1)",
                    border: "1px solid rgba(100,100,100,0.2)",
                    color: "#9ca3af",
                  }}
                >
                  ↩ New Game
                </button>
              )}
            </div>
          </div>
        </div>
        <AdBanner />
      </div>
    </div>
  );
}
