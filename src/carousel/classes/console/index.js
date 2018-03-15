"use strict";
const
  {ipcRenderer} = require('electron')
  , {Tools} = require('mbeeg')
  , Window = require('../window')
;

class Console extends Window {
  constructor({
                consoleProperties,
                keyboardProperties,
                mbeegProperties,
                colorScheme
              }) {
    super({colorScheme});
    
    this.console = Tools.copyObject(consoleProperties);
    this.keyboard = Tools.copyObject(keyboardProperties);
    this.mbeeg = Tools.copyObject(mbeegProperties);
    this.colorScheme = Tools.copyObject(colorScheme);
    
    this.alphabetField = $('input#alphabet');
    this.motionGroup = $('#motion').find('> #sliders');
    
    this
      ._fillList($("select#color-scheme"), 'option', colorScheme.available)
      ._updateAlphabet(this.keyboard.alphabet)
      ._updateMotionControlGroup(this.keyboard)
    ;
  }
  
  // ----- PRIVATE METHODS -----
  
  // noinspection JSMethodCanBeStatic
  /**
   * fill element content with list of elements with tagName tags and items from source object literal
   * @param elements - jquery with containers of list
   * @param tagName - name of tags containing items of list
   * @param source - object literal with names that will become items of list
   * @private
   */
  _fillList(elements, tagName, source) {
    for (let item in source) {
      if (source.hasOwnProperty(item))
        elements.append(`<${tagName} value="${item}">${item}</${tagName}>`);
    }
    return this;
  }
  
  /**
   * reset and return an element with group of controls responsible for motion
   * @param index
   * @return {*|jQuery|HTMLElement}
   * @private
   */
  _getMotionControlGroup(index) {
    return $(`
          <div class="inputbox">
						<label class = "centered"> school ${index} </label>
						<input class="speed${index} centered slider" type="range" min="0" max="5" step="0.1" value="${this.keyboard.schools[index].motion.speedScale}" id="speedSlider${index}" index="${index}">
						<input id="speedValue${index}" class="speed${index} value" value="${this.keyboard.schools[index].motion.speedScale}" index="${index}"/>
						<label for="randomSpeed${index}"> &nbsp;</label>
						<input class="rnd" type="checkbox" id="randomSpeed${index}" index="${index}"/>
						<label for="reverseMovement${index}"> &nbsp;</label>
						<input class="reverse" type="checkbox" id="reverseMovement${index}" index="${index}"/>
						<label for="easing${index}"> &nbsp;</label>
            <select id="easing${index}">
            	<option>linear</option>
            	<option>swing</option>
            	<option>rough</option>
            	<option selected="true">slow motion</option>
            	<option>stepped</option>
            </select>
						<label for="bezier${index}"> &nbsp;</label>
            <button id="bezier${index}">add bezier path</button>
          </div>
        `);
  };
  
  /**
   * Update alphabet related fields and values
   * @param alphabet
   * @private
   */
  _updateAlphabet(alphabet = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФXЦЧШЩЪЫЬЭЮЯ") {
    this.maxLength = this.keyboard.viewport.columns * this.keyboard.viewport.rows;
    this.alphabetField.prev().html(`alphabet, max ${this.maxLength} symbols`);
    // if (alphabet.length < this.maxLength) {
    //   alphabet = alphabet + new Array(this.maxLength - alphabet.length).fill("_").join("");
    // } else {
    alphabet = alphabet.substr(0, this.maxLength);
    // }
    this.keyboard.alphabet = alphabet;
    this.alphabetField.val(alphabet);
    this.alphabetField.attr('maxlength', this.maxLength);
    return this;
  };
  
