// @vitest-environment jsdom
/** Desktop bridge detection and window close-behavior row smoke. */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import {
  CloseBehaviorRow,
  readDesktopCloseBehaviorBridge,
} from '../src/client/CloseBehaviorRow.tsx'

const unusedHook = (() => { throw new Error('unused by close-behavior row') }) as never
const kit = { useSessions: unusedHook, useWorkspaces: unusedHook, useSessionPendingInteraction: unusedHook }

describe('readDesktopCloseBehaviorBridge', () => {
  afterEach(() => {
    delete window.dshDesktop
  })

  it('returns undefined when the preload bridge is absent', () => {
    expect(readDesktopCloseBehaviorBridge()).toBeUndefined()
  })

  it('returns the bridge when get/set helpers exist', () => {
    const bridge = {
      getCloseBehavior: vi.fn(async () => ({ behavior: 'tray' as const })),
      setCloseBehavior: vi.fn(async (behavior: 'tray' | 'quit') => ({ behavior })),
    }
    window.dshDesktop = bridge
    expect(readDesktopCloseBehaviorBridge()).toBe(bridge)
  })
})

describe('CloseBehaviorRow', () => {
  beforeEach(() => {
    window.dshDesktop = {
      getCloseBehavior: vi.fn(async () => ({ behavior: 'tray' as const })),
      setCloseBehavior: vi.fn(async (behavior: 'tray' | 'quit') => ({ behavior })),
    }
  })

  afterEach(() => {
    cleanup()
    delete window.dshDesktop
  })

  it('renders the 关闭窗口时 row defaulting to 保持运行', async () => {
    const t = (key: string) => ({
      'closeBehavior.title': '关闭窗口时',
      'closeBehavior.description': 'desc',
      'closeBehavior.keepRunning': '保持运行',
      'closeBehavior.quit': '退出',
    }[key] ?? key)

    render(<CloseBehaviorRow {...kit} t={t as never} />)
    expect(await screen.findByText('关闭窗口时')).toBeTruthy()
    expect(screen.getByRole('button', { name: /保持运行/ })).toBeTruthy()
  })
})
