import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getAvatarColor, getInitials, useReckon } from "../App";

interface LudoGameProps {
  open: boolean;
  onClose: () => void;
}

const PLAYER_COLORS = [
  {
    name: "Red",
    bg: "#ef4444",
    light: "#fca5a5",
    home: [-4.5, 0.35, -4.5] as [number, number, number],
  },
  {
    name: "Blue",
    bg: "#3b82f6",
    light: "#93c5fd",
    home: [4.5, 0.35, -4.5] as [number, number, number],
  },
  {
    name: "Green",
    bg: "#22c55e",
    light: "#86efac",
    home: [4.5, 0.35, 4.5] as [number, number, number],
  },
  {
    name: "Yellow",
    bg: "#eab308",
    light: "#fde047",
    home: [-4.5, 0.35, 4.5] as [number, number, number],
  },
];

// Each player enters the board at these absolute path indices
const PLAYER_START = [0, 13, 26, 39];
// Each player needs to travel 52 steps from their start to win
const STEPS_TO_WIN = 52;

// Full 52-cell path (shared clockwise track)
const LUDO_PATH: [number, number][] = [
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

// steps = steps taken from player's start (0 = not entered, 1..52)
function stepsToPathIndex(steps: number, playerIdx: number): number {
  return (PLAYER_START[playerIdx] + steps - 1) % 52;
}

function stepsToWorld(
  steps: number,
  playerIdx: number,
): [number, number, number] {
  if (steps <= 0) return PLAYER_COLORS[playerIdx].home;
  if (steps >= STEPS_TO_WIN) return [0, 1.4, 0];
  const idx = stepsToPathIndex(steps, playerIdx);
  const [row, col] = LUDO_PATH[idx];
  return [col - 7, 0.35, row - 7];
}

// Board tile helpers
const SAFE_PATH_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];
const SAFE_CELLS = new Set(
  SAFE_PATH_INDICES.map((i) => `${LUDO_PATH[i][0]}-${LUDO_PATH[i][1]}`),
);
const PATH_CELLS = new Set(LUDO_PATH.map(([r, c]) => `${r}-${c}`));

function getBoardTileColor(row: number, col: number): string {
  if (row < 6 && col < 6) return "#ef4444";
  if (row < 6 && col > 8) return "#3b82f6";
  if (row > 8 && col < 6) return "#22c55e";
  if (row > 8 && col > 8) return "#eab308";
  if (row >= 6 && row <= 8 && col >= 6 && col <= 8) return "#a855f7";
  const key = `${row}-${col}`;
  if (SAFE_CELLS.has(key)) return "#fef08a";
  if (PATH_CELLS.has(key)) return "#f0f0f0";
  return "#cbd5e1";
}

const BOARD_TILES: { row: number; col: number }[] = [];
for (let r = 0; r < 15; r++)
  for (let c = 0; c < 15; c++) BOARD_TILES.push({ row: r, col: c });

// Audio
function createBeep(ctx: AudioContext, freq: number, dur: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  osc.type = "square";
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + dur);
}

