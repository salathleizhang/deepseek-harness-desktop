// @vitest-environment jsdom
/** Desktop bridge detection and notifications row smoke. */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import {
  NotificationsRow,
  readDesktopNotificationsBridge,
} from '../src/client/NotificationsRow.tsx'

const unusedHook = (() => { throw new Error('unused by notifications row') }) as never
const kit = { useSessions: unusedHook, useWorkspaces: unusedHook, useSessionPendingInteraction: unusedHook }

describe('readDesktopNotificationsBridge', () => {
  afterEach(() => {
    delete window.dshDesktop
  })

  it('returns undefined when the preload bridge is absent', () => {
    expect(readDesktopNotificationsBridge()).toBeUndefined()
  })

  it('returns the bridge when get/set helpers exist', () => {
    const bridge = {
      getNotifications: vi.fn(async () => ({ enabled: true })),
      setNotifications: vi.fn(async (enabled: boolean) => ({ enabled })),
    }
    window.dshDesktop = bridge
    expect(readDesktopNotificationsBridge()).toBe(bridge)
  })
})

describe('NotificationsRow', () => {
  beforeEach(() => {
    window.dshDesktop = {
      getNotifications: vi.fn(async () => ({ enabled: true })),
      setNotifications: vi.fn(async (enabled: boolean) => ({ enabled })),
    }
  })

  afterEach(() => {
    cleanup()
    delete window.dshDesktop
  })

  it('renders the 系统通知 row defaulting to 是', async () => {
    const t = (key: string) => ({
      'notifications.title': '系统通知',
      'notifications.description': 'desc',
      'notifications.yes': '是',
      'notifications.no': '否',
    }[key] ?? key)

    render(<NotificationsRow {...kit} t={t as never} />)
    expect(await screen.findByText('系统通知')).toBeTruthy()
    expect(screen.getByRole('button', { name: /是/ })).toBeTruthy()
  })
})
