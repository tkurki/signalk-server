const Transform = require('stream').Transform
const Writable = require('stream').Writable
const _ = require('lodash')

const n2kAnalyzer = require('./n2kAnalyzer')
const from_json = require('./from_json')
const multiplexedlog = require('./multiplexedlog')
const nmea0183_signalk = require('./nmea0183-signalk')
const n2k_signalk = require('./n2k-signalk')
const log = require('./log')
const liner = require('./liner')
const execute = require('./execute')
const serialport = require('./serialport')
const udp = require('./udp')
const tcp = require('./tcp')
const filestream = require('./filestream')
const throttle = require('./throttle')

function Simple (options) {
  Transform.call(this, { objectMode: true })
  this.options = options
  this.pipeline = []

  var source = pipeStartByType[options.type]

  if (!source) {
    throw new Error(`invalid type: ${options.type}`)
  }

  var dataType = options.subOptions.dataType

  if (!dataType) {
    dataType = options.type
    if (!dataType) {
      throw new Error(`Unknown data type for ${options.type}`)
    }
  }

  if (!dataTypeMapping[dataType]) {
    throw new Error(`Unknown data type: ${dataType}`)
  }

  var subOptions = JSON.parse(JSON.stringify(options.subOptions))
  subOptions.app = options.app

  source(this.pipeline, subOptions)
  if (options.logging) {
    this.pipeline.push(
      new log({
        app: options.app,
        discriminator: discriminatorByDataType[dataType]
      })
    )
  }

  dataTypeMapping[dataType](this.pipeline, subOptions)

  for (var i = this.pipeline.length - 2; i >= 0; i--) {
    this.pipeline[i].pipe(this.pipeline[i + 1])
  }
  this.pipeline[this.pipeline.length - 1].pipe(this)
}

require('util').inherits(Simple, Transform)

Simple.prototype._transform = function (msg, encoding, done) {
  this.push(msg)
  done()
}

Simple.prototype.end = function () {
  this.pipeline[0].end()
}

module.exports = Simple

const discriminatorByDataType = {
  NMEA2000: 'A',
  NMEA0183: 'N',
  SignalK: 'I'
}

const dataTypeMapping = {
  SignalK: (pipeline, options) => {
    if (options.type != 'wss' && options.type != 'ws') {
      pipeline.push(new from_json(options))
    }
  },
  NMEA0183: (pipeline, options) => {
    pipeline.push(new nmea0183_signalk(options))
  },
  NMEA2000: (pipeline, options) => {
    pipeline.push(new n2kAnalyzer(options))
    pipeline.push(new n2k_signalk(options))
  },
  Multiplexed: (pipeline, options) => {
    pipeline.push(new multiplexedlog(options))
  }
}

const pipeStartByType = {
  NMEA2000: nmea2000input,
  NMEA0183: nmea0183input,
  Execute: executeInput,
  FileStream: fileInput,
  SignalK: signalKInput
}

function nmea2000input (pipeline, subOptions) {
  var command
  var toChildProcess
  if (subOptions.type == 'ngt-1') {
    command = `actisense-serial ${subOptions.device}`
    toChildProcess = 'nmea2000out'
  } else if (subOptions.type == 'canbus') {
    command = `candump ${subOptions.interface}`
    toChildProcess = null
  } else {
    throw new Error(`unknown NMEA2000 type ${subOptions.type}`)
  }
  pipeline.push(
    new execute({
      command: command,
      toChildProcess: toChildProcess,
      app: subOptions.app
    })
  )
  pipeline.push(new liner(subOptions))
}

function nmea0183input (pipeline, subOptions) {
  var el
  if (subOptions.type == 'tcp') {
    el = new tcp(subOptions)
  } else if (subOptions.type === 'udp') {
    el = new udp(subOptions)
  } else if (subOptions.type === 'serial') {
    el = new serialport(subOptions)
  } else {
    throw new Error(`Unknown networking tyoe: ${options.networking}`)
  }
  pipeline.push(el)
  pipeline.push(new liner(subOptions))
}

function execute (pipeline, subOptions) {
  pipeline.push(new execute(subOptions))
  pipeline.push(new liner(subOptions))
}

function fileInput (pipeline, subOptions) {
  pipeline.push(new filestream(subOptions))
  if (subOptions.dataType != 'Multiplexed') {
    pipeline.push(
      new throttle({
        rate: subOptions.throttleRate || 1000,
        app: subOptions.app
      })
    )
  }
  pipeline.push(new liner(subOptions))
}

function signalKInput (pipeline, subOptions) {
  var el
  var needsLiner = true
  if (subOptions.type === 'ws' || subOptions.type === 'wss') {
    var options = { app: subOptions.app }
    if (!subOptions.useDiscovery) {
      options.host = subOptions.host
      options.port = subOptions.port
    }
    options.protocol = subOptions.type
    const mdns_ws = require('./mdns-ws')
    el = new mdns_ws(options)
    needsLiner = false
  } else if (subOptions.type === 'tcp') {
    el = new tcp(subOptions)
  } else if (subOptions.type === 'udp') {
    el = new udp(subOptions)
  } else {
    throw new Error(`unknown SignalK type: ${subOptions.type}`)
  }
  pipeline.push(el)
  if (needsLiner) {
    pipeline.push(new liner(subOptions))
  }
}
