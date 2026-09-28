# Gesture animations (Demo 2 assets)

Nothing here yet - Demo 2 is not built. This folder is the intended home for the hand-drawn
animation loops that MediaPipe gestures will trigger.

Files in `public/` are served from the site root, so a frame saved at
`public/assets/gestures/open_palm/frame_004.png` is fetched as `assets/gestures/open_palm/frame_004.png`
(relative to the site's base path).

## Intended format

One folder per gesture, named after the MediaPipe Gesture Recognizer category, containing a
zero-padded PNG frame sequence starting at `frame_001.png`:

```
assets/gestures/
  open_palm/     frame_001.png, frame_002.png, ...
  closed_fist/   frame_001.png, ...
  thumb_up/      frame_001.png, ...
  victory/       frame_001.png, ...
  pointing_up/   frame_001.png, ...
  iloveyou/      frame_001.png, ...
```

Guidelines for the drawings themselves:

- **PNG with transparency**, so a loop can sit over the camera view or a flat colour.
- **Same canvas size for every frame in a gesture.** 1024 x 1024 is a good default;
  smaller is fine if the loop is meant to be small on screen.
- **12 to 24 frames** is plenty for a readable loop. Frame rate is a per-gesture setting,
  not baked into the files.
- **Consecutive numbering with no gaps** - the loader will count up until a frame 404s.

A small `manifest.json` per gesture (frame count, frame rate, whether it loops or plays once)
is likely to land alongside the frames when Demo 2 is built.
