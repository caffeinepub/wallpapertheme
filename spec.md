# Reckon - Omegle Video Chat

## Current State
The app has an OmegleChat.tsx component (1977 lines) but real-time WebRTC between real users is broken. Camera/mic access issues persist. The backend has no Omegle signaling support.

## Requested Changes (Diff)

### Add
- Backend Omegle signaling: queue, matchmaking, WebRTC signal exchange, chat messages
- Proper getUserMedia with error recovery in frontend
- Real WebRTC peer connection using backend as signaling relay
- Local video preview shown immediately on permission grant
- Stranger video shown when matched and connected
- Camera on/off toggle, mic on/off toggle
- Chat panel alongside video
- Country/age display for matched user
- "Next" button to skip to a new stranger
- Connection sound/animation on match

### Modify
- OmegleChat.tsx: full rewrite for working WebRTC with backend signaling
- Backend main.mo: add Omegle signaling APIs

### Remove
- Old broken OmegleChat simulation code

## Implementation Plan
1. Add Omegle signaling to main.mo: joinQueue, pollMatch, sendSignal, getSignals, sendOmegleChat, getOmegleChats, leaveOmegle
2. Regenerate backend bindings
3. Rewrite OmegleChat.tsx with real WebRTC + backend polling signaling
