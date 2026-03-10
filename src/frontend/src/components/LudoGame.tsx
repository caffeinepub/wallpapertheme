import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAvatarColor, getInitials, useReckon } from "../App";

interface LudoGameProps {
  open: boolean;
  onClose: () => void;
}

const PLAYER_COLORS = [
  { name: "Red", bg: "#ef4444", light: "#fca5a5", zone: "red" },
  { name: "Blue", bg: "#3b82f6", light: "#93c5fd", zone: "blue" },
  { name: "Green", bg: "#22c55e", light: "#86efac", zone: "green" },
  { name: "Yellow", bg: "#eab308", light: "#fde047", zone: "yellow" },
];

const PLAYER_START = [0, 13, 26, 39];

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

type GameMode = "players" | "computer" | null;

export default function LudoGame({ open, onClose }: LudoGameProps) {
  const { allUsers, currentUser } = useReckon();
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [computerThinking, setComputerThinking] = useState(false);

  const [positions, setPositions] = useState<number[]>([-1, -1, -1, -1]);

  const computerUser = {
    id: "computer_ai",
    name: "Computer",
    email: "",
    phone: "",
    password: "",
    city: "AI",
    createdAt: 0,
  };

  const players =
    gameMode === "computer"
      ? [currentUser, computerUser]
      : [
          currentUser,
          ...allUsers.filter((u) => u.id !== currentUser.id).slice(0, 3),
        ].slice(0, 4);

  const playSound = useCallback(
    (type: "roll" | "move" | "win") => {
      if (!soundOn) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
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

  const doRoll = useCallback(
    (
      forPlayer: number,
      onDone?: (val: number, newPositions: number[]) => void,
    ) => {
      let count = 0;
      const interval = setInterval(() => {
        setDiceValue(Math.floor(Math.random() * 6) + 1);
        count++;
        if (count >= 8) {
          clearInterval(interval);
          const finalVal = Math.floor(Math.random() * 6) + 1;
          setDiceValue(finalVal);
          setRolling(false);

          setPositions((prev) => {
            const next = [...prev];
            const startPos = PLAYER_START[forPlayer];
            if (next[forPlayer] === -1) {
              if (finalVal === 6) {
                next[forPlayer] = startPos;
                playSound("move");
              }
            } else {
              const newPos = next[forPlayer] + finalVal;
              if (newPos >= 52) {
                next[forPlayer] = 52;
                setWinner(forPlayer);
                playSound("win");
              } else {
                next[forPlayer] = newPos;
                playSound("move");
              }
            }
            onDone?.(finalVal, next);
            return next;
          });

          if (finalVal !== 6) {
            setCurrentPlayer((p) => {
              const numPlayers = gameMode === "computer" ? 2 : players.length;
              return (p + 1) % numPlayers;
            });
          }
        }
      }, 80);
    },
    [playSound, gameMode, players.length],
  );

  const rollDice = () => {
    if (rolling || !gameStarted || winner !== null || computerThinking) return;
    if (gameMode === "computer" && currentPlayer === 1) return;
    setRolling(true);
    playSound("roll");
    doRoll(currentPlayer, (finalVal, _newPositions) => {
      if (gameMode === "computer" && finalVal !== 6 && winner === null) {
        const nextP = (currentPlayer + 1) % 2;
        if (nextP === 1) {
          setComputerThinking(true);
          setTimeout(() => {
            setComputerThinking(false);
            setRolling(true);
            playSound("roll");
            // Computer rolls
            let count = 0;
            const interval = setInterval(() => {
              setDiceValue(Math.floor(Math.random() * 6) + 1);
              count++;
              if (count >= 8) {
                clearInterval(interval);
                const cv = Math.floor(Math.random() * 6) + 1;
                setDiceValue(cv);
                setRolling(false);
                setPositions((prev) => {
                  const next = [...prev];
                  if (next[1] === -1) {
                    if (cv === 6) {
                      next[1] = PLAYER_START[1];
                      playSound("move");
                    }
                  } else {
                    const np = next[1] + cv;
                    if (np >= 52) {
                      next[1] = 52;
                      setWinner(1);
                      playSound("win");
                    } else {
                      next[1] = np;
                      playSound("move");
                    }
                  }
                  return next;
                });
                if (cv !== 6) {
                  setCurrentPlayer(0);
                }
              }
            }, 80);
          }, 1500);
        }
      }
    });
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameMode(null);
    setPositions([-1, -1, -1, -1]);
    setDiceValue(null);
    setCurrentPlayer(0);
    setWinner(null);
    setComputerThinking(false);
  };

  useEffect(() => {
    return () => {
      audioCtxRef.current?.close();
    };
  }, []);

  const diceFaces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

  const boardCells = Array.from({ length: 15 }, (_, row) =>
    Array.from({ length: 15 }, (_, col) => ({ row, col })),
  );

  function getCellColor(row: number, col: number): string {
    if (row < 6 && col < 6) return "#fca5a5";
    if (row < 6 && col > 8) return "#93c5fd";
    if (row > 8 && col < 6) return "#86efac";
    if (row > 8 && col > 8) return "#fde047";
    if (row >= 6 && row <= 8 && col >= 6 && col <= 8) return "#c084fc";
    return "#f8fafc";
  }

  function getTokensAtCell(row: number, col: number): number[] {
    const result: number[] = [];
    const numPlayers = gameMode === "computer" ? 2 : players.length;
    for (let p = 0; p < numPlayers; p++) {
      const pos = positions[p];
      if (pos === -1 || pos === 52) continue;
      const playerPos = (pos - PLAYER_START[p] + 52) % 52;
      const targetRow = Math.floor(
        7 + Math.cos((playerPos / 52) * Math.PI * 2) * 5,
      );
      const targetCol = Math.floor(
        7 + Math.sin((playerPos / 52) * Math.PI * 2) * 5,
      );
      if (targetRow === row && targetCol === col) {
        result.push(p);
      }
    }
    return result;
  }

  if (!open) return null;

  const numPlayers = gameMode === "computer" ? 2 : players.length;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full max-w-2xl rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0f0f1a, #1a0a2e)",
            border: "1px solid rgba(150,100,255,0.3)",
            boxShadow: "0 0 60px rgba(120,60,255,0.2)",
          }}
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: "rgba(150,100,255,0.2)" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎲</span>
              <div>
                <h2 className="font-bold text-white text-lg">Ludo Game</h2>
                <p
                  className="text-xs"
                  style={{ color: "rgba(200,150,255,0.7)" }}
                >
                  {gameMode === "computer"
                    ? "2 players (vs Computer)"
                    : `${numPlayers} players`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-ocid="ludo.sound_toggle"
                onClick={() => setSoundOn((v) => !v)}
                className="p-2 rounded-lg transition-colors text-sm"
                style={{
                  background: soundOn
                    ? "rgba(100,200,100,0.2)"
                    : "rgba(100,100,100,0.2)",
                  border: `1px solid ${soundOn ? "rgba(100,200,100,0.4)" : "rgba(100,100,100,0.3)"}`,
                  color: soundOn ? "#86efac" : "#9ca3af",
                }}
                title={soundOn ? "Sound On" : "Sound Off"}
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
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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

          <div className="flex flex-col md:flex-row gap-4 p-4">
            {/* Board */}
            <div className="flex-shrink-0">
              <div
                className="grid rounded-xl overflow-hidden"
                style={{
                  gridTemplateColumns: "repeat(15, 1fr)",
                  width: "min(300px, 90vw)",
                  height: "min(300px, 90vw)",
                  border: "2px solid rgba(150,100,255,0.4)",
                  boxShadow: "0 0 20px rgba(120,60,255,0.2)",
                }}
              >
                {boardCells.flat().map(({ row, col }) => {
                  const tokens = getTokensAtCell(row, col);
                  const bg = getCellColor(row, col);
                  return (
                    <div
                      key={`${row}-${col}`}
                      className="flex items-center justify-center relative"
                      style={{
                        background: bg,
                        border: "0.5px solid rgba(0,0,0,0.1)",
                        aspectRatio: "1",
                      }}
                    >
                      {tokens.map((p) => (
                        <div
                          key={p}
                          className="w-3/4 h-3/4 rounded-full"
                          style={{
                            background: PLAYER_COLORS[p].bg,
                            boxShadow: `0 0 4px ${PLAYER_COLORS[p].bg}`,
                          }}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex flex-col gap-3">
              {/* Mode selection (before game started) */}
              {!gameStarted && !gameMode && (
                <div className="space-y-2">
                  <p
                    className="text-xs text-center"
                    style={{ color: "rgba(200,150,255,0.7)" }}
                  >
                    Select Game Mode
                  </p>
                  <button
                    type="button"
                    data-ocid="ludo.mode_vs_players_button"
                    onClick={() => setGameMode("players")}
                    className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105 flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                      color: "white",
                      boxShadow: "0 0 15px rgba(99,102,241,0.3)",
                    }}
                  >
                    👥 vs Players
                  </button>
                  <button
                    type="button"
                    data-ocid="ludo.mode_vs_computer_button"
                    onClick={() => setGameMode("computer")}
                    className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105 flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                      color: "white",
                      boxShadow: "0 0 15px rgba(120,60,255,0.3)",
                    }}
                  >
                    🤖 vs Computer
                  </button>
                </div>
              )}

              {/* Players list */}
              {gameMode && (
                <div className="space-y-2">
                  {players.slice(0, numPlayers).map((player, idx) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all"
                      style={{
                        background:
                          currentPlayer === idx && gameStarted
                            ? `${PLAYER_COLORS[idx].bg}22`
                            : "rgba(255,255,255,0.05)",
                        border: `1px solid ${currentPlayer === idx && gameStarted ? `${PLAYER_COLORS[idx].bg}66` : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
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
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          background: PLAYER_COLORS[idx].bg,
                          boxShadow: `0 0 6px ${PLAYER_COLORS[idx].bg}`,
                        }}
                      />
                      <p className="text-xs font-medium text-white flex-1 truncate">
                        {player.name}
                        {player.id === currentUser.id && " (You)"}
                      </p>
                      <span
                        className="text-[10px]"
                        style={{ color: PLAYER_COLORS[idx].light }}
                      >
                        {positions[idx] === -1
                          ? "Ready"
                          : positions[idx] === 52
                            ? "🏆 Won!"
                            : `Pos ${positions[idx]}`}
                      </span>
                      {currentPlayer === idx &&
                        gameStarted &&
                        winner === null && (
                          <span className="text-xs animate-pulse">▶</span>
                        )}
                    </div>
                  ))}
                </div>
              )}

              {/* Computer thinking */}
              {computerThinking && (
                <p
                  className="text-xs text-center animate-pulse"
                  style={{ color: "rgba(200,150,255,0.7)" }}
                >
                  🤖 Computer is thinking...
                </p>
              )}

              {winner !== null && (
                <div
                  className="text-center py-3 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${PLAYER_COLORS[winner].bg}33, ${PLAYER_COLORS[winner].bg}11)`,
                    border: `1px solid ${PLAYER_COLORS[winner].bg}66`,
                  }}
                >
                  <p className="text-lg">🏆</p>
                  <p className="text-sm font-bold text-white">
                    {players[winner]?.name} wins!
                  </p>
                </div>
              )}

              {gameStarted && winner === null && (
                <div className="text-center">
                  <p
                    className="text-xs mb-2"
                    style={{ color: "rgba(200,150,255,0.7)" }}
                  >
                    {players[currentPlayer]?.name}'s turn
                    {positions[currentPlayer] === -1
                      ? " — roll 6 to enter!"
                      : ""}
                  </p>
                  <button
                    type="button"
                    data-ocid="ludo.dice_button"
                    onClick={rollDice}
                    disabled={
                      rolling ||
                      computerThinking ||
                      (gameMode === "computer" && currentPlayer === 1)
                    }
                    className="text-5xl transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                    style={{
                      filter: "drop-shadow(0 0 8px rgba(150,100,255,0.6))",
                    }}
                  >
                    {diceValue ? diceFaces[diceValue - 1] : "🎲"}
                  </button>
                  {diceValue && !rolling && (
                    <p
                      className="text-xs mt-1"
                      style={{ color: "rgba(200,150,255,0.7)" }}
                    >
                      Rolled: {diceValue}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 mt-auto">
                {gameMode && !gameStarted ? (
                  <button
                    type="button"
                    data-ocid="ludo.start_button"
                    onClick={() => {
                      setGameStarted(true);
                      setPositions([-1, -1, -1, -1]);
                      setCurrentPlayer(0);
                      setWinner(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                      color: "white",
                      boxShadow: "0 0 20px rgba(120,60,255,0.4)",
                    }}
                  >
                    🎮 Start Game
                  </button>
                ) : winner !== null ? (
                  <button
                    type="button"
                    data-ocid="ludo.start_button"
                    onClick={resetGame}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                      color: "white",
                      boxShadow: "0 0 20px rgba(120,60,255,0.4)",
                    }}
                  >
                    🔄 Play Again
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
