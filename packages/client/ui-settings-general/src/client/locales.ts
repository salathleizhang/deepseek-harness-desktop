/** Shell chrome and General-nav dictionaries; feature rows own their copy. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'trigger': '设置',
  'title': '设置',
  'close': '关闭',
  'openDocument': '打开配置文件',
  'openDocument.error': '无法打开配置文件',
  'general.nav': '通用设置',
  'connection.error': '连接异常，刷新重试',
  'connection.connecting': '重新连接中',
  'connection.connected': '连接成功',
  'connection.reconnect': '连接异常，点击立即重连',
  'connection.restart': '连接中断，正在重试，点击立即重连',
  'closeBehavior.title': '关闭窗口时',
  'closeBehavior.description': '选择关闭窗口后的行为',
  'closeBehavior.keepRunning': '保持运行',
  'closeBehavior.quit': '退出',
  'launchAtLogin.title': '开机自启',
  'launchAtLogin.description': '登录系统后自动启动',
  'launchAtLogin.yes': '是',
  'launchAtLogin.no': '否',
  'notifications.title': '系统通知',
  'notifications.description': '允许 Harness 发送系统通知',
  'notifications.yes': '是',
  'notifications.no': '否',
} satisfies Record<string, string>

/** The settings namespace key union. */
export type SettingsKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'trigger': 'Settings',
  'title': 'Settings',
  'close': 'Close',
  'openDocument': 'Open configuration file',
  'openDocument.error': 'Could not open configuration file',
  'general.nav': 'General',
  'connection.error': 'Disconnected',
  'connection.connecting': 'Reconnecting',
  'connection.connected': 'Connected',
  'connection.reconnect': 'Disconnected, reconnect now',
  'connection.restart': 'Reconnecting, reconnect now',
  'closeBehavior.title': 'When closing the window',
  'closeBehavior.description': 'Choose what happens when the window closes',
  'closeBehavior.keepRunning': 'Keep running',
  'closeBehavior.quit': 'Quit',
  'launchAtLogin.title': 'Launch at login',
  'launchAtLogin.description': 'Start automatically when you log in',
  'launchAtLogin.yes': 'Yes',
  'launchAtLogin.no': 'No',
  'notifications.title': 'System notifications',
  'notifications.description': 'Allow Harness to send system notifications',
  'notifications.yes': 'Yes',
  'notifications.no': 'No',
} satisfies Record<SettingsKey, string>
