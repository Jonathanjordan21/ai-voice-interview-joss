import '/src/style.css'
import { setupCounter } from './counter.js'

const button = document.querySelector('#counter')

console.log("test main.js")

if (!button) {
  throw new Error('Start button (#counter) not found')
}

setupCounter(button)
