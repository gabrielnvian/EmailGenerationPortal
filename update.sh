# Deployment script triggered by GitHub push via webhook.
# Webhook: /usr/webhook, port 9000, systemd service "webhook", config at /etc/webhook.conf

set -e
git pull

# Run server-side unit tests and generate HTML report to a temp dir.
# (./build/ is wiped by the build step, so we copy the report in afterwards.)
pnpm vitest run --project server --reporter=verbose --reporter=html --outputFile.html=./vitest-report/index.html

pnpm run build

# Move the test report into the build output so it's served alongside the app.
cp -r ./vitest-report ./build/test-report
