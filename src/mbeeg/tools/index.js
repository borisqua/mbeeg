"use strict";
const
  {Transform} = require('stream')
  , fs = require('fs')
  // , fili = require('fili')
  // , json2csv = require('json2csv')
;

/**
 * @class Tools class contains tools & helper functions for operation with EBML subjects, such as variable-length integers
 * binary tags, endians etc., contains preprocessing functions for raw EEG data (filtering, epoching, reshaping, etc...)
 * and variety of other helper functions
 *
 * @see EBML, variable-length integers, UTF, Endianness, DSP, EEG
 */
class Tools {
  
  /**
   * Returns configuration object with information obtained from configuration file
   * @param {String} path - path to configuration file
   */
  static loadConfiguration(path) {
    let strConf = fs.readFileSync(path);
    return JSON.parse(strConf);
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
    return arr.reduce((ac, v, i, ar) => ar[ac] < v ? ac = i : ac, 0);
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
   * @param {Number} samplingRate - sampling rate for feature in Hz
   * @param {Number} windowStart - start of analytical window in ms
   * @param {Number} windowWidth - width of analytical window in ms
   * @return {Number} - Sum of samples absolute values from within analytical window
   */
  static absIntegral(feature, samplingRate, windowStart, windowWidth) {
    let
      start = samplingRate * windowStart / 1000,
      end = start + samplingRate * windowWidth / 1000;
    
    return Math.abs(feature.slice(start, end).reduce((acc, val) => acc + Math.abs(val), 0));
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
  static butterworth4Bulanov(timeseries, samplingrate = 0, cutoff = 0, passthrough = false) {
    console.log(`timeseries.length = ${timeseries.length}`);
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
   * @param {boolean} passtrough if true return trend & detrend equals to input timeseries (default = false)
   * @return {Array} detrend - detrended data, the same size as series input is
   */
  static detrend(timeseries, passtrough = false) {
    try {
      if (passtrough) {
        return timeseries.slice();
      }
      // if (!timeseries) throw `Detrend error! No input data!`;
      let n = timeseries.length;
      let sumxy = 0;
      for (let i = 0; i < n; i++) sumxy += (i + 1) * timeseries[i];
      let sumx = n * (n + 1) / 2; //sum of the first n natural numbers
      let sumy = 0;
      for (let i = 0; i < n; i++) sumy += timeseries[i];
      // let sumxx = Math.pow(n, 3) / 3 + Math.pow(n, 2) / 2 + n / 6; //sum of the squares of the first n natural numbers
      let sumxx = n * (n + 1) * (2 * n + 1) / 6;//sum of the squares of the first n natural numbers
      let a = (n * sumxy - sumx * sumy) / (n * sumxx - sumx * sumx);
      let b = (sumy - a * sumx) / n;
  
      let trend = new Array(n);
      let detrend = new Array(n);
  
      for (let i = 0; i < n; i++) {
        trend[i] = (i + 1) * a + b;
        detrend[i] = timeseries[i] - trend[i];
        // detrend[i] = ((timeseries[i] / trend[i]) - 1) * 100; //if trend[i] traverses zero there will be a problem
      }
  
      return detrend;
    } catch (err){
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
    //TODO Alternative ways to calculate length should be tested and assessed
    // const value = parseInt(this.bigEndian(offset, bytes, buffer), 16); //value in descriptor
    // return Math.ceil(Math.log2(-(1 + ~(1 << bytes * 8)) / value)); //length of vInt
    // One more way to calculate length is using javascript Math.clz32(first4bytes)
    // let length2 = 8 * (bytes - 1) + Math.clz32(buffer[firstByte]) - 23;
    //TODO there is much much faster approach to get vInt length, it is the precalculated vector with 256 elements (i.e. 2^8 elements)
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

class Stimuli extends require('stream').Transform {
  constructor({
                objectMode = true,
                learning = false,
                learningCycleDuration = 0,
                stimuliArray = [],
                learningArray = stimuliArray,
                signalDuration = 0,
                pauseDuration = 0,
                nextSequence = arr => {
                  return arr.sort(() => {
                    return Math.random() - 0.5;
                  })
                },
                nextTarget = (arr, previousTarget, learningCycle) => {
                  if (previousTarget++ > arr.length - 1)
                    return previousTarget = learningCycle = 0;
                  else {
                    learningCycle++;
                    return previousTarget;
                  }
                }
              }) {
    super({objectMode: true});
    this.idarray = stimuliArray.slice();
    this.stimulus = [];
    this.signalDuration = signalDuration;
    this.pauseDuration = pauseDuration;
    this.stimulusCycleDuration = signalDuration + pauseDuration;
    this.stimulusCycle = -1;
    this.currentStimulus = 0;
    this.objectMode = objectMode;
    this.learning = learning;
    this.learningDuration = learningCycleDuration;
    this.currentLearningCycle = 0;
    this.learningArray = learningArray;
    this.currentTargetStimulus = 0;
    this._nextSequence = nextSequence;
    this._nextTarget = nextTarget;
    
    this._resetStimuli();
  }
  
  // noinspection JSUnusedGlobalSymbols
  _read(size) {
    setTimeout(() => {
      
      this.stimulus = [
        new Date().getTime(),
        this.idarray[this.currentStimulus],
        this.learning && this.currentStimulus === this.currentTargetStimulus ? 1 : 0 //target field = in learning mode - true if target key, false if not, and null in online mode
      ];
      
      if (this.objectMode) {
        this.push(this.stimulus);
      } else
        this.push(`${JSON.stringify(this.stimulus)}`);
      
      this._checkCycles();
    }, this.stimulusCycleDuration);
  }
  
  _resetStimuli() {
    this.stimulusCycle++;
    this.currentStimulus = 0;
    return this._nextSequence(this.idarray); //randomize idarray order
  }
  
  _checkCycles() {
    if (this.currentStimulus++ === this.idarray.length - 1) {
      this._resetStimuli();
      if (this.learning && this.currentLearningCycle > this.learningDuration - 1)
        this._nextTarget(this.learningArray, this.currentTargetStimulus, this.currentLearningCycle);
    }
  }
  
}

class Objectifier extends Transform {
  constructor() {
    super({objectMode: true});
  }
  
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
              }) {
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
    else cb(null, `${this.running ? this.delimiter : ''}${this.chunkBegin}${JSON.stringify(chunk,null, this.space)}${this.chunkEnd}`);
    this.running = true;
  }
}

class NTrainerVerdictStringifier extends Stringifier {
  constructor(options = {fields: []}) {
    super(options);
    this.fields = options.fields;
  }
  
  _transform(chunk, encoding, cb) {
    let output = this.chunkBegin;
    let running = false;
    
    for (let i = 0; i < chunk.length; i++) {
      output += running ? this.delimiter : '';
      let running2 = false;
      for (let j = 0; j < this.fields.length; j++) {
        output += `${running2 ? this.delimiter : '{'} "${this.fields[j].name}": `;
        if (this.fields[j].type === "literal") output += `"${this.fields[j].content}"`;
        else if (this.fields[j].type === "id") output += `${i}`;
        else if (this.fields[j].type === "value") output += `${chunk[i]}`;
        
        running2 = true;
      }
      output += `}`;
      running = true
    }
    output += `${this.chunkEnd}`;
    cb(null, `${JSON.stringify(JSON.parse(output), null, this.space)}\r\n`);
  }
  
}

class NTrainerStimuliStringifier extends Stringifier {
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
    cb(null, `${JSON.stringify(JSON.parse(output), null, this.space)}`);
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
      let result = `Cycle: ${epoch.cycle} - `;
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

module.exports = {
  Tools: Tools
  , Stimuli: Stimuli
  , Stringifier: Stringifier
  , Objectifier: Objectifier
  , NTVerdictStringifier: NTrainerVerdictStringifier
  , NTStimuliStringifier: NTrainerStimuliStringifier
  , Channels: Channels
};
