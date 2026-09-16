import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createReadinessParser, HarnessSupervisor } from '../src/harness.ts'

function readyEvent(supervisor: HarnessSupervisor): Promise<string> {
  return new Promise<string>((resolve) => { supervisor.once('ready', resolve) })
}

function restartEvent(supervisor: HarnessSupervisor): Promise<void> {
  return new Promise<void>((resolve) => { supervisor.once('restart', () => { resolve() }) })
}

describe('desktop Host readiness', () => {
  it('extracts the canonical URL from arbitrarily chunked output and ignores unrelated URLs', () => {
    const parser = createReadinessParser()

    expect(parser.push('Node warning: see https://nodejs.org/docs\n')).toBeUndefined()
    expect(parser.push('dsh we')).toBeUndefined()
    expect(parser.push('b: http://127.0.')).toBeUndefined()
    expect(parser.push('0.1:4173 (LAN: http://192.0.2.10:4173)')).toBeUndefined()
    expect(parser.push('\nstartup complete\n')).toBe('http://127.0.0.1:4173')
    expect(parser.finalize()).toBe('http://127.0.0.1:4173')
  })

  it('accepts a complete unterminated readiness line when the stream ends', () => {
    const parser = createReadinessParser()

    expect(parser.push('diagnostic\ndsh web: http://localhost:51234')).toBeUndefined()
    expect(parser.finalize()).toBe('http://localhost:51234')
  })

  it('preserves the web access token in the readiness URL', () => {
    const parser = createReadinessParser()

    expect(parser.push('dsh web: http://127.0.0.1:51234/?token=secret\n'))
      .toBe('http://127.0.0.1:51234/?token=secret')
  })

  it.each([
    'dsh web: https://127.0.0.1:4173',
    'dsh web: http://0.0.0.0:4173',
    'dsh web: http://127.0.0.1:0',
    'dsh web: http://127.0.0.1:65536',
    'dsh web: http://127.0.0.1:not-a-port',
  ])('rejects an invalid readiness line: %s', (line) => {
    const parser = createReadinessParser()

    expect(() => parser.push(`${line}\n`)).toThrow(/readiness/iu)
  })

  it('fails when the stream ends before a readiness line arrives', () => {
    const parser = createReadinessParser()

    parser.push('ordinary startup output\n')
    expect(() => parser.finalize()).toThrow(/readiness/iu)
  })

  it('rejects conflicting readiness URLs', () => {
    const parser = createReadinessParser()

    expect(parser.push('dsh web: http://127.0.0.1:4173\n')).toBe('http://127.0.0.1:4173')
    expect(() => parser.push('dsh web: http://127.0.0.1:4174\n')).toThrow(/conflicting readiness URLs/iu)
  })
})

describe('HarnessSupervisor', () => {
  afterEach(() => { /* supervisors are stopped per-test; nothing shared remains */ })

  it('reports the readiness URL and stops the child gracefully', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-supervisor-'))
    try {
      const sup = new HarnessSupervisor(
        process.execPath,
        ['-e', 'console.log("dsh web: http://127.0.0.1:4567"); setTimeout(() => {}, 60000)'],
        { logFile: join(dir, 'harness.log'), restartDelayMs: 50, maxRestartDelayMs: 100, killTimeoutMs: 1000 },
      )
      const ready = readyEvent(sup)
      sup.start()
      await expect(ready).resolves.toBe('http://127.0.0.1:4567')
      expect(sup.url).toBe('http://127.0.0.1:4567')

      await sup.stop()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('restarts after an unexpected exit and clears the served URL', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-supervisor-'))
    try {
      const sup = new HarnessSupervisor(
        process.execPath,
        ['-e', 'console.log("dsh web: http://127.0.0.1:4567"); setTimeout(() => process.exit(3), 50)'],
        { logFile: join(dir, 'harness.log'), restartDelayMs: 100, maxRestartDelayMs: 200, killTimeoutMs: 1000 },
      )
      const ready = readyEvent(sup)
      sup.start()
      await ready

      const restarted = restartEvent(sup)
      await restarted
      expect(sup.url).toBeNull()

      await sup.stop()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
