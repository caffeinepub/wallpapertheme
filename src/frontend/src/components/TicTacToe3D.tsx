import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface TicTacToe3DProps {
  open: boolean;
  onClose: () => void;
}

type Cell = "X" | "O" | null;
type Mode = "computer" | "2player" | null;

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const CELL_OCIDS = [
  "ttt.cell.1",
  "ttt.cell.2",
  "ttt.cell.3",
  "ttt.cell.4",
  "ttt.cell.5",
  "ttt.cell.6",
  "ttt.cell.7",
  "ttt.cell.8",
  "ttt.cell.9",
] as const;

const CONFETTI_COLORS = [
  "#FFD700",
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
];

function checkWinner(board: Cell[]): { winner: Cell; line: number[] } | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return null;
}

function minimax(board: Cell[], isMaximizing: boolean, depth: number): number {
  const result = checkWinner(board);
  if (result?.winner === "O") return 10 - depth;
  if (result?.winner === "X") return depth - 10;
  if (board.every((c) => c !== null)) return 0;

  if (isMaximizing) {
    let best = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = "O";
        best = Math.max(best, minimax(board, false, depth + 1));
        board[i] = null;
      }
    }
    return best;
  }
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = "X";
      best = Math.min(best, minimax(board, true, depth + 1));
      board[i] = null;
    }
  }
  return best;
}

// Medium difficulty: 45% chance of random move, 55% best move
function getComputerMove(board: Cell[]): number {
  const empty = board
    .map((c, i) => (c === null ? i : -1))
    .filter((i) => i >= 0);
  if (empty.length === 0) return -1;

  // 45% chance random move
  if (Math.random() < 0.45) {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // 55% best minimax move
  let bestVal = Number.NEGATIVE_INFINITY;
  let bestMove = empty[0];
  for (const i of empty) {
    board[i] = "O";
    const val = minimax(board, false, 0);
    board[i] = null;
    if (val > bestVal) {
      bestVal = val;
      bestMove = i;
    }
  }
  return bestMove;
}

// Confetti particle component
function ConfettiParticle({ index }: { index: number }) {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const left = `${5 + Math.random() * 90}%`;
  const size = 6 + Math.floor(Math.random() * 10);
  const duration = 1.5 + Math.random() * 1.5;
  const delay = Math.random() * 0.8;
  const shape = index % 3;

  return (
    <motion.div
      className="absolute top-0 pointer-events-none"
      style={{ left }}
      initial={{ y: -20, opacity: 1, rotate: 0, scale: 1 }}
      animate={{
        y: "110vh",
        opacity: [1, 1, 0.8, 0],
        rotate: Math.random() > 0.5 ? 720 : -720,
        scale: [1, 1.2, 0.8],
        x: [0, Math.random() * 60 - 30, Math.random() * 80 - 40],
      }}
      transition={{ duration, delay, ease: "easeIn" }}
    >
      {shape === 0 ? (
        <div
          style={{
            width: size,
            height: size,
            background: color,
            borderRadius: 2,
          }}
        />
      ) : shape === 1 ? (
        <div
          style={{ width: size / 2, height: size * 1.5, background: color }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            background: color,
            borderRadius: "50%",
          }}
        />
      )}
    </motion.div>
  );
}

