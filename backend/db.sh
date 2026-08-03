#!/usr/bin/env bash
# Open psql against the database this app actually uses.
# Reads host/port/user/password/dbname straight from .env, so there is nothing
# to type and nothing to remember.
#
#   ./db.sh                      -> interactive psql session
#   ./db.sh "select * from users;"  -> run one query and exit
set -euo pipefail
cd "$(dirname "$0")"

[ -f .env ] || { echo "no .env in $(pwd)" >&2; exit 1; }

eval "$(python3 - <<'PY'
import re, pathlib, shlex, urllib.parse as up
text = pathlib.Path('.env').read_text()
m = re.search(r'DATABASE_URL="([^"]+)"', text)
if not m:
    raise SystemExit('DATABASE_URL not found in .env')
u = up.urlparse(m.group(1).replace('postgresql+psycopg2://', 'postgresql://'))
# shell-quote the decoded password; URL-encoding it again would break auth
print(f'export PGPASSWORD={shlex.quote(up.unquote(u.password or ""))}')
print(f'PGHOST={shlex.quote(u.hostname or "localhost")}')
print(f'PGPORT={u.port or 5432}')
print(f'PGUSER={shlex.quote(u.username or "postgres")}')
print(f'PGDB={shlex.quote(u.path.lstrip("/"))}')
PY
)"

PSQL=/Library/PostgreSQL/18/bin/psql
[ -x "$PSQL" ] || PSQL=$(command -v psql) || { echo "psql not found" >&2; exit 1; }

if [ $# -gt 0 ]; then
  "$PSQL" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDB" -c "$*"
else
  echo "connected to $PGDB on port $PGPORT as $PGUSER"
  "$PSQL" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDB"
fi
