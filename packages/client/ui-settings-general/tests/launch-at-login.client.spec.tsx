// @vitest-environment jsdom
/** Desktop bridge detection and launch-at-login row smoke. */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import {
  LaunchAtLoginRow,
  readDesktopLaunchAtLoginBridge,
} from '../src/client/LaunchAtLoginRow.tsx'

const unusedHook = (() => { throw new Error('unused by launch-at-login row') }) as never
const kit = { useSessions: unusedHook, useWorkspaces: unusedHook, useSessionPendingInteraction: unusedHook }

describe('readDesktopLaunchAtLoginBridge', () => {
  afterEach(() => {
    delete window.dshDesktop
  })

  it('returns undefined when the preload bridge is absent', () => {
    expect(readDesktopLaunchAtLoginBridge()).toBeUndefined()
  })

  it('returns the bridge when get/set helpers exist', () => {
    const bridge = {
      getLaunchAtLogin: vi.fn(async () => ({ enabled: false, available: true })),
      setLaunchAtLogin: vi.fn(async (enabled: boolean) => ({ enabled, available: true })),
    }
    window.dshDesktop = bridge
    expect(readDesktopLaunchAtLoginBridge()).toBe(bridge)
  })
})

describe('LaunchAtLoginRow', () => {
  beforeEach(() => {
    window.dshDesktop = {
      getLaunchAtLogin: vi.fn(async () => ({ enabled: false, available: true })),
      setLaunchAtLogin: vi.fn(async (enabled: boolean) => ({ enabled, available: true })),
    }
  })

  afterEach(() => {
    cleanup()
    delete window.dshDesktop
  })

  it('renders the 开机自启 row defaulting to 否', async () => {
    const t = (key: string) => ({
      'launchAtLogin.title': '开机自启',
      'launchAtLogin.description': 'desc',
      'launchAtLogin.yes': '是',
      'launchAtLogin.no': '否',
    }[key] ?? key)

    render(<LaunchAtLoginRow {...kit} t={t as never} />)
    expect(await screen.findByText('开机自启')).toBeTruthy()
    expect(screen.getByRole('button', { name: /否/ })).toBeTruthy()
  })
})
