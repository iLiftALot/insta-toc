#!/bin/zsh

# Make local commands available within the testing environment
source ~/.zshrc

# /<HOME>/.nvm/versions/node/<VERSION>/bin/*.exe
NODE_VERSION=$(node -v)
EXEC_PATHS="$HOME/.nvm/versions/node/$NODE_VERSION/bin"

VITEST_PATH="$EXEC_PATHS/vitest"
NPX_PATH="$EXEC_PATHS/npx"

CWD=$(pwd)
CONFIG_PATH=$(find "$CWD" -name "vitest.config.ts" \
    -not -path "$CWD/node_modules/*" \
    -not -path "$CWD/.*" \
    -not -path "$CWD/dist*" \
    -not -path "$CWD/src*" \
    -not -path "$CWD/coverage*" \
    -not -path "$CWD/assets*")

if [ -z "$CONFIG_PATH" ]; then
    echo "Vitest config not found!"
    exit 1
fi

#"$VITEST_PATH" --ui --config "$CONFIG_PATH"
#"$NPM_PATH" vitest --ui --config "$CONFIG_PATH"
npx vitest --ui --config "$CONFIG_PATH"

