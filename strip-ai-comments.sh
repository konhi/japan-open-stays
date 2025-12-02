#!/bin/sh

FILE="$1"

if [ -z "$FILE" ]; then
  echo "Usage: sh strip-ai-comments.sh <file>"
  exit 1
fi

# Remove // AI: ... lines
# (Write to temp file because sed -i without backup isn't portable across shells)
sed '/^[[:space:]]*\/\/[[:space:]]*AI:/d' "$FILE" > "$FILE.tmp1"

# Remove /* ... AI: ... */ multiline blocks
awk '
  BEGIN { inside = 0 }
  {
    if (inside) {
      if ($0 ~ /\*\//) {
        if (block ~ /AI:/) {
          # drop entire block
        } else {
          printf "%s\n", block
          printf "%s\n", $0
        }
        inside = 0
        block = ""
      } else {
        block = block $0 "\n"
      }
    } else {
      if ($0 ~ /\/\*/) {
        inside = 1
        block = $0 "\n"
      } else {
        print $0
      }
    }
  }
' "$FILE.tmp1" > "$FILE.tmp2"

mv "$FILE.tmp2" "$FILE"
rm "$FILE.tmp1"
