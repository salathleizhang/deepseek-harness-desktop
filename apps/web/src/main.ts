/** Browser entry for the Web client. */
import { AppWebEntry } from '@deepseek-ai/dsh-client-web'
import { applyDesktopPresentationMarker } from './desktop-marker.ts'

applyDesktopPresentationMarker(window.location.href, document.documentElement)

const el = document.getElementById('root')
if (el === null) throw new Error('web app: missing #root')
void new AppWebEntry(el).run()
