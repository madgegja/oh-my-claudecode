#!/usr/bin/env node
import { readStdin } from './lib/stdin.mjs';

async function main() {
  // Skip guard: respect OMC_SKIP_HOOKS (consistent with keyword-detector / pre-tool-enforcer / post-tool-verifier, see issue #838)
  const _skipHooks = (process.env.OMC_SKIP_HOOKS || '').split(',').map(s => s.trim());
  if (process.env.DISABLE_OMC === '1' || _skipHooks.includes('wiki-pre-compact') || _skipHooks.includes('pre-compact')) {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  const input = await readStdin(1000);
  try {
    const data = JSON.parse(input);
    const { onPreCompact } = await import('../dist/hooks/wiki/session-hooks.js');
    const result = onPreCompact(data);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error('[wiki-pre-compact] Error:', error.message);
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
