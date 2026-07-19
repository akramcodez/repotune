import { tasks } from '@clack/prompts'
import { setTimeout } from 'timers/promises'

async function run() {
  await tasks([
    {
      title: 'Analyzing documentation',
      task: async () => {
        await setTimeout(1500)
        return 'Documentation checked'
      }
    },
    {
      title: 'Validating automation pipelines',
      task: async () => {
        await setTimeout(1500)
        return 'Pipelines verified'
      }
    },
    {
      title: 'Running smart consistency checks',
      task: async () => {
        await setTimeout(2000)
        return 'Consistency verified'
      }
    }
  ])
}

run()
