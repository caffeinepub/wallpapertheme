# Reckon

## Current State
OmegleChat.tsx has Room ID-based PeerJS video chat with:
- Copy/paste Room Code to connect manually
- Chat panel + Members panel (desktop tabs, mobile overlay)
- Camera/mic toggle buttons
- Status badge, Safe Chat badge
- Disconnect button at bottom
- No exit button on video overlay
- No auto-matching / pairing timer
- No "Add User" button during live call

## Requested Changes (Diff)

### Add
- **120-second pairing timer**: "Find Stranger" button starts auto-matching countdown (120s). Uses backend queue polling. Shows animated countdown ring + seconds remaining. On timeout, shows "No one found - try again" message.
- **Exit button fixed at top of video**: Large visible "Exit" button pinned to top-right of the video area when in a call or searching, always accessible.
- **Add User button during live call**: Button visible during connected state. Opens a small dialog/overlay showing the user's Room Code with a copy button so they can invite a third person.
- **Auto-match mode**: Backend queue join/poll for random stranger pairing as alternative to manual Room Code entry.

### Modify
- Layout fixes: video area takes full height, controls bar at bottom is compact, no overflow issues on mobile
- Exit button moved to top-right of video overlay (absolute position)
- Bottom controls reorganized: cam, mic, add-user, exit grouped cleanly
- Pairing UI shows timer ring animation during search
- Room Code connect kept as secondary option

### Remove
- Nothing removed, existing manual Room Code flow kept alongside auto-match

## Implementation Plan
1. Add `searchTimer` state (0-120) and `searchMode` state ("auto" | "manual" | null)
2. Auto-match: on "Find Stranger" click, call backend `joinOmegleQueue` + poll `getOmegleMatch`, start 120s countdown interval
3. On 120s timeout: stop polling, show timeout message, clear state
4. Exit button: absolute top-right on video container, always visible when status != idle, calls handleDisconnect
5. Add User button: appears in bottom controls when connected, opens inline overlay showing roomCode + copy
6. Layout: fix flex structure so video fills space properly on all screen sizes