  /**
   * remake keyboard elements arrays
   * @private
   */
  _makeArrays() {
    //todo>> update arrays preserving old settings (such as schools speedScales etc.)
    this.keyboard.keys = [];//todo>> preserve old values to load them (full or partly) in recreated array
    this.keyboard.schools = [];//todo>> preserve old values to load them (full or partly) in recreated array
    // noinspection JSPrimitiveTypeWrapperUsage
    this.mbeeg.stimulation.sequence.stimuli = [];//todo>> preserve old values to load them (full or partly) in recreated array
    
    for (let row = 0; row < this.keyboard.viewport.rows; row++) {//rows
      this.keyboard.schools.push({
        id: row,
        motion: {
          easing: "slow motion",
          speedScale: !!this.keyboard.schools[row] ? this.keyboard.schools[row].speedScale : 0,
          reverse: false,
          randomSpeed: false
        }
      });
      $(`.speed${row}`).each((j, element) => element['value'] = 0);
      for (let columns = this.keyboard.viewport.columns, i = 0; i < columns; i++) {//columns
        let id = row * columns + i;
        this.keyboard.keys.push({
          column: i, //columns - i - 1, //i - for back alphabet order (right to left); columns-i-1 - for straight alphabet order (left to right)
          row: row,
          school: row,
          stimulus: id, //
          symbol: this.keyboard.alphabet[id] ? this.keyboard.alphabet[id] : ''
          // left: this.keyboard.animation.leftShift * this.keyboard.keybox.width, //i * this.keyboard.keybox.width,
          // top: row * this.keyboard.keybox.height
        });
        if (!!this.keyboard.alphabet[id]) {
          this.mbeeg.stimulation.sequence.stimuli.push(id);
        }
      }
    }
    return this;
  };
  
  /**
   * update & redraw motion control group
   */
  _updateMotionControlGroup() {
    this.addEventHandling('motionChange', 'change', $('#speed-scales-locker'), 'checked', this.console.speedScalesIsLocked,
      v => this.console.speedScalesIsLocked = v);
    
    this.motionGroup.html("");
    for (let i = 0; i < this.keyboard.schools.length; i++) {
      this.motionGroup.append(this._getMotionControlGroup(i));
      this.addEventHandling('motionChange', 'input', $(`.speed${i}`), 'value',
        +this.keyboard.schools[i].motion.speedScale,
        v => {
          v = +v.replace(',', '.');//to enter from "numPad" will be possible
          this.keyboard.schools[i].motion.speedScale = v;
          this.emit('keyboardChange', this.keyboard);
        });
      this.addEventHandling('directionChange', 'change', $(`#reverseMovement${i}`), 'checked', this.keyboard.schools[i].motion.reverse,
        v => {
          this.keyboard.schools[i].motion.reverse = v;
          this.emit('keyboardChange', this.keyboard);
        });
      this.addEventHandling('randomSpeedChange', 'change', $(`#randomSpeed${i}`), 'checked', this.keyboard.schools[i].motion.randomSpeed,
        v => {
          this.keyboard.schools[i].motion.randomSpeed = v;
          this.emit('keyboardChange', this.keyboard);
        });
    }
    window.resizeTo(900, 850 + this.keyboard.viewport.rows * 32);//todo>> remove hard coding and maybe change to resizeBy
  };
  
  //PUBLIC METHODS
  
  /**
   * public function, initializes and adds listener to each element of given jQuery collection
   * @param {String} ipcCommand - command that should be broadcast through entire app when local event occurred
   * @param {String} event - local event we are listen to
   * @param {jQuery} jQuery - jQuery collection by selector to work with
   * @param {String} property - property of html element to set and store in config file
   * @param {*} value - value from configuration file to initialize settings console form fields
   * @param {function} callback - callback function to store changes into configuration data file
   */
  addEventHandling(ipcCommand, event, jQuery, property = "", value = "", callback = () => {}) {
    jQuery.unbind();
    if (!!property) {//if property exists then it is value field else it is action button
      jQuery.each((i, element) => element[property] = value);
    }
    if (!!property) {//data element (e.g. field)
      jQuery
        .on(event, e => {
          let v = e.target[property];
          jQuery.each((i, element) => element[property] = v);
          callback(v);
          
          process.nextTick(() => { //(async) as quick as possible but after handling internal events emitted from console
            if (!!ipcCommand)
              ipcRenderer.send(`ipcConsole-command`, ipcCommand);
          });
          
        });
    } else { //action element (e.g. button)
      jQuery
        .on(event, e => {
          e.preventDefault();
          callback();
          
          process.nextTick(() => { //(async) as quick as possible but after handling internal events emitted from console
            if (!!ipcCommand)
              ipcRenderer.send(`ipcConsole-command`, ipcCommand);
          });
          
        });
    }
  };
  
