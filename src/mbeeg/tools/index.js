"use strict";
//todo>> to redistribute helpers by classes for which they are intended
//todo>> to separate tools/helpers library from mbeeg to distinct one

// noinspection JSUnusedGlobalSymbols
const
  {Transform} = require('stream')
  , fs = require('fs')
  // , fili = require('fili')
  // , json2csv = require('json2csv')
  , log = require('debug')('mbeeg:Tools')
  , stat = {
    max: array => Math.max.apply(null, array),
    min: array => Math.min.apply(null, array),
    range: array => stat.max(array) - stat.min(array),
    midrange: array => stat.range(array) / 2,
    sum: array => array.reduce((a, b) => a + b, 0),
    mean: array => stat.sum(array) / array.length,
    median: array => {
      array.sort(function (a, b) { return a - b; });
      let mid = array.length / 2;
      return mid % 1 ? array[mid - 0.5] : (array[mid - 1] + array[mid]) / 2;
    },
    modes: array => {
      if (!array.length) return [];
      let modeMap = {},
        maxCount = 0,
        modes = [];
      
      array.forEach(val => {
        if (!modeMap[val]) modeMap[val] = 1;
        else modeMap[val]++;
        
        if (modeMap[val] > maxCount) {
          modes = [val];
          maxCount = modeMap[val];
        }
        else if (modeMap[val] === maxCount) {
          modes.push(val);
        }
      });
      return {modes: modes, frequency: maxCount, weight: maxCount / array.length};
    },
    variance: array => {
      let mean = stat.mean(array);
      return stat.mean(array.map(num => Math.pow(num - mean, 2)));
    },
    standardDeviation: array => Math.sqrt(stat.variance(array)),
    meanAbsoluteDeviation: array => {
      let mean = stat.mean(array);
      return stat.mean(array.map(num => Math.abs(num - mean)));
    },
    zScores: array => {
      let mean = stat.mean(array);
      let standardDeviation = stat.standardDeviation(array);
      return array.map(num => (num - mean) / standardDeviation);
    }
  }
;

// noinspection JSUnusedLocalSymbols
/**
 * returns a random array where the new first element doesn't equal to previous last element
 * so one stimulus won't appear two times in a row
 * @param arr
 * @return {*}
 */
function randomWithoutConjunctions(arr) {
  let last = arr[arr.length - 1];
  arr.sort(() => Math.random() - 0.5);
  return arr[0] === last ? arr.push(arr.shift()) : arr;
}

/**
 * @class Tools class contains tools & helper functions for operation with EBML subjects, such as variable-length integers
 * binary tags, endians etc., contains preprocessing functions for raw EEG data (filtering, epoching, reshaping, etc...)
 * and variety of other helper functions
 *
 * @see EBML, variable-length integers, UTF, Endianness, DSP, EEG
 */
class Tools {
  constructor() {
    this.timer = {};
  }

// static SGDDecision({verdict, start = 2, cycles = 10, threshold = 5, startweights = 1, startgradient = 0}) {
//   if (reset) {
//     let
//       weights = new Array(verdict.length).fill(startweights)
//       , gradients = new Array(verdict.length).fill(startgradient)
//     ;
//   }
//   this.weights = this.weights.map((e, i) => e * this.grad[i]);
//   this.result = verdict.map((e, i) => e * this.weights[i]);
//   this.grad = verdict;
// }
  
