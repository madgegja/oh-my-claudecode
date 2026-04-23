#!/usr/bin/env node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { readStdin } from './lib/stdin.mjs';

async function main() {
  const action = process.argv[2]; // 'start' or 'stop'

  // Skip guard: respect OMC_SKIP_HOOKS (consistent with keyword-detector / pre-tool-enforcer / post-tool-verifier, see issue #838)
  const _skipHooks = (process.env.OMC_SKIP_HOOKS || '').split(',').map(s => s.trim());
  if (process.env.DISABLE_OMC === '1' || _skipHooks.includes('subagent-tracker') || _skipHooks.includes('subagent') || (action === 'start' && _skipHooks.includes('subagent-start')) || (action === 'stop' && _skipHooks.includes('subagent-stop'))) {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  // Read stdin (timeout-protected, see issue #240/#459)
  const input = await readStdin();

  try {
    const data = JSON.parse(input);
    const { processSubagentStart, processSubagentStop } = await import('../dist/hooks/subagent-tracker/index.js');

    let result;
    if (action === 'start') {
      result = await processSubagentStart(data);
    } else if (action === 'stop') {
      result = await processSubagentStop(data);
    } else {
      console.error(`[subagent-tracker] Unknown action: ${action}`);
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    console.log(JSON.stringify(result));
  } catch (error) {
    console.error('[subagent-tracker] Error:', error.message);
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
