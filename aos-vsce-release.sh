shopt -s nullglob  # ensures the pattern expands to nothing if no match
files=(./bin/aos-code-*.vsix)
if (( ${#files[@]} )); then
  echo "File exists: ${files[0]}"
  the_file_path="${files[0]}"
  the_file=$(basename "$the_file_path")
  echo "File name: $the_file"
else
  echo "Error! No matching file found: './bin/raos-code-*.vsix'"
  exit 1
fi
cat <<EOF | docker build -t aos/aos-vsce:2 -t aos/aos-vsce:latest -f - .
FROM aos/aos-vsce:1
COPY ./bin/ /data
RUN echo "$the_file" > /data/latest.txt
EOF
