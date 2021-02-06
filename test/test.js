const { strict: assert } = require('assert')
const _ = require('lodash')
const Logger = require('../Logger')
function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
function assertOutput(output, level, content) {
  const parsedOutput = JSON.parse(output)
  assert('time' in parsedOutput)
  assert.equal(parsedOutput.level, level)
  assert(_.isEqual(parsedOutput.content, content))
}
async function main() {
  let lastOutput
  const log = console.log.bind(console)
  console.log = x => {
    lastOutput = x
  }
  const logger = new Logger('trace')
  logger.info('hoge')
  log(lastOutput)
  assertOutput(lastOutput, 'info', 'hoge')
  const logger2 = logger.createTagged('piyo')
  logger2.info('hoge')
  log(lastOutput)
  assertOutput(lastOutput, 'info', { tag: 'piyo', content: 'hoge' })
}
if (require.main === module) {
  main()
}