  //GETTERS & SETTERS
  
  /**
   * reset only viewport shape & size, stimulation and movement properties of keys
   * @param keyboardProperties
   */
  set keyboardLayoutConfiguration(keyboardProperties){
    this.keyboard.stimulation = keyboardProperties.stimulation;
    this.keyboard.keybox = keyboardProperties.keybox;
    this.keyboard.window = keyboardProperties.window;
    this.keyboard.viewport.height = keyboardProperties.viewport.height;
    this.keyboard.viewport.width = keyboardProperties.viewport.width;
  }
  
  /**
   * Full reset of keyboard properties. Recalculation of core arrays and restart are required
   * @param keyboardProperties
   */
  set keyboardCoreConfiguration(keyboardProperties) {
    let
      schoolsNumberChanged = this.keyboard.schools.length
    ;
    this.keyboard = Tools.copyObject(keyboardProperties);
    
    this._updateAlphabet(this.keyboard.alphabet);
    this._makeArrays();
    
    this.emit('keyboardChange', this.keyboard);
    this.emit('stimuliChange', this.mbeeg);
    
    schoolsNumberChanged = schoolsNumberChanged - this.keyboard.schools.length;
    if (schoolsNumberChanged) {
      this._updateMotionControlGroup();
    }
  }
  
  set alphabet(alphabet) {
    this.keyboard.alphabet = alphabet;
    this._makeArrays();
    this.emit('keyboardChange', this.keyboard);
    this.emit('stimuliChange', this.mbeeg);
  }
  
  set colorSchemeConfiguration(colorScheme) {
    this.colorScheme = Tools.copyObject(colorScheme);
    super.reloadScheme(colorScheme)
  }
  
}

module.exports = Console;

//select easing functionality
/*for (let i = 0; i < this.keyboard.schools.length; i++){
  switch (this.keyboard.schools[i].motion.easing) {//todo>> inconsistency - ..motion.easing is not a string
    case "linear":
      this.keyboard.schools[i].motion.easing = "linear";
      break;
    case "swing":
      this.keyboard.schools[i].motion.easing = "swing";
      break;
    case "rough":
      this.keyboard.schools[i].motion.easing = RoughEase.ease.config({
        template: Power0.easeNone,
        strength: 1,
        points: 20,
        taper: "none",
        randomize: true,
        clamp: false
      });
      break;
    case "slow motion":
      this.keyboard.schools[i].motion.easing = SlowMo.ease.config(0.9, 0.2, false);
      break;
    case "stepped":
      this.keyboard.schools[i].motion.easing = SteppedEase.config(34);
  }

  this.lets = Object.assign(
    this.keyboard.schools[i].motion.bezier ? {//to
      bezier: {
        type: "sharp",
        values: [{x: 60, y: 80}, {x: 150, y: 30}, {x: 400 + Math.random() * 100, y: 320 * Math.random() + 50}, {
          x: 500,
          y: 320 * Math.random() + 50
        }, {x: 700, y: 100}, {x: 850, y: 500}],
        autoRotate: true
      }
    } : {},
    {
      left: this.horizontalPathLength
      , ease: this.keyboard.schools[i].motion.easing
      , repeat: -1
    });
}*/
