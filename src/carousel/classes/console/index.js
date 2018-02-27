"use strict";
const
  {ipcRenderer} = require('electron')
  , {Tools} = require('mbeeg')
  , Content = require('../content')
;

class Console extends Content {
  constructor({
                consoleProperties,
                keyboardProperties,
                mbeegProperties,
                colorScheme
              }) {
    super({colorScheme});
  
    this.console = Object.assign({}, consoleProperties);//todo>> change the "Tools.copyObject(" to "Object.assign({}, " in whole project"
    this.keyboard = Object.assign({}, keyboardProperties);
    this.mbeeg = Object.assign({}, mbeegProperties);
    this.colorScheme = colorScheme;
    
    this.alphabetField = $('input#alphabet');
    this.motionGroup = $('#motion');
    
    this._updateAlphabet(this.keyboard.alphabet);
    this.updateMotionControlGroup();
    
  }
  
  // ----- PRIVATE METHODS -----
  
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
    this.keyboard.alphabet = alphabet;
    this.alphabetField.val(alphabet.substr(0, this.maxLength));
    this.alphabetField.attr('maxlength', this.maxLength);
  };
  
  /**
   * remake keyboard elements arrays
   * @private
   */
  _makeArrays() {
    
    this.keyboard.keys.length = 0;
    this.keyboard.schools.length = 0;
    this.mbeeg.stimulation.sequence.stimuli.length = 0;
    for (let j = 0; j < this.keyboard.viewport.rows; j++) {//rows
      this.keyboard.schools.push({
        id: j,
        motion: {
          easing: "slow motion",
          speedScale: !!this.keyboard.schools[j] ? this.keyboard.schools[j].speedScale : 0,
          reverse: false,
          randomSpeed: false
        }
      });
      for (let columns = this.keyboard.viewport.columns, i = 0; i < columns; i++) {//columns
        let id = j * columns + i;
        this.keyboard.keys.push({
          column: i, //columns - i - 1, //i - for back alphabet order (right to left); columns-i-1 - for straight alphabet order (left to right)
          left: this.keyboard.motion.shift * this.keyboard.keybox.width, //i * this.keyboard.keybox.width,
          row: j,
          school: j,
          stimulus: id, //
          symbol: this.keyboard.alphabet[id] ? this.keyboard.alphabet[id] : '',
          top: j * this.keyboard.keybox.height
        });
        if (!!this.keyboard.alphabet[id]) {
          this.mbeeg.stimulation.sequence.stimuli.push(id);
        }
      }
    }
  };
  
  //GETTERS & SETTERS
  
  /**
   * @return {*} - returns current keyboard configuration
   */
  get keyboardConfiguration() { return this.keyboard; }
  
  /**
   * @return {*} - returns current mbeeg configuration
   */
  get mbeegConfiguration() { return this.mbeeg; }
  
  //PUBLIC METHODS
  
  /**
   * reload color scheme
   * @param colorScheme - object literal with color scheme parameters
   */
  reloadScheme(colorScheme = this.colorScheme) {
    this.colorScheme = colorScheme;
    super.reloadScheme(colorScheme)
  }
  
  /**
   * update keyboard arrays with new alphabet string
   * @param alphabet
   */
  updateArrays(alphabet){
    this.keyboard.alphabet = alphabet;
    this._makeArrays();
  
    this.emit('keyboardChange', this.keyboard);
    this.emit('mbeegChange', this.mbeeg);
  }
  
  /**
   * assign new value to the viewport property
   * @param property - name of viewport property to update
   * @param value - value to assign to the property
   */
  updateKeyboardViewportProperties(property, value) {
    
    this.keyboard.viewport[property] = +value;
    this._updateAlphabet();
    this._makeArrays();
  
    this.emit('keyboardChange', this.keyboard);
    this.emit('mbeegChange', this.mbeeg);
  };
  
  /**
   * update & redraw motion control group
   */
  updateMotionControlGroup() {
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts = [];
    this.motionGroup.html(`
            <legend>motion parameters</legend>
            <div class="horizontal-flex">
                <div class="scale"><label>speed scale</label></div>
                <div class="motion"><label>random</label></div>
                <div class="motion"><label>reverse</label></div>
                <div class="easing"><label>easing</label></div>
                <div class="bezier"><label>bezier</label></div>
            </div>
            <div class="horizontal-flex"><label>joint movement of speed controls</label><input id="speed-scales-locker" type="checkbox"></div>
        `);
    this.addEventHandling('motionChange', 'change', $('#speed-scales-locker'), 'checked', this.console.speedScalesIsLocked,
      v => this.console.speedScalesIsLocked = v);
    
    for (let i = 0; i < this.keyboard.schools.length; i++) {
      this.timeouts.push({});
      this.motionGroup.append(this._getMotionControlGroup(i));
      this.addEventHandling('motionChange', 'input', $(`.speed${i}`), 'value',
        +this.keyboard.schools[i].motion.speedScale,
        v => {
          clearTimeout(this.timeouts[i]);
          this.keyboard.schools[i].motion.speedScale = +v;
          this.timeouts[i]=setTimeout(()=>{
            this.emit('keyboardChange', this.keyboard);
          }, 200)
        });
    }
    window.resizeTo(900, 730 + this.keyboard.viewport.rows * 32);//todo>> change to resizeBy
    // this.emit('keyboardChange', this.keyboard);
    // this.emit('consoleChange', this.console);
  };
  
  /**
   * public function, initializes and adds listener to each element of given jQuery collection
   * @param {String} ipcCommand - command that should be broadcast through entire app when local event occurred
   * @param {String} event - local event we are listen to
   * @param {jQuery} jQuery - jQuery collection by selector to work with
   * @param {String} property - property of html element to set and store in config file
   * @param {*} value - value from configuration file to initialize settings console form fields
   * @param {function} callback - callback function to store changes into configuration data file
   */
  addEventHandling(ipcCommand, event, jQuery, property="", value="", callback=()=>{}) {
    jQuery.unbind();
    if (!!property) {//if property exists then it is some kind of value field else it is some action button
      jQuery.each((i, element) => element[property] = value);
    }
    jQuery
      .on(event, e => {
        if (!!property) {//data element (e.g. field)
          let v = e.target[property];
          jQuery.each((i, element) => element[property] = v);
          callback(v);
        } else { //action element (e.g. button)
          e.preventDefault();
          callback();
        }
        
        if (!!ipcCommand)
          ipcRenderer.send(`ipcConsole-command`, ipcCommand);
      });
  };
  
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
