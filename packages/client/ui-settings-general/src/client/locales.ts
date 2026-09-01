/** Shell chrome and General-nav dictionaries; feature rows own their copy. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'trigger': '设置',
  'title': '设置',
  'close': '关闭',
  'openDocument': '打开配置文件',
  'openDocument.error': '无法打开配置文件',
  'general.nav': '通用设置',
  'launchAtLogin.title': '开机自启',
  'launchAtLogin.description': '登录系统后自动启动 DeepSeek Harness（仅安装版可开启，默认关闭）',
  'launchAtLogin.yes': '是',
  'launchAtLogin.no': '否',
  'notifications.title': '系统通知',
  'notifications.description': '服务意外退出、反复崩溃或恢复时弹出系统提示（默认开启）',
  'notifications.yes': '是',
  'notifications.no': '否',
  'closeBehavior.title': '关闭窗口时',
  'closeBehavior.description': '选择 DeepSeek Harness 在主窗口关闭后是否继续运行',
  'closeBehavior.keepRunning': '保持运行',
  'closeBehavior.quit': '退出',
  'connection.error': '连接异常',
  'connection.retry': '立即重连',
  'connection.connecting': '连接中',
  'connection.connected': '连接成功',
  'connection.reconnect': '连接异常，点击立即重连',
  'connection.restart': '连接中，点击立即重连',
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
  'launchAtLogin.title': 'Launch at login',
  'launchAtLogin.description': 'Start DeepSeek Harness automatically when you sign in (packaged app only; off by default)',
  'launchAtLogin.yes': 'Yes',
  'launchAtLogin.no': 'No',
  'notifications.title': 'System notifications',
  'notifications.description': 'Show a system toast when the service crashes, keeps failing, or recovers (on by default)',
  'notifications.yes': 'Yes',
  'notifications.no': 'No',
  'closeBehavior.title': 'When closing window',
  'closeBehavior.description': 'Choose whether DeepSeek Harness keeps running after its main window closes.',
  'closeBehavior.keepRunning': 'Keep running',
  'closeBehavior.quit': 'Quit',
  'connection.error': 'Disconnected',
  'connection.retry': 'Reconnect now',
  'connection.connecting': 'Connecting',
  'connection.connected': 'Connected',
  'connection.reconnect': 'Disconnected, reconnect now',
  'connection.restart': 'Connecting, restart now',
} satisfies Record<SettingsKey, string>
