export function startPulse(text: string) {
  // 90 = gray, 39 = default (white)
  const colors = [90, 39]
  let i = 0

  process.stdout.write('\x1B[?25l') // hide cursor
  // Print initial state immediately so it doesn't wait 200ms
  process.stdout.write(`\r\x1b[${colors[0]}m${text}\x1b[0m`)

  const timer = setInterval(() => {
    i = (i + 1) % colors.length
    process.stdout.write(`\r\x1b[${colors[i]}m${text}\x1b[0m`)
  }, 200)

  return {
    stop(finalText: string) {
      clearInterval(timer)
      process.stdout.write('\x1B[?25h') // show cursor
      // clear line and print final text
      process.stdout.write(`\r\x1b[K${finalText}\n`)
    },
  }
}
