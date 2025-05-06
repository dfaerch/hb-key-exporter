import './meta.js?userscript-metadata'
import { render } from 'solid-js/web'
import { App } from './app'

// @ts-expect-error missing types
import { stylesheet } from './style.module.css'
// @ts-expect-error missing types
import globalCss from './styles.css'

// Create a container for the script
document
  .querySelector('.inner-main-wrapper')
  .insertAdjacentHTML('afterbegin', '<div id="hb_extractor-container"></div>')

// Render the app
render(App, document.getElementById('hb_extractor-container'))

// Add CSS styles
GM_addStyle(GM_getResourceText('DATATABLES_CSS'))
GM_addStyle(stylesheet)
GM_addStyle(globalCss)
