import { describe, expect, it } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { KEYWORD_DETECTOR_SCRIPT_NODE, getHookScripts } from '../hooks.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..', '..', '..');
const STALE_PIPELINE_SNIPPETS = [
    "matches.push({ name: 'pipeline', args: '' });",
    "'pipeline','ccg','ralplan'",
    "'pipeline']);",
    "'swarm', 'pipeline'], sessionId);",
];
function runKeywordHook(scriptPath, input) {
    return JSON.parse(execFileSync('node', [scriptPath], {
        cwd: packageRoot,
        input: typeof input === 'string' ? JSON.stringify({ prompt: input }) : JSON.stringify(input),
        encoding: 'utf-8',
    }));
}
describe('keyword-detector packaged artifacts', () => {
    it('does not ship stale pipeline keyword handling in installer templates', () => {
        const hookScripts = getHookScripts();
        const template = hookScripts['keyword-detector.mjs'];
        expect(template).toBe(KEYWORD_DETECTOR_SCRIPT_NODE);
        for (const snippet of STALE_PIPELINE_SNIPPETS) {
            expect(template).not.toContain(snippet);
        }
    });
    it('does not ship stale pipeline keyword handling in plugin scripts', () => {
        const pluginScript = readFileSync(join(packageRoot, 'scripts', 'keyword-detector.mjs'), 'utf-8');
        for (const snippet of STALE_PIPELINE_SNIPPETS) {
            expect(pluginScript).not.toContain(snippet);
        }
    });
    it('keeps installer template and plugin script aligned for supported compatibility keywords', () => {
        const templatePath = join(packageRoot, 'templates', 'hooks', 'keyword-detector.mjs');
        const pluginPath = join(packageRoot, 'scripts', 'keyword-detector.mjs');
        for (const [prompt, expected] of [
            ['tdd implement password validation', '[TDD MODE ACTIVATED]'],
            ['deep-analyze the test failure', 'ANALYSIS MODE'],
            ['deep interview me about requirements', 'oh-my-claudecode:deep-interview'],
            ['deslop this module with duplicate dead code', 'oh-my-claudecode:ai-slop-cleaner'],
        ]) {
            const templateResult = JSON.stringify(runKeywordHook(templatePath, prompt));
            const pluginResult = JSON.stringify(runKeywordHook(pluginPath, prompt));
            expect(templateResult).toContain(expected);
            expect(pluginResult).toContain(expected);
        }
    });
    it('only triggers ai-slop-cleaner for anti-slop cleanup/refactor prompts', () => {
        const templatePath = join(packageRoot, 'templates', 'hooks', 'keyword-detector.mjs');
        const pluginPath = join(packageRoot, 'scripts', 'keyword-detector.mjs');
        const positivePrompt = 'cleanup this ai slop: remove dead code and duplicate wrappers';
        const negativePrompt = 'refactor auth to support SSO';
        const templatePositive = JSON.stringify(runKeywordHook(templatePath, positivePrompt));
        const pluginPositive = JSON.stringify(runKeywordHook(pluginPath, positivePrompt));
        const templateNegative = runKeywordHook(templatePath, negativePrompt);
        const pluginNegative = runKeywordHook(pluginPath, negativePrompt);
        expect(templatePositive).toContain('oh-my-claudecode:ai-slop-cleaner');
        expect(pluginPositive).toContain('oh-my-claudecode:ai-slop-cleaner');
        expect(templateNegative).toEqual({ continue: true, suppressOutput: true });
        expect(pluginNegative).toEqual({ continue: true, suppressOutput: true });
    });
    it('does not auto-trigger team mode from keyword-detector artifacts', () => {
        const templatePath = join(packageRoot, 'templates', 'hooks', 'keyword-detector.mjs');
        const pluginPath = join(packageRoot, 'scripts', 'keyword-detector.mjs');
        const templateResult = runKeywordHook(templatePath, 'team 3 agents fix lint');
        const pluginResult = runKeywordHook(pluginPath, 'team 3 agents fix lint');
        expect(templateResult).toEqual({ continue: true, suppressOutput: true });
        expect(pluginResult).toEqual({ continue: true, suppressOutput: true });
    });
    it('writes project_path metadata for ultrawork state in both packaged artifacts', () => {
        const templatePath = join(packageRoot, 'templates', 'hooks', 'keyword-detector.mjs');
        const pluginPath = join(packageRoot, 'scripts', 'keyword-detector.mjs');
        const tempHome = mkdtempSync(join(tmpdir(), 'omc-hook-home-'));
        const tempProject = mkdtempSync(join(tmpdir(), 'omc-hook-project-'));
        try {
            const env = {
                ...process.env,
                HOME: tempHome,
                USERPROFILE: tempHome,
            };
            execFileSync('node', [templatePath], {
                cwd: packageRoot,
                env,
                input: JSON.stringify({ prompt: 'ulw investigate cleanup', cwd: tempProject }),
                encoding: 'utf-8',
            });
            execFileSync('node', [pluginPath], {
                cwd: packageRoot,
                env,
                input: JSON.stringify({ prompt: 'ulw investigate cleanup', cwd: tempProject }),
                encoding: 'utf-8',
            });
            const statePath = join(tempProject, '.omc', 'state', 'ultrawork-state.json');
            const state = JSON.parse(readFileSync(statePath, 'utf-8'));
            expect(state.project_path).toBe(tempProject);
        }
        finally {
            rmSync(tempHome, { recursive: true, force: true });
            rmSync(tempProject, { recursive: true, force: true });
        }
    });
});
//# sourceMappingURL=hook-templates.test.js.map