function createDotTexture(value: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f8f8ff";
  ctx.roundRect(0, 0, size, size, 14);
  ctx.fill();
  ctx.fillStyle = "#1a0a2e";
  const layouts: [number, number][][] = [
    [[0.5, 0.5]],
    [
      [0.27, 0.27],
      [0.73, 0.73],
    ],
    [
      [0.27, 0.27],
      [0.5, 0.5],
      [0.73, 0.73],
    ],
    [
      [0.27, 0.27],
      [0.73, 0.27],
      [0.27, 0.73],
      [0.73, 0.73],
    ],
    [
      [0.27, 0.27],
      [0.73, 0.27],
      [0.5, 0.5],
      [0.27, 0.73],
      [0.73, 0.73],
    ],
    [
      [0.27, 0.25],
      [0.73, 0.25],
      [0.27, 0.5],
      [0.73, 0.5],
      [0.27, 0.75],
      [0.73, 0.75],
    ],
  ];
  for (const [dx, dy] of layouts[value - 1] ?? []) {
    ctx.beginPath();
    ctx.arc(dx * size, dy * size, size * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

// ─── 3D Components ────────────────────────────────────────────────────────────

function BoardTile({
  row,
  col,
  lit,
}: { row: number; col: number; lit: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const color = getBoardTileColor(row, col);
  useFrame(() => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = lit
      ? 0.3 + Math.sin(Date.now() * 0.006) * 0.15
      : 0.04;
  });
  return (
    <mesh ref={ref} position={[col - 7, 0, row - 7]} receiveShadow>
      <boxGeometry args={[0.93, 0.15, 0.93]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.04}
        roughness={0.6}
        metalness={0.1}
      />
    </mesh>
  );
}

function Dice3D({
  diceValue,
  rolling,
  canRoll,
}: { diceValue: number | null; rolling: boolean; canRoll: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const spin = useRef({ active: false, speed: 0 });
  const faceMats = useMemo(
    () =>
      [1, 2, 3, 4, 5, 6].map(
        (n) =>
          new THREE.MeshStandardMaterial({
            map: createDotTexture(n),
            roughness: 0.3,
            metalness: 0.1,
          }),
      ),
    [],
  );

  useEffect(() => {
    if (rolling) spin.current = { active: true, speed: 20 };
  }, [rolling]);
  useEffect(() => {
    if (meshRef.current) meshRef.current.material = faceMats;
  }, [faceMats]);

  useFrame((_, dt) => {
    const m = meshRef.current;
    if (!m) return;
    if (spin.current.active) {
      m.rotation.x += dt * spin.current.speed;
      m.rotation.y += dt * spin.current.speed * 0.7;
      spin.current.speed *= 0.95;
      if (spin.current.speed < 0.4) {
        spin.current.active = false;
        if (diceValue !== null) {
          const faceRots: [number, number, number][] = [
            [0, 0, 0],
            [0, Math.PI, 0],
            [0, -Math.PI / 2, 0],
            [0, Math.PI / 2, 0],
            [-Math.PI / 2, 0, 0],
            [Math.PI / 2, 0, 0],
          ];
          const [rx, ry, rz] = faceRots[diceValue - 1];
          m.rotation.set(rx, ry, rz);
        }
      }
    } else {
      m.position.y = 1.5 + Math.sin(Date.now() * 0.002) * 0.08;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.004) * 0.06);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = canRoll
        ? 0.18 + Math.sin(Date.now() * 0.005) * 0.08
        : 0.04;
    }
  });

  return (
    <group position={[5.5, 1.5, 0]}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.15, 16, 16]} />
        <meshBasicMaterial
          color="#a855f7"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
      </mesh>
    </group>
  );
}

function Token3D({
  steps,
  playerIdx,
  isCurrent,
  isWinner,
}: {
  steps: number;
  playerIdx: number;
  isCurrent: boolean;
  isWinner: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const cur = useRef(new THREE.Vector3(...stepsToWorld(steps, playerIdx)));
  const tgt = useRef(new THREE.Vector3(...stepsToWorld(steps, playerIdx)));
  const phase = useRef(0);

  useEffect(() => {
    const [tx, ty, tz] = stepsToWorld(steps, playerIdx);
    tgt.current.set(tx, ty, tz);
  }, [steps, playerIdx]);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    cur.current.lerp(tgt.current, Math.min(dt * 7, 1));
    phase.current += dt * (isWinner ? 2.5 : isCurrent ? 4 : 1);
    const bobY = isWinner
      ? Math.sin(phase.current) * 0.35 + 0.4
      : isCurrent
        ? Math.sin(phase.current) * 0.1
        : 0;
    meshRef.current.position.set(
      cur.current.x,
      cur.current.y + bobY,
      cur.current.z,
    );
    if (isWinner) meshRef.current.rotation.y += dt * 3;
  });

  const col = PLAYER_COLORS[playerIdx];
  return (
    <mesh ref={meshRef} position={cur.current.toArray()} castShadow>
      <cylinderGeometry args={[0.28, 0.32, 0.6, 16]} />
      <meshStandardMaterial
        color={col.bg}
        emissive={col.bg}
        emissiveIntensity={isWinner ? 2 : isCurrent ? 0.9 : 0.2}
        roughness={0.3}
        metalness={0.4}
      />
    </mesh>
  );
}