  /**
   *
   * @param verdictsQueue
   * @param winnersQueues
   * @param start
   * @param maxCycles
   * @param threshold
   * @return {{ready: boolean, status: string, winner: null}}
   */
  static majorityDecision({
                            verdictsQueue
                            , start
                            , minCycles
                            , maxCycles
                            , threshold
                          }) {
    let
      result = {
        ready: false,
        status: "decision-making process hasn't reached starting cycle yet",//for debug purposes
        winners: [],//one per channel
      }
      , verdictsQueueLength = verdictsQueue.length
      , channelsNumber = verdictsQueue[0].length//at least on verdict should be presented (under index 0)
      , winnersQueues = new Array(channelsNumber).fill([])//todo>> change "if(someArray===undefined)" to "someArr=[..]" everywhere
      // , accumulatedWeights = new Array(channelsNumber).fill([])
      , winnersModes = new Array(channelsNumber).fill([])//todo>> change partly filled arrays to objects
    ;
    
    for (let verdictsSetIndex = 0; verdictsSetIndex < verdictsQueueLength; verdictsSetIndex++) {
      for (let channel = 0; channel < channelsNumber; channel++) {
        if (verdictsSetIndex >= start - 1) {
          result.status = `Channel ${channel}, inner overall counter is ${verdictsSetIndex}; `;
          let
            verdict = verdictsQueue[verdictsSetIndex][channel]
            , winner = verdict.reduce((ac, v, i, ar) => //idx of max
              ar[ac] === undefined || ar[ac] < v ? i : ac, 0)
          ;
          winnersQueues[channel].push(winner);
          result.status = `${result.status} winners queues ${JSON.stringify(winnersQueues)}; `;
          winnersModes[channel] = stat.modes(winnersQueues[channel])
        }
      }
    }
    
    for (let channel = 0; channel < channelsNumber; channel++)
      if (verdictsQueueLength >= minCycles && verdictsQueueLength <= maxCycles) {
        if (winnersModes[channel].weight >= threshold) {
          result.winners.push(winnersModes[channel].modes[winnersModes[channel].modes.length - 1]);
        }
        else if (verdictsQueueLength === maxCycles) {
          result.winners.push(-1);
        }
        result.status = `${result.status} NextDecisionReady - winners = ${JSON.stringify(result.winners)}`;
      }
    
    if (result.winners.length === channelsNumber)
      result.ready = true;
    
    return result;
  }
  
  /**
   *
   * @param verdictsQueue
   * @param winnersQueues
   * @param start
   * @param maxCycles
   * @param threshold
   * @return {{ready: boolean, status: string, winner: null}}
   */
  static nInARowDecision({
                           verdictsQueue
                           , start = 3
                           , maxCycles = 10
                           , threshold = 5
                         }) {
    let
      result = {
        ready: false,
        status: "decision-making process hasn't reached starting cycle yet",
        winners: [],
      }
      , verdictsQueueLength = verdictsQueue.length
      , channelsNumber = verdictsQueue[0].length
      , winnersQueues = new Array(channelsNumber).fill([])//todo>> change if(someArray===undefined) someArr=[..] everywhere
      , winnersSeriesLengths = new Array(channelsNumber).fill(1)
    ;
    if (verdictsQueueLength > maxCycles) {
      result = {
        ready: true,
        status: "decision-making failed, maxCycles xceeded. Winners id = -1",
        winners: new Array(channelsNumber).fill(-1)
      };
    } else {
      for (let verdictsSetIndex = 0; verdictsSetIndex < verdictsQueueLength; verdictsSetIndex++) {
        for (let channel = 0; channel < channelsNumber; channel++) {
          if (verdictsSetIndex >= start - 1) {
            result.status = `Channel ${channel}, inner overall counter is ${verdictsSetIndex}; `;
            let
              verdict = verdictsQueue[verdictsSetIndex][channel]
              , winner = verdict.reduce((ac, v, i, ar) => //idx of max
                ar[ac] === undefined || ar[ac] < v ? i : ac, 0)
            ;
            winnersQueues[channel].push(winner);
            result.status = `${result.status} winners queues ${JSON.stringify(winnersQueues)}; `;
            if (winnersQueues[channel][winnersQueues[channel].length - 1]
              === winnersQueues[channel][winnersQueues[channel].length - 2]) {
              if (++winnersSeriesLengths[channel] >= threshold) {
                result.winners.push(winnersQueues[channel][winnersQueues[channel].length - 1]);
                result.status = `${result.status} NextDecisionReady - winners = ${JSON.stringify(result.winners)}`;
                result.ready = true;
              }
            } else {
              winnersSeriesLengths.fill(1);
            }
          }
        }
      }
    }
    
    return result;
  }
  
  /**
   * run some function once after time out is being expired
   * @param functionToRun
   * @param timeout
   */
  static runDebounced(functionToRun, timeout) {
    clearTimeout(this.timer);
    this.timer = setTimeout(functionToRun, timeout);
  }
  
