"use strict";
// C:/Users/Boris/YandexDisk/localhost.chrome
// const
//   appRoot = require('app-root-path')
// ;


/**
 * @class OVStreamReader describes Transform stream object, that converts openViBE stream (http://openvibe.inria.fr/stream-structures/)
 * into simple eeg samples stream {timestamp, ch0, ch1, ch2, ..., chN} and provides methods that returns properties of
 * openViBE stream, such as samplingRate, data matrix and description of its dimensions, sizes, column/row names etc.
 */
class OVStreamReader extends require('stream').Transform {
  constructor({
                ovStream,
                signalDescriptor = {},
                objectMode = true
              }) {
    super({objectMode: true});
    this.objectMode = objectMode;
    this.signalGlobals = signalDescriptor;
    this.header = {
      starttime: 0,
      samplingRate: 0,
      signal: {matrix: {dimensions: [[]]}},
      channelUnits: {matrix: {dimensions: [[]]}},
    };
    this.buffer = {
      length: 0,
      valueSize: 8,
      data: Buffer.alloc(0)
    };
    this.cursor = 0;
    ovStream.on(`data`, chunk => {
        this.header.starttime = this._getChildProperties(chunk, `timestamp`).value;
        this.header.samplingRate = this._getChildProperties(chunk, `OVTK_NodeId_Header_Signal_SamplingRate`).value;
        // console.log(this.header.samplingRate);
        if (!this.header.samplingRate) throw `OpenViBE stream error: Signal sampling rate undefined`;
        let signal = this._getChildObject(chunk, `OVTK_NodeId_Acquisition_Header_Signal`);
        if (!signal) throw `OpenViBE stream error: Signal header undefined`;
        this._setupMatrix(this.header.signal, signal);
        let channelUnits = this._getChildObject(chunk, `OVTK_NodeId_Acquisition_Header_ChannelUnits`);
        this._setupMatrix(this.header.channelUnits, channelUnits);
        
        let bufferProperties = this._getChildProperties(chunk, `OVTK_NodeId_Buffer_StreamedMatrix_RawBuffer`);
        if (bufferProperties) {
          this.buffer.valueSize = parseInt(bufferProperties.type.replace(/^\D+/g, ''));//regexp - to delete leading non digit signs, this will allow to parseInt convert type string (for instance "binary(float64)" into number (64)
          if (!this.buffer.valueSize) this.buffer.valueSize = 8;
          this.buffer.length = bufferProperties.size;
          this.buffer.data = Buffer.from(bufferProperties.buffer);
          
          // for (let d = 0; d < this.header.signal.matrix.dimensions.length; d++) {
          let valueSize = this.buffer.valueSize;
          this.cursor = 0;
          for (let row = 0, rows = this.header.signal.matrix.dimensions[1].length; row < rows; row++) {
            let flowRecord = [];
            this.cursor = 0;
            flowRecord.push(Math.round(this.header.starttime += 1000 / this.header.samplingRate));
            for (let column = 0, columns = this.header.signal.matrix.dimensions[0].length; column < columns; column++) {
              switch (valueSize) {
                case 64:
                  flowRecord.push(this.buffer.data.readDoubleLE(this.cursor));
                  break;
                case 32:
                  flowRecord.push(this.buffer.data.readFloatLE(this.cursor));
                  break;
                default:
                  flowRecord.push(this.buffer.data.readUInt8(this.cursor));
              }
              this.cursor += valueSize / 8;
            }
            // this._updateSignalDescription();
            this.write(flowRecord);
          }
        }
      }
    )
  }
  
  // _updateSignalDescription(){
  //   this.signalGlobals = this.header.starttime;
  //   this.signalGlobals = this.header.samplingRate;
  //   this.signalGlobals = this.header.signal;
  //   this.signalGlobals = this.header.channelUnits;
  // }
  
  /**
   * getChildProperties looks for propertyName in the element hierarchy and returns {type, size, value} of first found
   * @param element
   * @param propertyName
   * @return {{type, size, value}}
   */
  _getChildProperties(element, propertyName) {
    let result = null;
    for (let child in element) {
      if (element.hasOwnProperty(child)) {
        if (child === propertyName) {
          return {
            type: element[child].type,
            size: element[child].size,
            value: element[child].value,
            buffer: element[child].buffer
          };
        } else if (typeof element[child] === "object" && child !== `buffer`) {
          result = this._getChildProperties(element[child], propertyName);
          if (result) return result;
        }
      }
    }
    return result;
  }
  
  /**
   * getChildObject looks for objectName in the element hierarchy and returns first found element
   * @param element
   * @param objectName
   * @return {Object}
   */
  _getChildObject(element, objectName) {
    let result = null;
    for (let child in element) {
      if (element.hasOwnProperty(child)) {
        if (child === objectName && typeof element[child] === "object") {
          return element[child];
        } else if (typeof element[child] === "object" && child !== `buffer`) {
          result = this._getChildObject(element[child], objectName);
          if (result) return result;
        }
      }
    }
    return result;
  }
  
  /**
   * _setupMatrix gets data from corresponding element of openViBE stream and then fill the matrixContainer with parameters of matrix
   *
   * @param {Object} matrixContainer - will contain parameters of matrix
   * @param {Object} ovElement - contains corresponding element of openViBE stream
   * @private
   */
  _setupMatrix(matrixContainer, ovElement) {
    let dimensionsCount = this._getChildProperties(ovElement, `OVTK_NodeId_Header_StreamedMatrix_DimensionCount`).value;
    if (dimensionsCount > 1) {
      let dimensions = this._getChildObject(ovElement, `OVTK_NodeId_Header_StreamedMatrix_Dimension`);
      if (dimensions.length !== dimensionsCount) throw `OpenViBE stream error: inconsistency in openViBE matrix dimensions occurred.`;
      matrixContainer.matrix.dimensions = new Array(dimensionsCount);
      for (let d = 0; d < dimensionsCount; d++) {
        let
          dimensionlength = this._getChildProperties(dimensions[d], `OVTK_NodeId_Header_StreamedMatrix_Dimension_Size`).value,
          labels = this._getChildObject(dimensions[d], `OVTK_NodeId_Header_StreamedMatrix_Dimension_Label`)
        ;
        if (dimensionlength !== labels.length) throw `OpenViBE stream error: inconsistency in openViBE matrix labels occurred.`;
        // if(matrixContainer.matrix.dimensions[d] === undefined) matrixContainer.matrix.dimensions[d] = {labels: []};
        matrixContainer.matrix.dimensions[d] = new Array(dimensionlength);
        for (let l = 0; l < dimensionlength; l++) {
          matrixContainer.matrix.dimensions[d][l] = labels[l].value;
        }
      }
    } else {
    
    }
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(sampleVector, encoding, cb) {
    if (this.objectMode) {
      cb(null, sampleVector);
    } else {
      cb(null, `${JSON.stringify(sampleVector, null, 2)}\n`);
    }
  }
}

module.exports = OVStreamReader;