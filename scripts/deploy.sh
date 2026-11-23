#!/usr/bin/env bash
# Deploys the app to one environment, one version at a time, always with a new version number
# (procedure in docs/DEPLOYMENT.md).
#
#   scripts/deploy.sh <environment-url>          deploy (from the repository it lives in)
#   scripts/deploy.sh --check-credentials         say how the deploy will sign in, and stop
#
# Sign-in:
#   * When the credentials file exists — $PVS_DEPLOY_ENV, or ~/.config/pvs/deploy.env — the deploy
#     signs in with what it holds and opens no browser. Accepted lines (KEY=VALUE, nothing else is read):
#       DT_APP_OAUTH_CLIENT_ID / DT_APP_OAUTH_CLIENT_SECRET  an OAuth client with app-engine:apps:install
#                                                            and app-engine:apps:run (Dynatrace's documented
#                                                            way to deploy without a browser)
#       DT_APP_PLATFORM_TOKEN                                or a platform token with the same two scopes
#     The file is yours: mode 600, outside the repository. This script never prints, copies or
#     logs its values — it does not `source` it, so not even a malformed line can echo a secret.
#   * Otherwise the browser sign-in: the SSO link is shown here the moment the CLI emits it, and a
#     localhost:5343 address with code= can be pasted back when the browser stays on "Loading…".
set -u
export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH
REPO=$(cd "$(dirname "$0")/.." && pwd)
ENV_FILE=${PVS_DEPLOY_ENV:-$HOME/.config/pvs/deploy.env}

load_credentials() {
  CREDENTIALS=browser
  [ -e "$ENV_FILE" ] || return 0
  local mode key value
  mode=$(stat -c %a "$ENV_FILE")
  if [ "$mode" != "600" ] && [ "$mode" != "400" ]; then
    echo "Refusing $ENV_FILE: it must be readable by its owner only (chmod 600); it is $mode." >&2
    return 2
  fi
  while IFS= read -r line || [ -n "$line" ]; do
    line=${line%$'\r'}
    case "$line" in '' | '#'*) continue ;; esac
    key=${line%%=*}
    value=${line#*=}
    key=${key#export }
    key=${key//[[:space:]]/}
    value=${value#\"}; value=${value%\"}; value=${value#\'}; value=${value%\'}
    case "$key" in
      DT_APP_OAUTH_CLIENT_ID | DT_APP_OAUTH_CLIENT_SECRET | DT_APP_PLATFORM_TOKEN) export "$key=$value" ;;
      *) echo "Ignoring a line of $ENV_FILE that sets something other than the three accepted names." >&2 ;;
    esac
  done < "$ENV_FILE"
  if [ -n "${DT_APP_OAUTH_CLIENT_ID:-}" ] && [ -n "${DT_APP_OAUTH_CLIENT_SECRET:-}" ]; then
    CREDENTIALS="OAuth client"
  elif [ -n "${DT_APP_PLATFORM_TOKEN:-}" ]; then
    CREDENTIALS="platform token"
  else
    echo "Refusing $ENV_FILE: it must set DT_APP_OAUTH_CLIENT_ID and DT_APP_OAUTH_CLIENT_SECRET, or DT_APP_PLATFORM_TOKEN." >&2
    return 2
  fi
}

load_credentials || exit $?
if [ "${1:-}" = "--check-credentials" ]; then
  echo "Sign-in for the next deploy: $CREDENTIALS$([ "$CREDENTIALS" = browser ] && echo " (no $ENV_FILE)" || echo " from $ENV_FILE")."
  exit 0
fi
URL=${1:-}
if [[ ! "$URL" =~ ^https://[a-z0-9.-]+/$ ]]; then
  echo "usage: scripts/deploy.sh https://<environment>.apps.dynatrace.com/   (or --check-credentials)" >&2
  exit 2
fi

cd "$REPO" || exit 1
npm run -s release:check || exit 1
out=/tmp/pvs-deploy-$(node -p "require('./app.config.json').app.version").log
start=$(date -u +%Y-%m-%dT%H:%M:%S)
echo
echo "== deploy $(node -p "require('./app.config.json').app.id") $(node -p "require('./app.config.json').app.version") (start $start UTC) — sign-in: $CREDENTIALS"
npm run deploy -- --environment-url "$URL" --optimize --enable-code-splitting >"$out" 2>&1 &
pid=$!

if [ "$CREDENTIALS" = browser ]; then
  log=".dt-app/logs/$(date -u +%Y-%m-%d)_log.txt"
  shown=""
  while kill -0 "$pid" 2>/dev/null; do
    if [ -z "$shown" ] && [ -f "$log" ]; then
      link=$(awk -v s="$start" '$1 >= s && /SSO-link/ {print $NF}' "$log" | tail -1)
      if [ -n "$link" ]; then
        shown=1
        echo
        echo "############################################################"
        echo "  ABRA AGORA (vale poucos minutos) / OPEN NOW (valid for a few minutes):"
        echo
        echo "  $link"
        echo
        echo "  Se a página ficar em 'Loading…', copie o endereço"
        echo "  http://localhost:5343/...code=... da barra e cole abaixo."
        echo "############################################################"
      fi
    fi
    if [ -n "$shown" ]; then
      if read -r -t 5 -p "Endereço localhost:5343 (ou Enter para só esperar): " U; then
        [ -z "$U" ] && continue
        if [[ "$U" =~ ^https?://(localhost|127\.0\.0\.1):5343/.*[?\&]code= ]]; then
          curl -s -o /dev/null -w "retorno entregue à CLI: HTTP %{http_code}\n" "$U"
        else
          echo "Esse não é o endereço de retorno (precisa ser localhost:5343 com code=). Tente de novo."
        fi
      else
        sleep 2
      fi
    else
      sleep 2
    fi
  done
fi

wait "$pid"; rc=$?
grep -E "Validating manifest|Compress|App is deployed|rror|denied|expired|scope" "$out" | grep -v "SSO-link" | tail -8
echo "== fim: código $rc  (log: $out)"
exit $rc