function LudoScene({
  steps,
  numPlayers,
  currentPlayer,
  winner,
  rolling,
  diceValue,
  canRoll,
}: {
  steps: number[];
  numPlayers: number;
  currentPlayer: number;
  winner: number | null;
  rolling: boolean;
  diceValue: number | null;
  canRoll: boolean;
}) {
  const litCells = useMemo(() => {
    const s = new Set<string>();
    for (let p = 0; p < numPlayers; p++) {
      if (steps[p] > 0 && steps[p] < STEPS_TO_WIN) {
        const idx = stepsToPathIndex(steps[p], p);
        const [r, c] = LUDO_PATH[idx];
        s.add(`${r}-${c}`);
      }
    }
    return s;
  }, [steps, numPlayers]);

  const tokens = Array.from({ length: numPlayers }, (_, p) => (
    <Token3D
      key={PLAYER_COLORS[p].name}
      steps={steps[p]}
      playerIdx={p}
      isCurrent={currentPlayer === p && winner === null}
      isWinner={winner === p}
    />
  ));

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      <pointLight
        position={[-7, 4, -7]}
        color="#ef4444"
        intensity={1.8}
        distance={9}
      />
      <pointLight
        position={[7, 4, -7]}
        color="#3b82f6"
        intensity={1.8}
        distance={9}
      />
      <pointLight
        position={[7, 4, 7]}
        color="#22c55e"
        intensity={1.8}
        distance={9}
      />
      <pointLight
        position={[-7, 4, 7]}
        color="#eab308"
        intensity={1.8}
        distance={9}
      />

      {/* Platform */}
      <mesh position={[0, -0.22, 0]} receiveShadow>
        <boxGeometry args={[16.5, 0.3, 16.5]} />
        <meshStandardMaterial color="#0a0318" roughness={0.8} metalness={0.3} />
      </mesh>

      {BOARD_TILES.map(({ row, col }) => (
        <BoardTile
          key={`${row}-${col}`}
          row={row}
          col={col}
          lit={litCells.has(`${row}-${col}`)}
        />
      ))}

      {tokens}

      <Dice3D diceValue={diceValue} rolling={rolling} canRoll={canRoll} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minPolarAngle={0.15}
        maxPolarAngle={1.3}
        autoRotate={!rolling && winner === null}
        autoRotateSpeed={0.35}
        enableZoom={false}
      />
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type GameMode = "players" | "computer" | null;

export default function LudoGame({ open, onClose }: LudoGameProps) {
  const { allUsers, currentUser } = useReckon();
  const audioRef = useRef<AudioContext | null>(null);

  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [computerThinking, setComputerThinking] = useState(false);
  // steps[p] = number of steps taken from start (0 = home, 1..51 = on board, 52 = finished)
  const [steps, setSteps] = useState<number[]>([0, 0, 0, 0]);

  // Refs to avoid stale closures in async callbacks
  const winnerRef = useRef<number | null>(null);
  const currentPlayerRef = useRef(0);
  const stepsRef = useRef([0, 0, 0, 0]);
  const rollingRef = useRef(false);

  useEffect(() => {
    winnerRef.current = winner;
  }, [winner]);
  useEffect(() => {
    currentPlayerRef.current = currentPlayer;
  }, [currentPlayer]);
  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);
  useEffect(() => {
    rollingRef.current = rolling;
  }, [rolling]);

  const computerUser = useMemo(
    () => ({
      id: "computer_ai",
      name: "Computer",
      email: "",
      phone: "",
      password: "",
      city: "AI",
      createdAt: 0,
    }),
    [],
  );

  const players = useMemo(
    () =>
      gameMode === "computer"
        ? [currentUser, computerUser]
        : [
            currentUser,
            ...allUsers.filter((u) => u.id !== currentUser.id).slice(0, 3),
          ].slice(0, 4),
    [gameMode, currentUser, allUsers, computerUser],
  );

  const numPlayers = gameMode === "computer" ? 2 : players.length;

  const playSound = useCallback(
    (type: "roll" | "move" | "win") => {
      if (!soundOn) return;
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      if (type === "roll") {
        createBeep(ctx, 440, 0.1);
        setTimeout(() => createBeep(ctx, 550, 0.1), 100);
      } else if (type === "move") {
        createBeep(ctx, 660, 0.15);
      } else {
        createBeep(ctx, 880, 0.2);
        setTimeout(() => createBeep(ctx, 1100, 0.2), 200);
        setTimeout(() => createBeep(ctx, 1320, 0.3), 400);
      }
    },
    [soundOn],
  );

  // Core roll logic — returns true if player rolled 6 (extra turn)
  const applyRoll = useCallback(
    (playerIdx: number, rollVal: number): boolean => {
      let gotWin = false;
      let got6 = rollVal === 6;

      setSteps((prev) => {
        const next = [...prev];
        const cur = next[playerIdx];
        if (cur === 0) {
          // Not on board — need 6 to enter
          if (rollVal === 6) {
            next[playerIdx] = 1; // enter board at step 1
            playSound("move");
          }
          // If not 6, nothing happens, but player loses their turn
        } else {
          const newSteps = cur + rollVal;
          if (newSteps >= STEPS_TO_WIN) {
            next[playerIdx] = STEPS_TO_WIN;
            gotWin = true;
            setWinner(playerIdx);
            winnerRef.current = playerIdx;
            playSound("win");
            got6 = false; // no extra turn needed if won
          } else {
            next[playerIdx] = newSteps;
            playSound("move");
          }
        }
        stepsRef.current = next;
        return next;
      });

      return got6 && !gotWin;
    },
    [playSound],
  );

  const doRollAnimation = useCallback(
    (_count: number, onDone: (val: number) => void) => {
      let c = 0;
      setRolling(true);
      rollingRef.current = true;
      const iv = setInterval(() => {
        setDiceValue(Math.floor(Math.random() * 6) + 1);
        c++;
        if (c >= 8) {
          clearInterval(iv);
          const final = Math.floor(Math.random() * 6) + 1;
          setDiceValue(final);
          setRolling(false);
          rollingRef.current = false;
          onDone(final);
        }
      }, 80);
      return () => clearInterval(iv);
    },
    [],
  );

  const advanceTurn = useCallback(
    (fromPlayer: number, nPlayers: number, mode: GameMode) => {
      if (winnerRef.current !== null) return;
      const nextP = (fromPlayer + 1) % nPlayers;
      setCurrentPlayer(nextP);
      currentPlayerRef.current = nextP;
      if (mode === "computer" && nextP === 1) {
        // Computer turn
        setComputerThinking(true);
        setTimeout(() => {
          if (winnerRef.current !== null) {
            setComputerThinking(false);
            return;
          }
          setComputerThinking(false);
          playSound("roll");
          doRollAnimation(8, (cv) => {
            if (winnerRef.current !== null) return;
            const extraTurn = applyRoll(1, cv);
            if (!extraTurn) {
              // Advance to player 0
              setTimeout(() => {
                if (winnerRef.current !== null) return;
                setCurrentPlayer(0);
                currentPlayerRef.current = 0;
              }, 200);
            }
            // If computer rolled 6, computer gets another turn
            if (extraTurn && winnerRef.current === null) {
              setTimeout(() => advanceTurn(0, nPlayers, mode), 1600);
            }
          });
        }, 1400);
      }
    },
    [playSound, doRollAnimation, applyRoll],
  );

  const rollDice = useCallback(() => {
    if (
      rollingRef.current ||
      !gameStarted ||
      winnerRef.current !== null ||
      computerThinking
    )
      return;
    if (gameMode === "computer" && currentPlayerRef.current === 1) return;
    const me = currentPlayerRef.current;
    playSound("roll");
    doRollAnimation(8, (finalVal) => {
      if (winnerRef.current !== null) return;
      const extraTurn = applyRoll(me, finalVal);
      if (!extraTurn) {
        setTimeout(() => advanceTurn(me, numPlayers, gameMode), 150);
      }
      // If rolled 6 (and not won), player rolls again — no turn advance needed
    });
  }, [
    gameStarted,
    computerThinking,
    gameMode,
    numPlayers,
    playSound,
    doRollAnimation,
    applyRoll,
    advanceTurn,
  ]);

  const resetGame = () => {
    setGameStarted(false);
    setGameMode(null);
    setSteps([0, 0, 0, 0]);
    stepsRef.current = [0, 0, 0, 0];
    setDiceValue(null);
    setCurrentPlayer(0);
    currentPlayerRef.current = 0;
    setWinner(null);
    winnerRef.current = null;
    setComputerThinking(false);
    rollingRef.current = false;
    setRolling(false);
  };

  useEffect(
    () => () => {
      audioRef.current?.close();
    },
    [],
  );

  const canRoll =
    !rolling &&
    gameStarted &&
    winner === null &&
    !computerThinking &&
    !(gameMode === "computer" && currentPlayer === 1);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4"
        style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: "linear-gradient(135deg, #0a0a18, #120528)",
            border: "1px solid rgba(150,100,255,0.35)",
            boxShadow:
              "0 0 80px rgba(120,60,255,0.25), inset 0 0 60px rgba(0,0,0,0.4)",
            maxHeight: "96vh",
          }}
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{
              borderBottom: "1px solid rgba(150,100,255,0.2)",
              background: "rgba(0,0,0,0.3)",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🎲</span>
              <div>
                <h2 className="font-bold text-white text-base leading-tight">
                  Ludo 3D
                </h2>
                <p
                  className="text-xs"
                  style={{ color: "rgba(200,150,255,0.6)" }}
                >
                  {!gameMode
                    ? "Choose mode"
                    : gameMode === "computer"
                      ? "vs Computer"
                      : `${numPlayers} players`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-ocid="ludo.sound_toggle"
                onClick={() => setSoundOn((v) => !v)}
                className="p-1.5 rounded-lg text-sm transition-all"
                style={{
                  background: soundOn
                    ? "rgba(100,200,100,0.15)"
                    : "rgba(100,100,100,0.15)",
                  border: `1px solid ${soundOn ? "rgba(100,200,100,0.35)" : "rgba(100,100,100,0.25)"}`,
                  color: soundOn ? "#86efac" : "#6b7280",
                }}
              >
                {soundOn ? "🔊" : "🔇"}
              </button>
              <button
                type="button"
                data-ocid="ludo.exit_button"
                onClick={() => {
                  resetGame();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
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

          <div className="flex flex-col md:flex-row flex-1 min-h-0">
            {/* 3D Canvas */}
            <div
              className="relative flex-1"
              style={{ minHeight: 320, maxHeight: 500 }}
            >
              <Canvas
                camera={{
                  position: [0, 12, 10] as [number, number, number],
                  fov: 50,
                }}
                shadows
                style={{ background: "#050510", width: "100%", height: "100%" }}
              >
                {gameStarted ? (
                  <LudoScene
                    steps={steps}
                    numPlayers={numPlayers}
                    currentPlayer={currentPlayer}
                    winner={winner}
                    rolling={rolling}
                    diceValue={diceValue}
                    canRoll={canRoll}
                  />
                ) : (
                  <>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[5, 10, 5]} intensity={1} />
                    <OrbitControls
                      autoRotate
                      autoRotateSpeed={1}
                      enableZoom={false}
                    />
                    {BOARD_TILES.map(({ row, col }) => (
                      <mesh
                        key={`${row}-${col}`}
                        position={[col - 7, 0, row - 7]}
                      >
                        <boxGeometry args={[0.93, 0.15, 0.93]} />
                        <meshStandardMaterial
                          color={getBoardTileColor(row, col)}
                          emissive={getBoardTileColor(row, col)}
                          emissiveIntensity={0.1}
                        />
                      </mesh>
                    ))}
                  </>
                )}
              </Canvas>

              {/* Win overlay */}
              {winner !== null && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    background: "rgba(0,0,0,0.65)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <div
                    className="text-center p-6 rounded-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${PLAYER_COLORS[winner].bg}30, #0a0a18)`,
                      border: `2px solid ${PLAYER_COLORS[winner].bg}80`,
                      boxShadow: `0 0 40px ${PLAYER_COLORS[winner].bg}60`,
                    }}
                  >
                    <motion.div
                      animate={{
                        rotate: [0, -10, 10, -10, 10, 0],
                        y: [0, -10, 0],
                      }}
                      transition={{
                        repeat: Number.POSITIVE_INFINITY,
                        duration: 1.5,
                      }}
                      className="text-5xl mb-2"
                    >
                      🏆
                    </motion.div>
                    <p className="text-xl font-bold text-white">
                      {players[winner]?.name} Wins!
                    </p>
                    <p
                      style={{ color: PLAYER_COLORS[winner].light }}
                      className="text-sm mt-1"
                    >
                      {PLAYER_COLORS[winner].name} team
                    </p>
                  </div>
                </motion.div>
              )}

              {computerThinking && (
                <div
                  className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs flex items-center gap-2"
                  style={{
                    background: "rgba(124,58,237,0.3)",
                    border: "1px solid rgba(168,85,247,0.4)",
                    color: "#c084fc",
                  }}
                >
                  <span className="animate-spin inline-block">⚙️</span> Computer
                  thinking...
                </div>
              )}

              {canRoll && (
                <button
                  type="button"
                  data-ocid="ludo.dice_button"
                  onClick={rollDice}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl text-xs font-semibold animate-pulse"
                  style={{
                    background: "rgba(168,85,247,0.25)",
                    border: "1px solid rgba(168,85,247,0.5)",
                    color: "#e9d5ff",
                  }}
                >
                  🎲 Roll Dice
                </button>
              )}
            </div>

            {/* Side panel */}
            <div
              className="flex flex-col gap-3 p-3 md:w-52 flex-shrink-0"
              style={{
                borderTop: "1px solid rgba(150,100,255,0.15)",
                borderLeft: "1px solid rgba(150,100,255,0.1)",
                background: "rgba(0,0,0,0.25)",
              }}
            >
              {!gameMode && (
                <div className="space-y-2">
                  <p
                    className="text-xs text-center"
                    style={{ color: "rgba(200,150,255,0.6)" }}
                  >
                    Select Game Mode
                  </p>
                  <button
                    type="button"
                    data-ocid="ludo.mode_vs_players_button"
                    onClick={() => setGameMode("players")}
                    className="w-full py-2 rounded-xl font-semibold text-xs transition-all hover:scale-105"
                    style={{
                      background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                      color: "white",
                      boxShadow: "0 0 12px rgba(99,102,241,0.3)",
                    }}
                  >
                    👥 vs Players
                  </button>
                  <button
                    type="button"
                    data-ocid="ludo.mode_vs_computer_button"
                    onClick={() => setGameMode("computer")}
                    className="w-full py-2 rounded-xl font-semibold text-xs transition-all hover:scale-105"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                      color: "white",
                      boxShadow: "0 0 12px rgba(120,60,255,0.3)",
                    }}
                  >
                    🤖 vs Computer
                  </button>
                </div>
              )}

              {gameMode && (
                <div className="space-y-1.5">
                  <p
                    className="text-xs"
                    style={{ color: "rgba(200,150,255,0.5)" }}
                  >
                    Players
                  </p>
                  {players.slice(0, numPlayers).map((player, idx) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                      style={{
                        background:
                          currentPlayer === idx && gameStarted
                            ? `${PLAYER_COLORS[idx].bg}18`
                            : "rgba(255,255,255,0.04)",
                        border: `1px solid ${currentPlayer === idx && gameStarted ? `${PLAYER_COLORS[idx].bg}50` : "rgba(255,255,255,0.07)"}`,
                      }}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                        style={{
                          background:
                            player.id === "computer_ai"
                              ? "#7c3aed"
                              : getAvatarColor(player.id),
                        }}
                      >
                        {player.id === "computer_ai"
                          ? "🤖"
                          : getInitials(player.name)}
                      </div>
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          background: PLAYER_COLORS[idx].bg,
                          boxShadow: `0 0 4px ${PLAYER_COLORS[idx].bg}`,
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-white truncate">
                          {player.name}
                          {player.id === currentUser.id ? " (You)" : ""}
                        </p>
                        <p
                          className="text-[9px]"
                          style={{ color: PLAYER_COLORS[idx].light }}
                        >
                          {steps[idx] === 0
                            ? "Home"
                            : steps[idx] >= STEPS_TO_WIN
                              ? "🏆 Won!"
                              : `Step ${steps[idx]}/52`}
                        </p>
                      </div>
                      {currentPlayer === idx &&
                        gameStarted &&
                        winner === null && (
                          <span className="text-[10px] animate-pulse text-yellow-300">
                            ▶
                          </span>
                        )}
                    </div>
                  ))}
                </div>
              )}

              {gameStarted && winner === null && (
                <div
                  className="px-2 py-2 rounded-lg text-center"
                  style={{
                    background: `${PLAYER_COLORS[currentPlayer].bg}15`,
                    border: `1px solid ${PLAYER_COLORS[currentPlayer].bg}40`,
                  }}
                >
                  <p
                    className="text-[10px]"
                    style={{ color: PLAYER_COLORS[currentPlayer].light }}
                  >
                    {players[currentPlayer]?.name}'s turn
                  </p>
                  {diceValue && (
                    <p className="text-sm font-bold text-white mt-0.5">
                      Rolled: {diceValue}
                    </p>
                  )}
                  {steps[currentPlayer] === 0 && (
                    <p
                      className="text-[9px] mt-0.5"
                      style={{ color: "rgba(200,150,255,0.6)" }}
                    >
                      Need 6 to enter!
                    </p>
                  )}
                  {steps[currentPlayer] > 0 &&
                    steps[currentPlayer] < STEPS_TO_WIN && (
                      <p
                        className="text-[9px] mt-0.5"
                        style={{ color: "rgba(200,150,255,0.5)" }}
                      >
                        {STEPS_TO_WIN - steps[currentPlayer]} steps to win
                      </p>
                    )}
                </div>
              )}

              <div className="flex flex-col gap-2 mt-auto">
                {gameMode && !gameStarted && (
                  <button
                    type="button"
                    data-ocid="ludo.start_button"
                    onClick={() => {
                      setGameStarted(true);
                      setSteps([0, 0, 0, 0]);
                      stepsRef.current = [0, 0, 0, 0];
                      setCurrentPlayer(0);
                      currentPlayerRef.current = 0;
                      setWinner(null);
                      winnerRef.current = null;
                    }}
                    className="w-full py-2 rounded-xl font-semibold text-xs transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                      color: "white",
                      boxShadow: "0 0 16px rgba(120,60,255,0.4)",
                    }}
                  >
                    🎮 Start Game
                  </button>
                )}
                {winner !== null && (
                  <button
                    type="button"
                    data-ocid="ludo.start_button"
                    onClick={resetGame}
                    className="w-full py-2 rounded-xl font-semibold text-xs transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                      color: "white",
                      boxShadow: "0 0 16px rgba(120,60,255,0.4)",
                    }}
                  >
                    🔄 Play Again
                  </button>
                )}
                {gameMode && gameStarted && winner === null && (
                  <button
                    type="button"
                    onClick={resetGame}
                    className="w-full py-1.5 rounded-xl text-xs transition-all"
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
