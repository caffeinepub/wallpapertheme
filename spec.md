# Reckon Messenger

## Current State
- Login page: pink/black background, slow zoom-out animation, WhatsApp support on login only, language translation widget (Globe button)
- Sidebar: Ludo game button (vs real users only)
- App: video call (WebRTC), real-time users, footer with RAHUL PARMAR neon glow
- "Built with Caffeine AI" already removed

## Requested Changes (Diff)

### Add
- 3D Tic-Tac-Toe game component (TicTacToe3D.tsx) with vs Computer and vs Player modes
- Tic-Tac-Toe button in sidebar next to Ludo button
- Ludo vs Computer mode: computer AI auto-rolls and moves its token
- Omegle random video chat feature: button in app header, opens fullscreen modal with user's camera + simulated stranger UX and Next button

### Modify
- LudoGame.tsx: add mode selector ("vs Players" or "vs Computer"); computer players auto-roll with 1.5s delay after human turn
- Sidebar.tsx: add TicTacToe3D button alongside Ludo button
- App.tsx: add "Omegle" button in header bar visible when logged in

### Remove
- Nothing

## Implementation Plan
1. Create TicTacToe3D.tsx - CSS 3D perspective board, X/O as 3D shapes, computer AI with minimax
2. Modify LudoGame.tsx - add mode selector, computer auto-roll logic
3. Modify Sidebar.tsx - add TicTacToe3D state and button
4. Create OmegleChat.tsx - fullscreen modal, getUserMedia camera, simulated stranger connection
5. Modify App.tsx - add Omegle button in header
