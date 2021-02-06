const fs = require('fs-extra')
const moment = require('moment')
const _ = require('lodash')
const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace']
function getLogLevelIndex(level) {
  return logLevels.findIndex(x => x === level)
}
function objectifyAndRemoveCircularStructure(options, content, refs = []) {
  if (refs.some(ref => ref === content)) {
    return null
  }
  // 普通に使っても場合によってcountが57537669とかになるので、制限
  if (options.count > 1000) {
    return '<maxCount>'
  }
  options.count += 1
  refs.push(content)
  if (Array.isArray(content)) {
    return content.map(x => objectifyAndRemoveCircularStructure(options, x, [...refs]))
  } else if (typeof content === 'object' && content !== null) {
    const keys = [
      ...Object.keys(content),
      ...Object.getOwnPropertyNames(content)
    ]
    return _.fromPairs(
      keys.map(k => [
        k,
        objectifyAndRemoveCircularStructure(options, content[k], [...refs])
      ])
    )
  } else if (typeof content === 'string' && options.skip && content.length > 4 * 1024) {
    return '<skipped>'
  }
  return content
}
class Logger {
  constructor(logLevel = _.last(logLevels), options, tag) {
    options = options || {}
    Object.assign(this, { logLevel, options, ...options, tag })
    this._logLevelIndex = getLogLevelIndex(logLevel)
  }

  async output(level, content, options = {}) {
    const logLevelIndex = getLogLevelIndex(level)
    if (logLevelIndex > this._logLevelIndex) {
      return
    }
    const opts = { ...options, count: 0 }
    content = objectifyAndRemoveCircularStructure(opts, content)
    if (this.tag) {
      content = { tag: this.tag, content }
    }
    const data = {
      level,
      time: moment.utc().format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
      content,
      count: opts.count
    }
    const rawData = JSON.stringify(data)
    if (this.fileName) {
      await fs.appendFile(this.fileName, `${rawData}\n`)
    } else {
      console.log(rawData)
      if (this.dupFileName) {
        await fs.appendFile(this.dupFileName, `${rawData}\n`)
      }
    }
  }

  createTagged(tag) {
    if (this.tag != null) {
      tag = `${this.tag}:${tag}`
    }
    return new Logger(this.logLevel, this.options, tag)
  }

  createLogging(options = {}) {
    return (format, data) => this.info({ format, bind: data.bind }, options)
  }
}
for (const level of logLevels) {
  Logger.prototype[level] = function (content, options = {}) {
    this.output(level, content, options)
  }
}
module.exports = Logger
