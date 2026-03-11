# Reckon Messenger

## Current State
- OmegleChat component uses an iframe to embed omegleweb.io, which refuses to load due to X-Frame-Options/CSP blocking ("refuse to connect" error)
- Ludo 2D Canvas tokens are drawn but appear small and lack strong visual presence

## Requested Changes (Diff)

### Add
- WebRTC signaling in Motoko backend: waiting queue, matched pairs, offer/answer/ICE candidate exchange
- OmegleChat: full browser-based WebRTC peer-to-peer random video chat (no iframe), with local camera preview, stranger video, city/country/age display, next/disconnect, animated connection effects
- Ludo tokens: 3D gradient fill, neon glow ring, larger radius, pulsing scale animation on movable tokens, floating shadow

### Modify
- OmegleChat.tsx: replace iframe with WebRTC implementation using backend signaling
- LudoGame.tsx: enhance drawTokens to use radial gradient, stronger glow, larger size, animated bounce effect
- main.mo: add signaling types and functions

### Remove
- iframe embed of omegleweb.io

## Implementation Plan
1. Add Motoko signaling: joinQueue, leaveQueue, pollMatch, sendSignal, getSignals functions
2. Rewrite OmegleChat to use getUserMedia + RTCPeerConnection + backend polling for signaling
3. Enhance LudoGame drawTokens with radial gradient, bigger radius, 3D shadow, neon glow pulse
