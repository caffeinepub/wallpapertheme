# Reckon Messenger

## Current State
Fully working messenger with Auth, Sidebar, ChatPanel, OnlineUsers panel, Footer, WhatsApp button, Ludo game, 3D emojis, video call icon (non-functional toast). City detection uses Nominatim geolocation API but only runs once at login. Demo users have static cities.

## Requested Changes (Diff)

### Add
- Real-time video call between users: WebRTC peer-to-peer video call with localStorage-based signaling (polling every 1s). Clicking the Video button in ChatPanel header sends a call request. The other user (or another browser tab) sees an incoming call modal with Accept/Decline. On accept, WebRTC negotiation happens via localStorage signals. Shows a full-screen call UI with local + remote video feeds, mute/end buttons.
- Create `VideoCall.tsx` component that handles: outgoing call screen, incoming call screen, and active call screen with video streams.
- Auto-detect real-time city for logged-in user using browser Geolocation + Nominatim reverse geocoding. Show city in the OnlineUsers panel prominently. Also detect city on register/first login.

### Modify
- ChatPanel video button: wire it to open VideoCall for the current conversation partner (only for direct chats, not groups)
- App.tsx: add video call state (incomingCall, activeCall) to context so any component can respond to incoming calls
- OnlineUsers: city should show under user name with a map pin icon
- Auth.tsx: after successful register/login, trigger geolocation city detection immediately and show a prompt

### Remove
- The toast-only video call button behavior

## Implementation Plan
1. Extend ReckonContext to include videoCall state: `outgoingCall`, `incomingCall`, `activeCallUserId`, handlers
2. Create `src/frontend/src/components/VideoCall.tsx` with WebRTC + localStorage signaling
3. Wire video button in ChatPanel to `initiateCall(partnerId)`
4. Add incoming call overlay in App.tsx (shows for all screens)
5. City detection: call on login and show city in OnlineUsers with map-pin icon
