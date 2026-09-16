import { spawn, type ChildProcess } from 'node:child_process'
import { createWriteStream, mkdirSync, type WriteStream } from 'node:fs'
import { dirname } from 'node:path'
import { EventEmitter } from 'node:events'

/**
 * The web app prints one `dsh web: http://127.0.0.1:<port>` line (optionally
 * followed by ` (LAN: ...)`) once its Loader tree has settled; that line is the
 * documented readiness signal (`packages/bundle/web-app`), so the supervisor
 * treats it as the moment the window may load the served URL. Matching the line
 * also gives the real port and access token when the invocation used `--port 0`.
 */
const READINESS_PREFIX = 'dsh web: '

/** Incremental parser for the Web Host's canonical readiness line. */
export interface ReadinessParser {
  /**
   * Consume one stdout chunk.
   * @param chunk - Text emitted by the Host.
   * @returns The loopback origin once a complete readiness line is observed.
   */
  push(chunk: string): string | undefined
  /**
   * Finish the stream and require a readiness line.
   * @returns The parsed loopback origin.
   */
  finalize(): string
}

/**
 * Assert and normalize one readiness line to a loopback HTTP origin with an
 * explicit port. The line may carry a trailing ` (LAN: ...)` candidate, which
 * is ignored: only the first whitespace-delimited token is the canonical URL.
 */
function parseReadinessLine(line: string): string | undefined {
  if (!line.startsWith(READINESS_PREFIX)) return undefined
  const token = line.slice(READINESS_PREFIX.length).split(/\s/u, 1)[0]
  if (token === undefined) throw new Error(`desktop Host readiness line has no URL: ${line}`)

  let url: URL
  try {
    url = new URL(token)
  } catch {
    throw new Error(`desktop Host readiness URL is invalid: ${token}`)
  }
  const port = Number(url.port)
  if (url.protocol !== 'http:'
    || (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost')
    || url.pathname !== '/'
    || url.hash !== ''
    || !Number.isInteger(port)
    || port < 1
    || port > 65_535) {
    throw new Error(`desktop Host readiness URL must be loopback HTTP with an explicit port: ${token}`)
  }
  return url.search === '' ? url.origin : `${url.origin}${url.pathname}${url.search}`
}

/**
 * Create a line parser whose result is stable after readiness.
 * @returns A fresh incremental parser.
 */
export function createReadinessParser(): ReadinessParser {
  let pending = ''
  let readyUrl: string | undefined

  const accept = (line: string): string | undefined => {
    const parsed = parseReadinessLine(line.replace(/\r$/u, ''))
    if (parsed === undefined) return undefined
    if (readyUrl !== undefined && parsed !== readyUrl) {
      throw new Error(`desktop Host emitted conflicting readiness URLs: ${readyUrl} and ${parsed}`)
    }
    readyUrl = parsed
    return readyUrl
  }

  return {
    push(chunk) {
      pending += chunk
      for (;;) {
        const newline = pending.indexOf('\n')
        if (newline === -1) return readyUrl
        const line = pending.slice(0, newline)
        pending = pending.slice(newline + 1)
        const parsed = accept(line)
        if (parsed !== undefined) return parsed
      }
    },
    finalize() {
      if (pending !== '') accept(pending)
      if (readyUrl === undefined) throw new Error('desktop Host exited before emitting its readiness URL')
      return readyUrl
    },
  }
}

/** A single child exit, as observed by the supervisor. */
export interface HarnessExit {
  code: number | null
  signal: NodeJS.Signals | null
  /** True only during {@link HarnessSupervisor.stop}. */
  expected: boolean
}

/** Events emitted by {@link HarnessSupervisor}. */
export interface HarnessSupervisorEvents {
  /** The harness served a Web GUI; carries the canonical loopback URL. */
  ready: [url: string]
  /** The child process exited. */
  exit: [exit: HarnessExit]
  /** A restart is scheduled after an unexpected exit. */
  restart: [detail: { attempt: number; delayMs: number }]
}

export interface HarnessSupervisorOptions {
  logFile: string
  restartDelayMs: number
  maxRestartDelayMs: number
  killTimeoutMs: number
}

/**
 * Spawn and supervise the harness as a child process: start it, observe its
 * readiness line, restart it on unexpected exit with exponential backoff, and
 * stop it gracefully on request. One supervisor owns one child at a time.
 */
export class HarnessSupervisor extends EventEmitter<HarnessSupervisorEvents> {
  private readonly command: string
  private readonly args: readonly string[]
  private readonly options: HarnessSupervisorOptions
  private readonly logStream: WriteStream
  private child: ChildProcess | null = null
  private stopping = false
  private restartAttempt = 0
  private parser: ReadinessParser = createReadinessParser()
  private servedUrl: string | null = null

  constructor(command: string, args: readonly string[], options: HarnessSupervisorOptions) {
    super()
    this.command = command
    this.args = args
    this.options = options
    mkdirSync(dirname(options.logFile), { recursive: true })
    this.logStream = createWriteStream(options.logFile, { flags: 'a' })
  }

  /** The canonical loopback URL once observed; `null` before the first ready. */
  get url(): string | null {
    return this.servedUrl
  }

  /** Begin supervising: spawn the first child. */
  start(): void {
    this.stopping = false
    this.spawn()
  }

  /**
   * Gracefully stop the child (SIGTERM, then SIGKILL after the timeout) and
   * suppress restart. Resolves after the child has exited.
   */
  stop(): Promise<void> {
    this.stopping = true
    const child = this.child
    if (child === null) {
      this.logStream.end()
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      const killTimer = setTimeout(() => child.kill('SIGKILL'), this.options.killTimeoutMs)
      child.once('exit', () => {
        clearTimeout(killTimer)
        this.logStream.end()
        resolve()
      })
      child.kill('SIGTERM')
    })
  }

  private spawn(): void {
    this.parser = createReadinessParser()
    this.child = spawn(this.command, [...this.args], { stdio: ['ignore', 'pipe', 'pipe'] })
    this.child.stdout?.setEncoding('utf8')
    this.child.stderr?.setEncoding('utf8')
    this.child.stdout?.on('data', (chunk: string) => this.onStdout(chunk))
    this.child.stderr?.on('data', (chunk: string) => {
      this.logStream.write(`[stderr] ${chunk}`)
    })
    this.child.on('error', (error: Error) => {
      this.logStream.write(`[spawn error] ${error.message}\n`)
    })
    this.child.on('exit', (code, signal) => this.onExit(code, signal))
  }

  private onStdout(chunk: string): void {
    this.logStream.write(chunk)
    let url: string | undefined
    try {
      url = this.parser.push(chunk)
    } catch (error) {
      this.logStream.write(`[readiness error] ${error instanceof Error ? error.message : String(error)}\n`)
      return
    }
    if (url === undefined || this.servedUrl !== null) return
    this.servedUrl = url
    this.restartAttempt = 0
    this.emit('ready', url)
  }

  private onExit(code: number | null, signal: NodeJS.Signals | null): void {
    this.child = null
    this.servedUrl = null
    this.emit('exit', { code, signal, expected: this.stopping })
    if (!this.stopping) this.scheduleRestart()
  }

  private scheduleRestart(): void {
    this.restartAttempt += 1
    const delayMs = Math.min(
      this.options.restartDelayMs * 2 ** (this.restartAttempt - 1),
      this.options.maxRestartDelayMs,
    )
    this.emit('restart', { attempt: this.restartAttempt, delayMs })
    setTimeout(() => {
      if (!this.stopping) this.spawn()
    }, delayMs)
  }
}
