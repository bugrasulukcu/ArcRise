#!/bin/sh
# Oyun dosyalari degistiyse www/ + Android + iOS kopyalarini gunceller.
# Git kancalari (post-commit, post-merge, post-checkout) tarafindan cagrilir.
# Kullanim: sync-native.sh <eski-commit> <yeni-commit>
OLD="$1"; NEW="$2"
cd "$(git rev-parse --show-toplevel)" || exit 0

if [ -n "$OLD" ] && [ "$OLD" != "0000000000000000000000000000000000000000" ]; then
  CHANGED=$(git diff --name-only "$OLD" "$NEW" 2>/dev/null)
else
  CHANGED=$(git diff-tree --no-commit-id --name-only -r "$NEW" 2>/dev/null)
fi

echo "$CHANGED" | grep -Eq '^(arcrise\.html|index\.html|AUDIO/|PNG/|FONTS/|capacitor\.config\.json)' || exit 0

echo "[ArcRise] Oyun dosyalari degisti -> Android/iOS kopyalari guncelleniyor..."
if node sync-www.js >/dev/null && npx --no-install cap copy android >/dev/null 2>&1 \
   && npx --no-install cap copy ios >/dev/null 2>&1 && node verify-sync.js >/dev/null; then
  echo "[ArcRise] Hazir: Android Studio / Xcode'da Run ile en son hal acilir."
else
  echo "[ArcRise] UYARI: otomatik senkron basarisiz. Elle calistir: npm run sync"
fi
exit 0