  /**
   * returns - copy of sourceObject
   * @param sourceObject
   * @return {*} - copy of sourceObject
   */
  static copyObject(sourceObject) {
    let copy;
    
    // Handle the 3 simple types, and null or undefined
    if (null == sourceObject || "object" !== typeof sourceObject) return sourceObject;
    // Handle Date
    if (sourceObject instanceof Date) {
      copy = new Date();
      copy.setTime(sourceObject.getTime());
      return copy;
    }
    
    // Handle Array
    if (sourceObject instanceof Array) {
      copy = [];
      for (let i = 0, len = sourceObject.length; i < len; i++) {
        copy[i] = this.copyObject(sourceObject[i]);
      }
      return copy;
    }
    
    // Handle Object
    if (sourceObject instanceof Object) {
      copy = {};
      for (let attr in sourceObject) {
        if (sourceObject.hasOwnProperty(attr)) copy[attr] = this.copyObject(sourceObject[attr]);
      }
      return copy;
    }
    
    throw new Error("Unable to copy obj! Its type isn't supported.");
  }
  
  /**
   * Returns configuration object with information obtained from configuration file
   * @param {String} path - path to configuration file
   * @param parse - if true return object else return string
   */
  static loadConfiguration(path, parse = true) {
    let strConf = fs.readFileSync(path);
    return parse ? JSON.parse(strConf) : strConf;
  }
  
  // noinspection JSUnusedGlobalSymbols
  /**
   * randomizeArray returns randomly sequenced arr
   * @param {Array} arr - array to randomize
   * @return {Array} - randomized arr
   */
  static randomizeArray(arr) {
    return arr.sort(() => { return Math.random() - 0.5; })
  }
  
  // noinspection JSUnusedGlobalSymbols
  /**
   * returns value v filled with zeroes to length l
   * @param l
   * @param v
   * @return {string}
   */
  static pad(l, v) {// l - length of zero-leading string number, v - number value
    return new Array(l).fill(0).concat(v).join('').substr(v.toString().length > l ? -v.toString().length : -l);
  }

  /**
   * deleteLeadZeros - deletes leading zeros from the string that represents uint64
   *
   * @param uint64hexString
   * @param deleteZeroFromFirstByte
   * @return {string}
   */
  static deleteLeadZeros(uint64hexString, deleteZeroFromFirstByte = false) {//if alignByte=true then leading zero of first byte won't be deleted
    let
      idL = parseInt(uint64hexString.substr(-8), 16).toString(16),
      idH = uint64hexString.length > 8 ? parseInt(uint64hexString.substr(0, uint64hexString.length - 8), 16).toString(16) : ``;
    if (deleteZeroFromFirstByte) return idH.length ? `${idH}${'0'.repeat(idL.length % 2)}${idL}` : `${idL}`;
    else return idH.length ? `${'0'.repeat(idH.length % 2)}${idH}${'0'.repeat(idL.length % 2)}${idL}` : `${'0'.repeat(idL.length % 2)}${idL}`;
  }
  
  // noinspection JSUnusedGlobalSymbols
  /**
   * idxOfMax - returns index of max element of array
   *
   * @param arr
   * @return {*}
   */
  static idxOfMax(arr) {
    // noinspection JSUnusedAssignment
    return arr.reduce((ac, v, i, ar) => ar[ac] < v ? i : ac, 0);
  }
  
  /**
   * nD - calculates Number Of Dimensions of an array
   *
   * @param arr - array to calculate its dimensions
   * @return {number} - number of dimensions of array
   */
  static nD(arr) {
    return Array.isArray(arr) ? 1 + this.nD(arr[0]) : 0;
  }
  
  /**
   * absIntegral - calculates integral sum of abs of samples of feature series in the analytical window
   *
   * @param {Array} feature - source timeseries
   * @param {Number} start - start of analytical window in ms
   * @param {Number} window - width of analytical window in ms
   * @return {Number} - Sum of samples absolute values from within analytical window
   */
  static absIntegral({feature, start, window}) {
    let //feature length equal to sampling rate
      begin = Math.round(feature.length * start / 1000),
      end = Math.round(begin + feature.length * window / 1000)
    ;
    return Math.abs(feature.slice(begin, end).reduce((acc, val) => acc + Math.abs(val), 0));
  }
  
  /**
   * @function normalizeVecotorBySum calculates values of vector elements if norm equal to sum of vector elements
   * @param vector - vector to normolize
   */
  static normalizeVectorBySum(vector) {
    let sum = vector.reduce((a, b) => a + b);
    return vector.map(v => v / sum);//normalization
  }
  
