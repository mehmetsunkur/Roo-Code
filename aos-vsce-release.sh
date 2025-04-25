shopt -s nullglob  # ensures the pattern expands to nothing if no match
files=(./bin/roo-cline-*.vsix)
if (( ${#files[@]} )); then
  echo "File exists: ${files[0]}"
else
  echo "Error! No matching file found: './bin/roo-cline-*.vsix'"
  exit 1
fi
cat <<EOF | docker build -t aos/aos-vsce:2 -t aos/aos-vsce:latest -f - .
FROM aos/aos-vsce:1
COPY ./bin/ /data
EOF
