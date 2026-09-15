import { parseArgs } from "node:util";

const HELP = `Usage: npm run cover -- [--install]

Capture dist/ into docs/screenshots/cover.png using the pinned Linux browser.
Identical captures leave the file and its modification time unchanged.

  -h, --help     Show this help
  -i, --install  Pull the pinned cover image (also npm run cover:install)

Requires Node.js 24+, npm ci dependencies, and a running Docker-compatible
engine with linux/amd64 support. Run npm run cover:install before capturing.
Builds and development rebuilds capture automatically; this command can
recapture an existing dist/ directory. Docker's context and environment
settings select the engine. No project-specific environment is required.

The resulting path or installed image goes to stdout; diagnostics go to stderr.
Exit: 0 success, 1 capture/runtime failure, 2 usage error, 3 missing dependency.
`;

async function main() {
  let values;
  try {
    ({ values } = parseArgs({ options: {
      help: { type: "boolean", short: "h" },
      install: { type: "boolean", short: "i" },
    } }));
  } catch (error) {
    error.exitCode = 2;
    throw error;
  }
  if (values.help) return process.stdout.write(HELP);
  const { buildCover, installCoverRuntime } = await import("./build-cover.mjs");
  if (values.install) console.log(await installCoverRuntime());
  else {
    await buildCover("dist");
    console.log("docs/screenshots/cover.png");
  }
}

main().catch((error) => { console.error("cover: " + error.message); process.exitCode = error.exitCode || 1; });