  /**
   * @function "function" returns vector with same dimenstion as input vector with all elements set ot zero except biggest one wich is set into one
   * @param {Array} vector - input vector
   */
  static chooseBiggest(vector) {
    let max = vector.reduce((a, b) => a > b ? a : b);
    return vector.map(v => v === max ? 1 : 0);
  }
  
  /**
   * lowpass fourth order Butterworth filter with zero-phase (or forward backward filtering)
   *
   * @param {Array} timeseries - stream, buffer or object with values to filter
   * @param {number} samplingrate - timeseries sampling rate, Hz
   * @param {number} cutoff - low pass cut off frequency, Hz
   * @param {boolean} passthrough if true function returns array equal to input timeseries (default = false)
   * @return {Array} time series filtered data (same size as input flow)
   */
  static butterworth4Bulanov({timeseries, samplingrate = 0, cutoff = 0, passthrough = false}) {
    log(`               ::butterworth4::timeseries.length = ${timeseries.length}`);
    if (!timeseries.length) throw 'no timeseries in butterworth4';//return null;
    if (!cutoff || passthrough) return timeseries.slice();
    if (!samplingrate) throw 'Butterworth4 error! Non zero sampling rate parameter is required!';
    if (timeseries.length < 2 / cutoff) throw 'Butterworth4 error! The length of timeseries must be at least as doubled 1/cutoff!';
    if (samplingrate / 2 < cutoff) throw 'Butterworth4 error! The sampling rate of input time series must be at least as doubled cutoff frequiency!';
    
    let dF2 = timeseries.length;
    let dat2 = new Array(dF2 + 3).fill(0);
    
    dat2[1] = timeseries[0];
    dat2[0] = timeseries[0];
    for (let r = 0; r < dF2; r++) dat2[r + 2] = timeseries[r];
    
    let w = cutoff * Math.PI / samplingrate;
    let wc = Math.tan(w);
    
    let k1 = Math.SQRT2 * wc;
    let k2 = Math.pow(wc, 2);
    let a = k2 / (1 + k1 + k2);
    let b = 2 * a;
    let c = a;
    let k3 = b / k2;
    let d = -2 * a + k3;
    let e = 1 - (2 * a) - k3;
    
    let datYt = new Array(dF2 + 4).fill(0);
    datYt[1] = timeseries[0];
    datYt[0] = timeseries[0];
    for (let i = 1; i <= dF2 + 1; i++)
      datYt[i + 1] = a * dat2[i + 1] + b * dat2[i] + c * dat2[i - 1] + d * datYt[i] + e * datYt[i - 1];
    
    datYt[dF2 + 3] = datYt[dF2 + 1];
    datYt[dF2 + 2] = datYt[dF2 + 1];
    
    //Forward filter
    let datZt = new Array(dF2 + 2).fill(0);
    
    datZt[dF2] = datYt[dF2 + 2];
    datZt[dF2 + 1] = datYt[dF2 + 3];
    for (let i = dF2 - 1; i >= 0; i--)
      datZt[i] = a * datYt[i + 2] + b * datYt[i + 3] + c * datYt[i + 4] + d * datZt[i + 1] + e * datZt[i + 2];
    
    return datZt.splice(1, dF2);
  }
  
  // noinspection JSUnusedGlobalSymbols
  /**
   * custom rereferencing by subtracting common average
   * @param timeseries
   */
  static rereference(timeseries) {
    let arr = timeseries.slice();
    let avgsum = arr.reduce((a, b) => a + b) / arr.length;
    for (let i = 0; i < arr.length; i++) arr[i] = arr[i] - avgsum;
    return arr;
  }
  
  /**
   * custom detrend of time series data
   *
   * @param {Array} timeseries - stream, buffer or object with values ot detrend
   * @param {Boolean} normalized - if false - absolute detrending, if true - relative percentage detrending
   * @return {Array} detrend - detrended data, the same size as series input is
   */
  static detrend({timeseries, normalized = false}) {
    try {
      log(`               ::detrend${normalized ? '_normalized' : '_absolute'}::timeseries.length = ${timeseries.length}`);
      let
        n = timeseries.length
        , sumxy = 0
        , sumy = 0
        , sumx = n * (n + 1) / 2 //sum of the first n natural numbers
        , sumxx = n * (n + 1) * (2 * n + 1) / 6 //sum of the squares of the first n natural numbers
      ;
      
      for (let i = 0; i < n; i++) {
        sumy += timeseries[i];
        sumxy += (i + 1) * timeseries[i];
      }
      
      let
        a = (n * sumxy - sumx * sumy) / (n * sumxx - sumx * sumx)
        , b = (sumy - a * sumx) / n
        , trend = new Array(n)
        , detrended = new Array(n)
      ;
      
      for (let i = 0; i < n; i++) {
        trend[i] = (i + 1) * a + b;
        if (normalized)
          detrended[i] = ((timeseries[i] / trend[i]) - 1) * 100; //if trend[i] traverses zero there will be a problem
        else
          detrended[i] = timeseries[i] - trend[i];
      }
      
      return detrended;
    } catch (err) {
      throw err;
    }
  }
  
