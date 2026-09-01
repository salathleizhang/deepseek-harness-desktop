import { readFile, readdir } from 'node:fs/promises'
import { zstdDecompress } from 'node:zlib'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { runLoaderSmoke } from '@deepseek-ai/dsh-loader-smoke'
import type { SessionEvent } from '@deepseek-ai/dsh-session'

const PRODUCTION_PROFILE_PROCESS_TIMEOUT_MS = 60_000
const PRODUCTION_PROFILE_TEST_TIMEOUT_MS = PRODUCTION_PROFILE_PROCESS_TIMEOUT_MS + 15_000
const binScript = fileURLToPath(new URL('../../../../../../packages/test-support/loader-smoke/tests/fixtures/headless-driver.ts', import.meta.url))
const configPath = fileURLToPath(new URL('./fixtures/cli.patch.yml', import.meta.url))
const tsconfigPath = fileURLToPath(new URL('../../../../../../tsconfig.json', import.meta.url))
const decompress = promisify(zstdDecompress)

describe('headless-agent keyless smoke', () => {
  it('boots the real Loader tree, runs the production shell tool, and persists the turn', async () => {
    let persistedHeader: Record<string, unknown> | undefined
    const { stdout, stderr } = await runLoaderSmoke({
      label: 'headless-agent',
      tempDirPrefix: 'headless-agent-smoke-',
      binScript,
      libBinScript: binScript,
      configPath,
      binArgs: [configPath, 'prove the tool path'],
      tsconfigPath,
      processTimeoutMs: PRODUCTION_PROFILE_PROCESS_TIMEOUT_MS,
      inspect: async (cwd) => {
        const sessionsDir = join(cwd, '.sessions')
        const files = await readdir(sessionsDir, { recursive: true })
        const relativePath = files.find(file => file.endsWith('.jsonl.zstd'))
        if (relativePath === undefined) return
        const compressed = await readFile(join(sessionsDir, relativePath))
        expect(compressed.subarray(0, 4).toString('hex')).toBe('28b52ffd')
        persistedHeader = JSON.parse((await decompress(compressed)).toString()) as Record<string, unknown>
      },
    })
    const lines = stdout.trimEnd().split('\n').map(line => JSON.parse(line) as Record<string, unknown>)
    const events = lines.slice(0, -1).map(line => line['event'] as SessionEvent)
    const result = lines.at(-1)
    expect(stderr).toBe('')
    const shellTool = process.platform === 'win32' ? 'pwsh' : 'bash'
    expect(events.some(event => event.type === 'tool/call' && event.data.name === shellTool)).toBe(true)
    const toolResult = events.find(event => event.type === 'tool/result')
    expect(JSON.stringify(toolResult)).toContain('CLI_TOOL_ROUND_TRIP')
    expect(result).toMatchObject({
      type: 'result',
      usage: { inputTokens: 18, outputTokens: 8, cacheReadTokens: 2, reasoningTokens: 1 },
    })
    expect(String(result?.['output'])).toContain('CLI_TOOL_ROUND_TRIP')
    expect(persistedHeader).toMatchObject({ type: 'session' })
  }, PRODUCTION_PROFILE_TEST_TIMEOUT_MS)
})
