# DropForge 1.0.1 Fixed Pack

The original binary ZIP commit on this branch was replaced because it was truncated during the ChatGPT-to-GitHub handoff.

The fixed distribution is stored as five plain-text Base64 chunks. This avoids binary upload corruption. The installer reconstructs the exact ZIP locally, verifies its SHA-256, verifies ZIP integrity, extracts it, and starts the macOS installer.

Expected ZIP SHA-256:

`3581d8faa2a74413a8531d28d261ed3f51c5962af12b71b0f2efe077968c164e`

If you cloned this branch before the repair:

```bash
cd "$HOME/Downloads/DropForge-GitHub"
git fetch origin
git reset --hard origin/dropforge-1.0.1-fixed
bash dropforge-dist/install-fixed-pack.sh
```

The reconstruction must print:

```text
Checksum OK.
ZIP integrity OK.
```

before installation starts.
