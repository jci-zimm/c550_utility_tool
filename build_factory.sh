#!/bin/bash

# fail on any command not working 
set -e 

# Install dependencies 
npm install

# Build Exe
npm run build-exe

# Store output
zip -j -r $SARROOT/sar/artifacts/$BLD_REPO/$BLD_BRANCH/$BLD_NUM/c550-utility-tool-${BLD_NUM}.zip c550_utility_tool.exe c550_config_default.txt instructions.pdf

