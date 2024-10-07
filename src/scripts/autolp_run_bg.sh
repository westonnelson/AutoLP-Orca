#!/bin/bash
# simply script to run the AutoLP in the background, place in the root of the project

npm run build
npm run start > output.log 2>&1 &
disown %1
echo "AutoLP started"