  /**
   * vInt function calculates length, value and uint8 buffer of variable-length integer
   *
   * @param {Array} buffer stream buffer or string that contains variable-length integers of EBML stream or file
   * @param {number} offset buffer index of the first byte of the variable-length integer
   * @return {{start: number, length: number, buffer: Array.<*>, value: *}} {offset, length, value buffer, value}
   * **/
  static vInt(buffer, offset = 0) {
    let bytes = 0;
    //noinspection StatementWithEmptyBodyJS
    while (!buffer[offset + bytes++]) ; //bytes with vInt descriptor
    let
      firstByte = offset + bytes - 1, //index of byte with alignment part of vInt data
      vIntAlignmentLength = Math.floor(Math.log2(buffer[firstByte])),
      vIntFullLength = 8 * bytes - vIntAlignmentLength, // vInt full length in bytes === number of bits of vInt descriptor
      valueBuffer = buffer.slice(firstByte, firstByte + vIntFullLength - bytes + 1);
    valueBuffer[0] = valueBuffer[0] & (Math.pow(2, vIntAlignmentLength) - 1);
    // valueBuffer[0] = valueBuffer[0] & (Math.pow(2, 8 - vIntFullLength + (bytes - 1) * 8) - 1);
    return {
      start: offset,//firstByte,
      length: vIntFullLength,
      buffer: valueBuffer,
      hexString: this.bigEndian(valueBuffer)
    }
    //todo>> the alternative ways to calculate length should be considered
    // const value = parseInt(this.bigEndian(offset, bytes, buffer), 16); //value in descriptor
    // return Math.ceil(Math.log2(-(1 + ~(1 << bytes * 8)) / value)); //length of vInt
    // One more way to calculate length is using javascript Math.clz32(first4bytes)
    // let length2 = 8 * (bytes - 1) + Math.clz32(buffer[firstByte]) - 23;
    //todo>> there is much much faster approach to get vInt length, this is the precalculated vector with 256 elements (i.e. 2^8 elements)
    // that contains vectors with length equal to number of bytes of length descriptor
    // each element of last vector keeps precalculated length of vInt for that specific length of vInt length descriptor
    // then vInt could be expressed like something like this: {let bytes=0; while(!buffer[bytes++]); return table256[buffer[bytes]][bytes];}
    // in that case current implementation of vInt could be used to precalculate table256 before beginning the parsing process
  }
  
  /**
   * bigEndian calculates value from buffer according to big-endian order of bytes
   * @param {Array} buffer stream buffer or string that contains variable-length integers of EBML stream or file
   * @param {number} length length of value in bytes
   * @param {number} offset buffer index of the first byte of the value
   * **/
  static bigEndian(buffer, length = buffer.length, offset = 0) {
    let exp = length - 1;
    if (offset + length > buffer.length) throw new Error(`Length out of buffer boundaries: ${length}`);
    return `0${buffer[offset].toString(16)}`.substr(-2) + (exp === 0 ? "" : this.bigEndian(buffer, exp, offset + 1));
  }
  
  // noinspection JSUnusedGlobalSymbols
  /**
   * littleEndian calculates value from buffer according to little-endian order of bytes
   * @param {Array} buffer stream buffer or string that contains variable-length integers of EBML stream or file
   * @param {number} length length of value in bytes
   * @param {number} offset buffer index of the first byte of the value
   * **/
  static littleEndian(buffer, length, offset = 0) {
    let exp = length - 1;
    if (offset + length > buffer.length) throw new Error(`Length out of buffer boundaries: ${length}`);
    return `0${buffer[offset + exp].toString(16)}`.substr(-2) + (exp === 0 ? "" : this.littleEndian(buffer, exp, offset));
  }
  
}