// Trophy celebration overlay
function TrophyCelebration({ onDone }: { onDone: () => void }) {
  const particles = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "rgba(0,0,0,0.85)", borderRadius: "inherit" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Confetti */}
      {particles.map((i) => (
        <ConfettiParticle key={i} index={i} />
      ))}

      {/* Sparkle stars */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 80;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <motion.div
            key={i}
            className="absolute text-2xl select-none"
            style={{
              left: "50%",
              top: "42%",
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
            }}
            animate={{
              rotate: [0, 360],
              scale: [0.8, 1.4, 0.8],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 1.8,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.3,
              ease: "easeInOut",
            }}
          >
            ✨
          </motion.div>
        );
      })}

      {/* Trophy */}
      <motion.div
        className="text-8xl select-none relative z-10"
        initial={{ scale: 0, rotate: -20 }}
        animate={{
          scale: [0, 1.3, 0.95, 1.1, 1],
          rotate: [-20, 10, -5, 5, 0],
          y: [0, -10, 0, -6, 0],
        }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      >
        🏆
      </motion.div>

      {/* Bouncing glow ring */}
      <motion.div
        className="absolute"
        style={{
          width: 130,
          height: 130,
          borderRadius: "50%",
          border: "3px solid #FFD700",
          boxShadow: "0 0 30px #FFD700, 0 0 60px rgba(255,215,0,0.5)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          marginTop: "-48px",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
      />

      {/* YOU WIN text */}
      <motion.div
        className="mt-6 text-center relative z-10"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
      >
        <p
          className="text-4xl font-black tracking-widest"
          style={{
            color: "#FFD700",
            textShadow:
              "0 0 20px #FFD700, 0 0 40px rgba(255,215,0,0.8), 0 0 80px rgba(255,215,0,0.4)",
          }}
        >
          YOU WIN!
        </p>
        <motion.p
          className="text-sm mt-2"
          style={{ color: "rgba(255,215,0,0.65)" }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
        >
          Tap to continue
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

export default function TicTacToe3D({ open, onClose }: TicTacToe3DProps) {
  const [mode, setMode] = useState<Mode>(null);
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [currentTurn, setCurrentTurn] = useState<"X" | "O">("X");
  const [thinking, setThinking] = useState(false);
  const [showTrophy, setShowTrophy] = useState(false);
  const thinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const winResult = checkWinner(board);
  const isDraw = !winResult && board.every((c) => c !== null);
  const gameOver = !!winResult || isDraw;

  // Determine if the winner is the human player
  const isPlayerWin =
    !!winResult &&
    (mode === "2player" || (mode === "computer" && winResult.winner === "X"));

  const handleCellClick = (idx: number) => {
    // Block clicks: occupied cell, game over, or computer thinking
    if (board[idx] !== null || gameOver || thinking) return;
    // In computer mode, only X (player) can click
    if (mode === "computer" && currentTurn === "O") return;

    const newBoard = [...board];
    newBoard[idx] = currentTurn;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    const filled = newBoard.every((c) => c !== null);

    if (result || filled) {
      // Game ended after player move
      if (result) {
        const playerWon =
          mode === "2player" || (mode === "computer" && result.winner === "X");
        if (playerWon) {
          setTimeout(() => setShowTrophy(true), 100);
        }
      }
      return;
    }

    const nextTurn = currentTurn === "X" ? "O" : "X";
    setCurrentTurn(nextTurn);

    if (mode === "computer" && nextTurn === "O") {
      setThinking(true);
      thinkingTimerRef.current = setTimeout(() => {
        const boardCopy = [...newBoard];
        const best = getComputerMove(boardCopy);
        if (best >= 0) {
          boardCopy[best] = "O";
          setBoard(boardCopy);
        }
        setCurrentTurn("X");
        setThinking(false);
        thinkingTimerRef.current = null;
      }, 600);
    }
  };

  const resetGame = () => {
    if (thinkingTimerRef.current) {
      clearTimeout(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
    setBoard(Array(9).fill(null));
    setCurrentTurn("X");
    setThinking(false);
    setShowTrophy(false);
  };

  const resetAll = () => {
    resetGame();
    setMode(null);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
    };
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full max-w-md rounded-2xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, #0a0a18, #130a24)",
            border: "1px solid rgba(200,100,255,0.35)",
            boxShadow:
              "0 0 80px rgba(180,60,255,0.25), 0 0 30px rgba(0,200,255,0.1)",
          }}
          initial={{ scale: 0.85, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.85, y: 30 }}
        >
          {/* Trophy Celebration Overlay */}
          <AnimatePresence>
            {showTrophy && (
              <TrophyCelebration onDone={() => setShowTrophy(false)} />
            )}
          </AnimatePresence>

          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: "rgba(200,100,255,0.2)" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⭕</span>
              <div>
                <h2 className="font-bold text-white text-lg tracking-wide">
                  Tic-Tac-Toe 3D
                </h2>
                <p
                  className="text-xs"
                  style={{ color: "rgba(200,150,255,0.65)" }}
                >
                  {mode === "computer"
                    ? "vs Computer"
                    : mode === "2player"
                      ? "2 Players"
                      : "Choose Mode"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {mode && (
                <button
                  type="button"
                  data-ocid="ttt.mode_button"
                  onClick={resetAll}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: "rgba(100,100,200,0.2)",
                    border: "1px solid rgba(100,100,200,0.4)",
                    color: "#a5b4fc",
                  }}
                >
                  Change Mode
                </button>
              )}
              <button
                type="button"
                data-ocid="ttt.close_button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: "rgba(239,68,68,0.2)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  color: "#fca5a5",
                }}
              >
                Exit
              </button>
            </div>
          </div>

          <div className="p-6">
            {!mode ? (
              /* Mode Selection */
              <motion.div
                className="text-center space-y-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-white/70 text-sm mb-6">
                  Select game mode to play
                </p>
                <button
                  type="button"
                  data-ocid="ttt.mode_button"
                  onClick={() => setMode("computer")}
                  className="w-full py-4 rounded-2xl font-semibold text-white transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 text-lg"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                    boxShadow: "0 0 30px rgba(168,85,247,0.5)",
                  }}
                >
                  🤖 vs Computer
                </button>
                <button
                  type="button"
                  data-ocid="ttt.mode_button"
                  onClick={() => setMode("2player")}
                  className="w-full py-4 rounded-2xl font-semibold text-white transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 text-lg"
                  style={{
                    background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                    boxShadow: "0 0 30px rgba(99,102,241,0.5)",
                  }}
                >
                  👥 2 Players
                </button>
              </motion.div>
            ) : (
              /* Game Board */
              <div className="flex flex-col items-center gap-5">
                {/* Status */}
                <div className="text-center min-h-[32px] flex items-center justify-center">
                  {winResult ? (
                    <motion.p
                      className="text-lg font-bold"
                      style={{
                        color: isPlayerWin
                          ? "#FFD700"
                          : winResult.winner === "X"
                            ? "#f87171"
                            : "#60a5fa",
                        textShadow: isPlayerWin
                          ? "0 0 20px #FFD700"
                          : undefined,
                      }}
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                    >
                      {isPlayerWin
                        ? "🏆"
                        : winResult.winner === "O" && mode === "computer"
                          ? "🤖"
                          : "🏆"}{" "}
                      {winResult.winner === "X"
                        ? mode === "computer"
                          ? "You Win!"
                          : "Player X Wins!"
                        : mode === "computer"
                          ? "Computer Wins! 🤖"
                          : "Player O Wins!"}
                    </motion.p>
                  ) : isDraw ? (
                    <motion.p
                      className="text-lg font-bold text-yellow-400"
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                    >
                      🤝 It&apos;s a Draw!
                    </motion.p>
                  ) : thinking ? (
                    <p className="text-sm text-purple-300 animate-pulse">
                      🤖 Computer is thinking...
                    </p>
                  ) : (
                    <p
                      className="text-sm"
                      style={{
                        color:
                          currentTurn === "X"
                            ? "rgba(248,113,113,0.85)"
                            : "rgba(96,165,250,0.85)",
                      }}
                    >
                      {currentTurn === "X"
                        ? mode === "computer"
                          ? "Your turn (X)"
                          : "Player X's turn"
                        : mode === "computer"
                          ? "Computer's turn (O)"
                          : "Player O's turn"}
                    </p>
                  )}
                </div>

                {/* 3D Board */}
                <div
                  style={{
                    perspective: "600px",
                    perspectiveOrigin: "50% 30%",
                  }}
                >
                  <div
                    style={{
                      transform: "rotateX(20deg)",
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <div
                      className="grid grid-cols-3 gap-2 p-3 rounded-2xl"
                      style={{
                        background: "rgba(80,40,160,0.15)",
                        border: "1px solid rgba(160,80,255,0.3)",
                        boxShadow:
                          "0 20px 60px rgba(100,40,200,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
                      }}
                    >
                      {board.map((cell, idx) => {
                        const isWinCell = winResult?.line.includes(idx);
                        const ocid = CELL_OCIDS[idx];
                        const isClickable =
                          !cell &&
                          !gameOver &&
                          !thinking &&
                          !(mode === "computer" && currentTurn === "O");
                        return (
                          <motion.button
                            key={ocid}
                            type="button"
                            data-ocid={ocid}
                            onClick={() => handleCellClick(idx)}
                            disabled={!isClickable}
                            className="w-20 h-20 rounded-xl flex items-center justify-center relative overflow-hidden"
                            style={{
                              background: isWinCell
                                ? "rgba(255,200,50,0.2)"
                                : cell
                                  ? "rgba(60,30,120,0.6)"
                                  : "rgba(40,20,80,0.5)",
                              border: isWinCell
                                ? "2px solid rgba(255,200,50,0.7)"
                                : "1px solid rgba(160,80,255,0.25)",
                              boxShadow: isWinCell
                                ? "0 0 20px rgba(255,200,50,0.4), inset 0 0 10px rgba(255,200,50,0.1)"
                                : cell
                                  ? "0 4px 15px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)"
                                  : "0 6px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
                              cursor: isClickable ? "pointer" : "default",
                            }}
                            whileHover={
                              isClickable
                                ? {
                                    scale: 1.08,
                                    translateY: -4,
                                    boxShadow:
                                      "0 12px 30px rgba(160,80,255,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                                  }
                                : {}
                            }
                            whileTap={isClickable ? { scale: 0.95 } : {}}
                          >
                            {cell === "X" && (
                              <motion.div
                                className="relative w-12 h-12"
                                initial={{ scale: 0, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                              >
                                <div
                                  className="absolute inset-0 flex items-center justify-center"
                                  style={{
                                    fontSize: "2.5rem",
                                    fontWeight: 900,
                                    color: "#ef4444",
                                    textShadow:
                                      "0 0 15px #ef4444, 0 0 30px rgba(239,68,68,0.5)",
                                    lineHeight: 1,
                                  }}
                                >
                                  ✕
                                </div>
                              </motion.div>
                            )}
                            {cell === "O" && (
                              <motion.div
                                className="w-10 h-10 rounded-full"
                                style={{
                                  border: "3px solid #60a5fa",
                                  boxShadow:
                                    "0 0 15px #60a5fa, 0 0 30px rgba(96,165,250,0.4), inset 0 0 10px rgba(96,165,250,0.1)",
                                }}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                              />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Play Again */}
                {gameOver && (
                  <motion.button
                    type="button"
                    data-ocid="ttt.restart_button"
                    onClick={resetGame}
                    className="px-8 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                      boxShadow: "0 0 20px rgba(120,60,255,0.4)",
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    🔄 Play Again
                  </motion.button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
