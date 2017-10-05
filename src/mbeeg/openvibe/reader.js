"use strict";

/**
 * @class OVStreamReader describes Transform stream object, that converts openViBE stream (http://openvibe.inria.fr/stream-structures/)
 * into simple eeg samples stream {timestamp, ch0, ch1, ch2, ..., chN} and provides methods that returns properties of
 * openViBE stream, such as samplingRate, data matrix and description of its dimensions, sizes, column/row names etc.
 */
class OVStreamReader extends require('stream').Transform {
  constructor({
                ovStream,
                objectMode = true
              }) {
    super({objectMode: true});
    this.objectMode = objectMode;
    this.header = {
      timestamp: 0,
      samplingRate: 0,
      signal: {matrix: {dimensions: [[]]}},
      channelUnits: {matrix: {dimensions: [[]]}},
    };
    this.buffer = {
      length: 0,
      valueSize: 8,
      data: Buffer.alloc(0)
    };
    ovStream.on(`data`, chunk => {
        this.header.timestamp = this._getChildProperties(chunk, `timestamp`).value;
        this.header.samplingRate = this._getChildProperties(chunk, `OVTK_NodeId_Header_Signal_SamplingRate`).value;
        if (!this.header.samplingRate) throw `OpenViBE stream error: Signal sampling rate undefined`;
        // let ovStreamHeader = this._getChildObject(chunk, `OVTK_NodeId_Header`);
        let signal = this._getChildObject(chunk, `OVTK_NodeId_Acquisition_Header_Signal`);//get ovStream element with signal header description (dimensions, labels, dim.sizes)
        if (!signal) throw `OpenViBE stream error: Signal header undefined`;
        this._setupMatrix(this.header.signal, signal);//parse signal header description element and save descriptive info into this.header.signal
        let channelUnits = this._getChildObject(chunk, `OVTK_NodeId_Acquisition_Header_ChannelUnits`);//get ovStream element with channel units description
        this._setupMatrix(this.header.channelUnits, channelUnits);//parse channel units descr.element and save info into this.header.channelUnits
        
        let ovStreamBuffer = this._getChildObject(chunk, `OVTK_NodeId_Buffer`);
        let bufferProperties = this._getChildProperties(ovStreamBuffer, `OVTK_NodeId_Buffer_StreamedMatrix_RawBuffer`);
        if (bufferProperties) {
          this.buffer.valueSize = parseInt(bufferProperties.type.replace(/^\D+/g, ''));//regexp - to delete leading non digit signs, it allows to parseInt (convert string, for instance "binary(float64)", into number (64))
          if (!this.buffer.valueSize) this.buffer.valueSize = 8;
          this.buffer.length = bufferProperties.size;
          this.buffer.data = Buffer.from(bufferProperties.buffer);
          
          this.cursor = 0;
          let rows = this.header.signal.matrix.dimensions[1].length;
          this.header.timestamp = this.header.timestamp - rows * 1000 / this.header.samplingRate; //by default epoch timestamp equals to last sample timestamp, so let's move timestamp to the first one
          for (let row = 0; row < rows; row++) {
            let sampleVector = [];
            sampleVector.push(Math.round(this.header.timestamp += 1000 / this.header.samplingRate));
            for (let column = 0, columns = this.header.signal.matrix.dimensions[0].length; column < columns; column++) {
              switch (this.buffer.valueSize) {
                case 64:
                  sampleVector.push(this.buffer.data.readDoubleLE(this.cursor));
                  break;
                case 32:
                  sampleVector.push(this.buffer.data.readFloatLE(this.cursor));
                  break;
                default:
                  sampleVector.push(this.buffer.data.readUInt8(this.cursor));
              }
              this.cursor += this.buffer.valueSize / 8;
            }
            this.write(sampleVector);
          }
        }
      }
    )
  }
  
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