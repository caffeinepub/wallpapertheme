import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

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

const CELL_KEYS = [
  "c0",
  "c1",
  "c2",
  "c3",
  "c4",
  "c5",
  "c6",
  "c7",
  "c8",
] as const;
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

function getBestMove(board: Cell[]): number {
  let bestVal = Number.NEGATIVE_INFINITY;
  let bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = "O";
      const moveVal = minimax(board, false, 0);
      board[i] = null;
      if (moveVal > bestVal) {
        bestVal = moveVal;
        bestMove = i;
      }
    }
  }
  return bestMove;
}

export default function TicTacToe3D({ open, onClose }: TicTacToe3DProps) {
  const [mode, setMode] = useState<Mode>(null);
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [currentTurn, setCurrentTurn] = useState<"X" | "O">("X");
  const [thinking, setThinking] = useState(false);

  const winResult = checkWinner(board);
  const isDraw = !winResult && board.every((c) => c !== null);

  const handleCellClick = (idx: number) => {
    if (board[idx] || winResult || isDraw || thinking) return;
    if (mode === "computer" && currentTurn === "O") return;

    const newBoard = [...board];
    newBoard[idx] = currentTurn;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result || newBoard.every((c) => c !== null)) return;

    const nextTurn = currentTurn === "X" ? "O" : "X";
    setCurrentTurn(nextTurn);

    if (mode === "computer" && nextTurn === "O") {
      setThinking(true);
      setTimeout(() => {
        const boardCopy = [...newBoard];
        const best = getBestMove(boardCopy);
        if (best >= 0) {
          boardCopy[best] = "O";
          setBoard(boardCopy);
        }
        setCurrentTurn("X");
        setThinking(false);
      }, 500);
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentTurn("X");
    setThinking(false);
  };

  const resetAll = () => {
    resetGame();
    setMode(null);
  };

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
          className="w-full max-w-md rounded-2xl overflow-hidden"
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
                <div className="text-center">
                  {winResult ? (
                    <motion.p
                      className="text-lg font-bold"
                      style={{
                        color: winResult.winner === "X" ? "#f87171" : "#60a5fa",
                      }}
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                    >
                      🏆{" "}
                      {winResult.winner === "X"
                        ? mode === "computer"
                          ? "You Win!"
                          : "Player X Wins!"
                        : mode === "computer"
                          ? "Computer Wins!"
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
                        const cellKey = CELL_KEYS[idx];
                        return (
                          <motion.button
                            key={cellKey}
                            type="button"
                            data-ocid={ocid}
                            onClick={() => handleCellClick(idx)}
                            className="w-20 h-20 rounded-xl flex items-center justify-center cursor-pointer relative overflow-hidden"
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
                            }}
                            whileHover={
                              !cell && !winResult && !isDraw
                                ? {
                                    scale: 1.08,
                                    translateY: -4,
                                    boxShadow:
                                      "0 12px 30px rgba(160,80,255,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                                  }
                                : {}
                            }
                            whileTap={!cell ? { scale: 0.95 } : {}}
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

                {/* Restart */}
                {(winResult || isDraw) && (
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
