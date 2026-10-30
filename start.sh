#!/bin/sh
cd "$(dirname "$0")" && echo "KAIRENZ studio → http://127.0.0.1:4321" && python3 -m http.server 4321 --bind 127.0.0.1
