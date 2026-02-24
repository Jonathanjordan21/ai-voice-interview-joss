import '/src/style.css'
import { setupCounter } from './counter.js'

const button = document.querySelector('#counter')

if (!button) {
  throw new Error('Start button (#counter) not found')
}

setupCounter(button)