class Objectifier extends Transform {
  constructor() {
    super({objectMode: true});
  }
  
  // noinspection JSMethodCanBeStatic
  // noinspection JSUnusedGlobalSymbols
  _transform(chunk, encoding, cb) {
    cb(null, JSON.parse(chunk.toString()));
  }
}

class Stringifier extends Transform {
  constructor({
                beginWith = ``
                , chunkBegin = ``
                , chunksDelimiter = ``
                , chunkEnd = ``
                , endWith = ``
                , indentationSpace = 0
                , stringifyAll = false
              } = {}) {
    super({objectMode: true});
    this.chunkBegin = chunkBegin;
    this.delimiter = chunksDelimiter;
    this.chunkEnd = chunkEnd;
    this.once(`data`, () => this.push(beginWith));
    this.once(`unpipe`, () => {
      this.push(endWith);
      this.running = false;
    });
    this.running = false;
    this.space = indentationSpace;
    this.stringifyAll = stringifyAll;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(chunk, encoding, cb) {
    if (this.stringifyAll) cb(null, `${this.running ? this.delimiter : ''}${this.chunkBegin}${JSON.stringify(chunk)}${this.chunkEnd}`);
    else cb(null, `${this.running ? this.delimiter : ''}${this.chunkBegin}${JSON.stringify(chunk, null, this.space)}${this.chunkEnd}`);
    this.running = true;
  }
}

class NTVerdictStringifier extends Stringifier {
  constructor(options = {fields: []}) {
    super(options);
    this.fields = options.fields;
  }
  
  _transform(verdicts, encoding, cb) {
    let output = this.chunkBegin;
    let running = false;
    
    for (let verdict of verdicts) {
      for (let i = 0; i < verdict.length; i++) {
        output += running ? this.delimiter : '';
        let running2 = false;
        for (let j = 0; j < this.fields.length; j++) {
          output += `${running2 ? this.delimiter : '{'} "${this.fields[j].name}": `;
          if (this.fields[j].type === "literal") output += `"${this.fields[j].content}"`;
          else if (this.fields[j].type === "id") output += `${i}`;
          else if (this.fields[j].type === "value") output += `${verdict[i]}`;
          running2 = true;
        }
        output += `}`;
        running = true
      }
      output += `${this.chunkEnd}`;
      this.push(`${JSON.stringify(JSON.parse(output), null, this.space)}\r\n`);
    }
    cb();
  }
  
}

class NTStimuliStringifier extends Stringifier {
  constructor(options = {fields: []}) {
    super(options);
    this.fields = options.fields;
  }
  
  _transform(chunk, encoding, cb) {
    let output = this.chunkBegin;
    let running = false;
    
    for (let j = 0; j < this.fields.length; j++) {
      output += `${running ? this.delimiter : '{'} "${this.fields[j].name}": `;
      
      if (this.fields[j].type === "literal") output += `"${this.fields[j].content}"`;
      else if (this.fields[j].type === "id") output += `${j}`;
      else if (this.fields[j].type === "value") output += `${chunk[j]}`;
      
      running = true;
    }
    output += `}${this.chunkEnd}`;
    cb(null, `${JSON.stringify(JSON.parse(output), null, this.space)}\r\n`);
  }
  
}

class Channels extends Transform {
  constructor({
                keys = []
                , channels = []
              }) {
    super({objectMode: true});
    this.keys = keys;
    this.channels = channels;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(epoch, encoding, cb) {
    if (!this.keys.length || this.keys.includes(epoch.key)) {
      let result = `Epoch number: ${epoch.number} - `;
      for (let chN = 0; chN < epoch.channels.length; chN++) {
        if (!this.channels.length || this.channels.includes(chN)) {
          let fieldName = `key${('0' + epoch.key).substr(-2)}::ch${('0' + chN).substr(-2)}`;
          // fields.push({key: +epoch.key, channel: chN, fieldName: fieldName, data: epoch.channels[chN]});
          // data.push({key: +epoch.key, channel: chN, data: epoch.channels[chN]});
          result += `${fieldName}=sum(${epoch.channels[chN].reduce((a, b) => a + b)}) \n`;
        }
      }
      cb(null, result);
    }
  }
  
}

class Sampler extends Transform {
  constructor() {
    super({objectMode: true});
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(samples, encoding, cb) {
    if (Array.isArray(samples[0])) {
      let samplesLength = samples.length;
      for (let s = 0; s < samplesLength; s++)
        this.push(`${samples[s].join()}\r\n`);
    } else
      this.push(`${samples.join()}\r\n`);
    cb();
  }
}

class EpochsHorizontalLogger extends Transform {
  constructor() {
    super({objectMode: true});
  }
  
