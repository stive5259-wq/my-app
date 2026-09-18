# DropForge 1.0.2 reliability update

This is an in-place hotfix for an existing working DropForge 1.0.1 installation.

It fixes the controlled empty-bass-MIDI bug, adds diagnostics/fail-loud behavior,
normalizes overlapping same-pitch bass MIDI, and adds content-addressed caching for
the selected structure and Demucs 16-bar section.

## Apply

From the existing clone:

```bash
cd "$HOME/Downloads/DropForge-GitHub"
git fetch origin
git checkout -B dropforge-1.0.2-reliability origin/dropforge-1.0.2-reliability
bash dropforge-update-1.0.2/apply-update.sh
```

The updater:

1. stops DropForge if it is running;
2. backs up the current source/config (not the large virtualenv);
3. overlays the 1.0.2 files;
4. runs compile + unit regression tests;
5. if the existing controlled job `7b7acca2d452` is present, runs Basic Pitch
   directly on that already-separated bass stem and requires a non-zero event result;
6. writes a verification MIDI:
   `~/Music/DropForge/7b7acca2d452/DropForge_Bass_RAW_1.0.2_VERIFY.mid`;
7. reopens DropForge.

Expected controlled regression output includes:

```text
Controlled fixture Basic Pitch events: 172
Controlled fixture regression: PASS
```

The exact event count can vary slightly by runtime/model serialization, but it must be
non-zero with non-zero note/onset activations.

Runtime logging after the update:
`~/Library/Application Support/DropForge/1.0.2/dropforge.log`
