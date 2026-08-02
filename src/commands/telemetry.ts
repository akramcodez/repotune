import { select } from '../ui/prompts.js'
import { getTelemetryConfig, setTelemetryEnabled } from '../config/store.js'

export async function runTelemetry(options: { show?: boolean, enable?: boolean, disable?: boolean, status?: boolean }): Promise<void> {
  const config = getTelemetryConfig()

  if (options.show) {
    console.log('\n\x1b[1mTelemetry Event Preview\x1b[0m\n')
    console.log(JSON.stringify({
      event: 'scan',
      checkId: 'security',
      provider: 'openai',
      score: 95,
      timestamp: new Date().toISOString().split('T')[0],
      sessionId: config.sessionId
    }, null, 2))
    console.log('\n\x1b[36m(This is an example of the anonymized payload that is sent)\x1b[0m\n')
    return
  }

  if (options.enable) {
    setTelemetryEnabled(true)
    console.log('\n\x1b[32m✓ Telemetry enabled. Thank you!\x1b[0m\n')
    return
  }

  if (options.disable) {
    setTelemetryEnabled(false)
    console.log('\n\x1b[33m✓ Telemetry disabled.\x1b[0m\n')
    return
  }

  if (options.status) {
    if (config.enabled === true) {
      console.log('\n\x1b[32mTelemetry is currently ENABLED.\x1b[0m\n')
    } else if (config.enabled === false) {
      console.log('\n\x1b[33mTelemetry is currently DISABLED.\x1b[0m\n')
    } else {
      console.log('\n\x1b[90mTelemetry has not been configured yet.\x1b[0m\n')
    }
    return
  }

  if (config.enabled !== undefined) {
    console.log('\n\x1b[36mTo modify telemetry, use --enable or --disable.\x1b[0m\n')
    return
  }

  await promptTelemetryOptIn()
}

export async function promptTelemetryOptIn(): Promise<void> {
  const config = getTelemetryConfig()
  if (config.enabled !== undefined) return

  console.log('\n\x1b[1mHelp improve RepoTune?\x1b[0m\n')
  console.log('Share anonymous usage data — which checks fire, which fixes')
  console.log('are accepted, nothing else. No file contents, no personal info.\n')
  
  console.log('You can review what gets sent: \x1b[36mrepotune telemetry --show\x1b[0m')
  console.log('You can opt out at any time:   \x1b[36mrepotune telemetry --disable\x1b[0m\n')

  const choice = await select({
    message: 'Enable telemetry?',
    choices: [
      { name: 'Enable (recommended)', value: true },
      { name: 'Disable', value: false }
    ]
  }) as boolean

  setTelemetryEnabled(choice)
  if (choice) {
    console.log('\n\x1b[32m✓ Opted in. Thank you for helping RepoTune!\x1b[0m\n')
  } else {
    console.log('\n\x1b[33m✓ Opted out.\x1b[0m\n')
  }
}
