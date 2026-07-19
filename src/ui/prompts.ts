import { select as inqSelect, password as inqPassword, confirm as inqConfirm } from '@inquirer/prompts'

const theme = {
  prefix: '\x1b[32m?\x1b[0m',
  style: {
    answer: (text: string) => `\x1b[36m${text}\x1b[0m`,
    message: (text: string) => `\x1b[1m${text}\x1b[0m`,
    highlight: (text: string) => `\x1b[32m${text}\x1b[0m`,
  },
  icon: {
    cursor: '\x1b[32m❯\x1b[0m'
  }
}

function handleExit(e: unknown): never {
  if (e instanceof Error && e.name === 'ExitPromptError') {
    console.log('\n\x1b[33mSetup cancelled.\x1b[0m\n')
    process.exit(0)
  }
  throw e
}

export async function select(opts: Parameters<typeof inqSelect>[0]) {
  try {
    return await inqSelect({ ...opts, theme })
  } catch (e) {
    return handleExit(e)
  }
}

export async function password(opts: Parameters<typeof inqPassword>[0]) {
  try {
    return await inqPassword({ mask: '*', ...opts, theme })
  } catch (e) {
    return handleExit(e)
  }
}

export async function confirm(opts: Parameters<typeof inqConfirm>[0]) {
  try {
    return await inqConfirm({ ...opts, theme })
  } catch (e) {
    return handleExit(e)
  }
}
