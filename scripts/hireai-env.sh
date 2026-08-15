#!/usr/bin/env bash
# scripts/hireai-env.sh
#
# Defines start / stop / status commands in Git Bash.
#
# AUTOMATIC (VS Code integrated terminal — configured via .vscode/settings.json):
#   Open any terminal in VS Code — functions are available immediately.
#
# MANUAL (standalone Git Bash or first time):
#   source scripts/hireai-env.sh
#
# ONE-TIME PERSISTENT SETUP (optional — adds to your ~/.bashrc):
#   echo "source $(cygpath -u "$(pwd)")/scripts/hireai-env.sh" >> ~/.bashrc

# Resolve the scripts directory as a Windows path (for powershell.exe -File)
_HIREAI_SCRIPTS_WIN="$(cygpath -w "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"

_hireai_ps() {
    local script="$1"; shift
    powershell.exe -NoProfile -ExecutionPolicy Bypass \
        -File "${_HIREAI_SCRIPTS_WIN}\\${script}.ps1" "$@"
}

start() {
    _hireai_ps start
}

stop() {
    _hireai_ps stop
}

status() {
    _hireai_ps status
}

echo "[HireAI] Commands available: start | stop | status"
