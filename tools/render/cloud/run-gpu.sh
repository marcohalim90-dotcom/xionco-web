#!/usr/bin/env bash
# ==========================================================================
#  XIONCO — render Galeri di mesin GPU sewaan (Linux, root). Panduan: tools/render/cloud/README.md
#  Pakai:  bash run-gpu.sh <skrip> [argumen skrip …]
#          bash run-gpu.sh galeryB1 --frames 0-179 --size 1600x900 --samples 96
#          bash run-gpu.sh galery12 --stills --size 1600x900 --samples 96
#  Langkah: buka paket /workspace/xionco-render.tar → pasang Blender (sekali) → render dengan --gpu
#           → hasil dikemas ke /workspace/hasil-<skrip>.tar
# ==========================================================================
set -uo pipefail
W=${XC_DIR:-/workspace/xionco}
PACK=${XC_PACK:-/workspace/xionco-render.tar}
SERIES=${BLENDER_SERIES:-5.2}
SCRIPT=${1:?"nama skrip, mis. galeryB1"}; shift
mkdir -p "$W"

# 1. paket proyek (dibuka ulang bila paket lebih baru)
if [ -f "$PACK" ] && { [ ! -f "$W/.dibuka" ] || [ "$PACK" -nt "$W/.dibuka" ]; }; then
  echo "[xionco] membuka paket …"; tar -xf "$PACK" -C "$W" && touch "$W/.dibuka"
fi
[ -f "$W/tools/render/$SCRIPT.py" ] || { echo "[xionco] skrip tools/render/$SCRIPT.py tidak ada di paket"; exit 1; }

# 2. Blender Linux resmi (seri yang sama dengan komputer kantor), sekali per mesin
B=$(ls -d /workspace/blender-*-linux-x64/blender 2>/dev/null | sort -V | tail -1)
if [ -z "$B" ]; then
  echo "[xionco] memasang Blender $SERIES …"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq && apt-get install -y -qq wget xz-utils libx11-6 libxi6 libxxf86vm1 libxfixes3 libxrender1 \
    libxkbcommon0 libgl1 libegl1 libsm6 libice6 >/dev/null
  F=$(wget -qO- "https://download.blender.org/release/Blender$SERIES/" | grep -o "blender-$SERIES\.[0-9]*-linux-x64\.tar\.xz" | sort -uV | tail -1)
  [ -n "$F" ] || { echo "[xionco] Blender $SERIES untuk Linux tidak ditemukan di download.blender.org"; exit 1; }
  wget -q -O "/workspace/$F" "https://download.blender.org/release/Blender$SERIES/$F" && tar -xf "/workspace/$F" -C /workspace && rm -f "/workspace/$F"
  B=$(ls -d /workspace/blender-*-linux-x64/blender | sort -V | tail -1)
fi
echo "[xionco] $("$B" --version 2>/dev/null | head -1)"
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null | sed 's/^/[xionco] GPU: /'

# 3. render (rlib.cycles memilih OptiX / CUDA; tanpa GPU kembali ke CPU)
cd "$W"
T0=$(date +%s)
"$B" -b --factory-startup -P "tools/render/$SCRIPT.py" -- "$@" --gpu 2>&1 | tee -a "/workspace/log-$SCRIPT.txt"
echo "[xionco] render selesai dalam $(( ($(date +%s) - T0) / 60 )) menit (kode ${PIPESTATUS[0]})"

# 4. hasil (dikemas walau render berhenti di tengah, supaya frame yang sudah jadi tidak hilang)
D="output/galeri/$SCRIPT"; [ -d "$D" ] || D="output"
tar -cf "/workspace/hasil-$SCRIPT.tar" -C "$W" "$D" && echo "[xionco] hasil: /workspace/hasil-$SCRIPT.tar ($(du -h "/workspace/hasil-$SCRIPT.tar" | cut -f1))"
