import { EXPLANATIONS } from '../data/explanations.js'

export async function runExplain(topic: string): Promise<void> {
  if (!topic) {
    console.error('\n\x1b[31mError: Please provide a topic to explain.\x1b[0m')
    printAvailableTopics()
    process.exit(1)
    return
  }

  const normalizedTopic = topic.toLowerCase().trim()
  const explanation = EXPLANATIONS[normalizedTopic]

  if (!explanation) {
    console.error(`\n\x1b[31mUnknown topic: '${topic}'\x1b[0m`)
    printAvailableTopics()
    process.exit(1)
    return
  }

  console.log(`\n\x1b[1m${explanation.title}\x1b[0m\n`)
  console.log('\x1b[36mPurpose\x1b[0m')
  console.log(`  ${explanation.purpose}\n`)

  console.log('\x1b[36mBenefits\x1b[0m')
  explanation.benefits.forEach((b) => console.log(`  ✓ ${b}`))
  console.log()

  console.log('\x1b[36mGitHub native support?\x1b[0m')
  console.log(
    `  ${explanation.githubNative ? 'Yes — GitHub natively supports and integrates this.' : 'No special GitHub UI integration, but still an industry standard.'}\n`,
  )

  console.log('\x1b[36mExample\x1b[0m')
  console.log(
    explanation.example
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n'),
  )
  console.log()

  console.log('\x1b[36mGenerate one?\x1b[0m')
  console.log(`  Run: \x1b[32m${explanation.generateCommand}\x1b[0m\n`)
}

function printAvailableTopics() {
  const topics = Object.keys(EXPLANATIONS)
  console.log('\nAvailable topics:')
  console.log(`  ${topics.join(', ')}\n`)
}