  // noinspection JSMethodCanBeStatic
  // noinspection JSUnusedGlobalSymbols
  _transform(epoch, encoding, cb) {
    let row = [];
    for (let ch = 0, channelsNumber = epoch.channels.length; ch < channelsNumber; ch++) {
      row.unshift(...epoch.channels[ch]);
    }
    row.unshift(epoch.cycle);
    row.unshift(epoch.key);
    row.unshift(epoch.timestamp);
    cb(null, `${row.join()}\r\n`);
  }
}

class EpochsVerticalLogger extends Transform {
  constructor() {
    super({objectMode: true});
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(epoch, encoding, cb) {
    let
      row = []
      , samples = epoch.channels[0].length
      , channels = epoch.channels.length
      , timestamp = epoch.timestamp
      , delta = epoch.duration / epoch.samplingRate
    ;
    for (let s = 0; s < samples; s++) {
      row = [];
      for (let ch = 0; ch < channels; ch++) {
        row.push(epoch.channels[ch][s]);
        row.unshift(epoch.cycle);
        row.unshift(epoch.key);
        row.unshift(timestamp);
        timestamp += delta;
        this.push(`${row.join()}\r\n`);
      }
    }
    cb();
  }
}

class FeatureHorizontalLogger extends Transform {
  constructor({
                stimuliIdArray
                , start = 0
                , window = 0
              }) {
    super({objectMode: true});
    this.stimuliIdArray = stimuliIdArray;
    this.start = start;
    this.window = window;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(chunk, encoding, cb) {
    let features = Tools.copyObject(chunk);
    let
      row
      , channels = features[this.stimuliIdArray[0]].length
      , start = Math.round(this.start * features[this.stimuliIdArray[0]][0].length / 1000)
      , window = Math.round(start + this.window * features[this.stimuliIdArray[0]][0].length / 1000)
    ;
    
    for (let key of this.stimuliIdArray) {
      row = [];
      for (let ch = 0; ch < channels; ch++)
        if (!this.window)
          row.push(...features[key][ch]);
        else {
          log(`all features length ${features[this.stimuliIdArray[0]][0].length} windowed features start ${start} and window ${window}`);
          for (let i = start; i < window; i++) {
            row.push(features[key][ch][i]);
          }
        }
      
      row.unshift(key);
      
      this.push(`${row.join()}\r\n`);
    }
    cb();
  }
  
  setStimuliIdArray(newArray) {
    this.stimuliIdArray = newArray;
  }
  
}

class FeatureVerticalLogger extends Transform {
  constructor({stimuliIdArray}) {
    super({objectMode: true});
    this.stimuliIdArray = stimuliIdArray;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(features, encoding, cb) {
    let
      row
      , channels = features[this.stimuliIdArray[0]].length
      , samples = features[this.stimuliIdArray[0]][0].length
    ;
    
    for (let key of this.stimuliIdArray) {
      for (let ch = 0; ch < channels; ch++) {
        for (let s = 0; s < samples; s++) {
          row = [];
          row.push(key);
          row.push(features[key][ch][s]);
          this.push(`${row.join()}\r\n`);
        }
      }
    }
    cb();
  }
  
  // noinspection JSUnusedGlobalSymbols
  setStimuliIdArray(newArray) {
    this.stimuliIdArray = newArray;
  }
  
}

module.exports = {
  Tools: Tools
  , Stringifier: Stringifier
  , Objectifier: Objectifier
  , NTVerdictStringifier: NTVerdictStringifier
  , NTStimuliStringifier: NTStimuliStringifier
  , Channels: Channels
  , Sampler: Sampler
  , EpochsHorizontalLogger: EpochsHorizontalLogger
  , EpochsVerticalLogger: EpochsVerticalLogger
  , FeatureHorizontalLogger: FeatureHorizontalLogger
  , FeatureVerticalLogger: FeatureVerticalLogger
};
