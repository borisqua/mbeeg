"use strict";
const
  {ipcRenderer} = require('electron')
  , {Tools} = require('mbeeg')
  , {TweenMax, TimelineMax} = require('gsap')
  , Content = require('../content')
;

class Keyboard extends Content {
  constructor({
                keyboard,
                colorScheme,
                parametersOfStimulation,
                stimuli
              }) {
    super({colorScheme});
    
    this.keyboard = Tools.copyObject(keyboard);
    this.stimulation = Tools.copyObject(parametersOfStimulation);
    this.colorScheme = colorScheme;
    
    this.stimuli = stimuli;
    
    //DOM elements
    this.viewport = $("#keyboard");
    this.output = $('.line');
    this.window = $(window);
    this.monitor = $(`#monitor`);
    this.body = $(document.body);
    
    this._windowCaption = 90;
    //debug
    // this.prevStimTStamp = 0;
    
    // ----- EVENT HANDLERS -----
    
    this.timeout = {};
    this.window
      .on('resize', () => {
        clearTimeout(this.timeout);
        let
          viewportWidth = this.window.outerWidth(true)
            - 2 * (+this.output.css("margin").match(/\d+/)[0] + +this.output.css("border-width").match(/\d+/)[0])
          ,
          viewportHeight = this.window.outerHeight(true) - +this.viewport.css("margin-top").match(/\d+/)[0]
            - this.monitor.outerHeight(true) - this._windowCaption
        ;
        //todo>> refactor window resizing
        console.log(`width delta ${this.viewportWidth - viewportWidth}; height delta ${this.viewportHeight - viewportHeight}`);
        this.keyboard.viewport.width = viewportWidth;
        this.keyboard.viewport.height = viewportHeight;
        
        this.timeout = setTimeout(() => {//unbounced actions
          // ipcRenderer.send(`ipcKeyboard-change`, `change`);//stimuli reset => epochs reset => epoch series reset => save keyboard configuration changes
          //todo>> this.emit('change', this.keyboard);
          this.init(this.keyboard)._redraw();
          // Content.reloadSchema(this.appearance);
        }, 200)
      });
    
    //show stimulus animation on stimuli data received event
    this.stimuli.on('data', stimulus => this._stimulate(stimulus));
    
    //ipc messaging
    ipcRenderer.on('ipcApp-decision', (e, decision) => {
      this._putSymbol(decision);
    });
    
    // ----- START KEYBOARD -----
    this
      .init(this.keyboard)
      ._redraw()
      ._resetStimuli()
      ._fitWindowSizeToViewport();
  }
  
  // ----- PRIVATE METHODS -----
  
  /**
   * switch on if specified all kinds of stimulation (e.g. keybox-${colorScheme}-color, ..-size, ..-shine, ..-shake, etc.)
   * @param keybox - keybox element for which the stimulus visualisation will be switched on
   * @private
   */
  _stimulusOn(keybox) {
    if (this.keyboard.stimulation.color) {
      keybox.addClass(`keybox-${this.colorScheme}-color`);
    }
    if (this.keyboard.stimulation.size) {
      keybox.addClass(`keybox-${this.colorScheme}-size`);
    }
    if (this.keyboard.stimulation.shine) {
      keybox.addClass(`keybox-${this.colorScheme}-shine`);
    }
    
    if (this.keyboard.stimulation.animation.selected !== "none") {
      keybox.addClass(`keybox-${this.colorScheme}-${this.keyboard.stimulation.animation.selected}`);
    }
  };
  
  /**
   * switch off all kinds of stimulation (e.g. keybox-${colorScheme}-color, ..-size, ..-shine, ..-shake, etc.)
   * @param keybox - keybox element for which the stimulus visualisation will be switched off
   * @private
   */
  _stimulusOff(keybox) {
    let regexp = new RegExp(`\\bkeybox-${this.colorScheme}-\\S+`, 'g');
    keybox.removeClass(function (index, className) {
      return (className.match(regexp) || []).join(' ');
    });
  };
  
  /**
   * to change styles of stimulus keybox to make oddball
   * @param stimulus - reference to stimulus vector - [timestamp, key, target_flag, cycle_counter]
   * @private
   */
  _stimulate(stimulus) {
    if (!stimulus[0])//no timestamp (timestamp value === 0)
      return;
    let key = $(`.key[index="${stimulus[1]}"]`);
    ipcRenderer.send(`ipcKeyboard-stimulus`, stimulus);
    this._stimulusOn(key);
    setTimeout(() => { this._stimulusOff(key); }, this.stimulation.duration);
    
    // console.log(`stimulus ${stimulus}; delta ${stimulus[0] - this.prevStimTStamp}`);//for debug
    // this.prevStimTStamp = stimulus[0];//for debug
  };
  
  /**
   * switch off stimulation and darken keys while pause after next decision
   * @private
   */
  _unboundStimuli() {
    let keys = $('.key');
    this.stimuli.removeAllListeners();
    this.stimuli.unbound();
    keys.addClass(`faded-${this.colorScheme}-keys`);
    setTimeout(() => {
      this.stimuli.bound();
      keys.removeClass(`faded-${this.colorScheme}-keys`);
      this.stimuli.on('data', stimulus => this._stimulate(stimulus));
    }, this.pauseAfterDecision);
  };
  
  /**
   * put into input field an asterisk (*) if no selection recognized, or put recognized selection symbol
   * highlight selected and darken non-selected keys during this.pauseAfterDecision
   * @param keyIndex
   * @private
   */
  _putSymbol(keyIndex) {
    let
      inputField = document.getElementById("inputField"),
      key = $(`.key[index="${keyIndex}"]`)
    ;
    if (keyIndex === -1) {
      inputField.value = inputField.value + '*';
    } else {
      inputField.value = inputField.value + this.keyboard.keys[keyIndex].symbol;
    }
    this._unboundStimuli();
    key.addClass(`selected-${this.colorScheme}-key`);
    setTimeout(() => {
      key.removeClass(`selected-${this.colorScheme}-key`);
    }, this.pauseAfterDecision);
    inputField.focus();
    inputField.scrollTop = inputField.scrollHeight;
  };
  
  /**
   * place new tweenbox to the initial position in viewport and returns reference to tween associated with tweenbox
   * @param keyIndex - key index in Keys array
   * @return {TweenMax}
   * @private
   */
  _getKeybox(keyIndex) {//create div & tween for it (keyIndex - key index in Keys array)
    let keybox = $(`<div class="key" index="${keyIndex}">${this.keyboard.keys[keyIndex].symbol}</div>`);
    keybox.css({
      width: this.keyboard.keybox.width//todo>> keybox size change to relative values `15vmin`
      , height: this.keyboard.keybox.height //`15vmin`
      // , margin: this.keyboard.keybox.margin
      , border: this.keyboard.keybox.showBorder ? `${this.keyboard.keybox.borderWidth}px solid #525252` : 'none'
      // fontSize: Math.min(this.keyboard.keybox.width, this.keyboard.keybox.height)
    });
    
    this.viewport.append(keybox);
    
    TweenMax.set(keybox, {
      left: this.startKeyboxPosition,
      top: this.keyboard.keys[keyIndex].row * this.verticalKeyboxDelta + 0.5 * (this.verticalKeyboxDelta - this.keyboard.keybox.height)
    });
    
    Draggable.create(keybox, {
      type: "x,y",
      onPress: () => {
        for (let i = 0; i < this.keyboard.schools.length; i++) {
          this.timelines[i].kill();
        }
      }
    });
    
    // noinspection JSValidateTypes
    return new TweenMax(keybox
      , this.keyboard.motion.tweenDuration
      , {
        left: this.endKeyboxPosition,
        ease: SlowMo.ease.config(0.9, 0.2, false),
        // ease: "linear",
        repeat: -1
      });
  };
  
  /**
   * build timeline for specific school of keys
   * @param schoolIndex - index in array of groups of elements with same movement rules
   * @return TimelineMax object
   * @private
   */
  _buildTimeline(schoolIndex) {
    let timeline = new TimelineMax();
    for (let i = 0; i < this.keyboard.keys.length; i++) {
      if (this.keyboard.keys[i].school === schoolIndex) {
        let
          column = this.keyboard.keys[i].column
          , row = this.keyboard.keys[i].row
          ,
          index = row * this.keyboard.viewport.columns + this.keyboard.viewport.columns - column - 1 //last column in each row moves first
        ;
        timeline.add(this._getKeybox(index), column * this.horizontalKeyboxPeriod);
      }
    }
    timeline.addLabel(`initialPosition${schoolIndex}`, this.initialTimePosition);
    return timeline;
  };
  
  /**
   *
   * @param colorScheme
   * @private
   */
  _reloadScheme(colorScheme) {
    this.colorScheme = colorScheme;
    let keyboxes = $(".key");
    keyboxes.removeClass(function (index, className) {
      return (className.match(/\bkeybox-\S+/g) || []).join(' ');
    });
    keyboxes.addClass(`keybox-${colorScheme}`);
  };
  
  /**
   * redraw viewport and refill timelines with current content size & config settings
   * without resizing content
   * @return {Keyboard} - returns 'this' to support method chaining
   * @private
   */
  _redraw() {
    //redraw & refresh content of viewport and output field
    this.viewport
      .html("")
      .css({
        minWidth: this.minViewportWidth,
        minHeight: this.minViewportHeight,
        width: this.viewportWidth,
        height: this.viewportHeight,
        left: 0,
        top: 0
      });
    this.output.css({
      minWidth: this.minViewportWidth,
      width: this.viewportWidth,
    });
    //refill timelines
    this.timelines = [];
    for (let i = 0; i < this.keyboard.schools.length; i++) {
      this.timelines.push(this._buildTimeline(i));
      this.timelines[i]
        .timeScale(this.keyboard.schools[i].motion.speedScale)
        .seek(`initialPosition${i}`)
      ;
    }
    this._reloadScheme(this.colorScheme);
    return this;
  };
  
  /**
   * resize keyboard content to fit with viewport size
   * @return {Keyboard} - returns 'this' to support method chaining
   * @private
   */
  _fitWindowSizeToViewport() {
    window.resizeTo(
      this.viewportWidth + 2 * (+this.output.css("margin").match(/\d+/)[0] + +this.output.css("border-width").match(/\d+/)[0]),
      this.viewportHeight + +this.viewport.css("margin-top").match(/\d+/)[0] + this.monitor.outerHeight(true) + this._windowCaption
    );
    return this;
  };
  
  /**
   * reset stimuli with settings from application config.json
   * @return {Keyboard} - returns 'this' to support method chaining
   * @private
   */
  _resetStimuli() {
    this.stimuli.reset({
      stimuliIdArray: this.stimulation.sequence.stimuli,
      duration: this.stimulation.duration,
      pause: this.stimulation.pause
    });
    return this;
  };
  
  //GETTERS & SETTERS
  
  /**
   * input string setter
   * @param {*} value - value to store to input field
   */
  set text(value) { this.output.val(value); }
  
  // noinspection JSUnusedGlobalSymbols
  /**
   * input string getter
   * @return {*} - returns value from input field
   */
  get text() { return this.output.val(); }
  
  /**
   * keyboard configuration setter
   * @param keyboardObject
   */
  set keyboardConfiguration(keyboardObject) { this.keyboard = Tools.copyObject(keyboardObject); }
  
  /**
   * @return {*} - returns current keyboard configuration
   */
  get keyboardConfiguration() { return this.keyboard; }
  
  /**
   * stimuli configuration setter
   * @param stimuliConfigObject - object with stimuli settings
   */
  set stimuliConfiguration(stimuliConfigObject) {
    this.stimulation = Tools.copyObject(stimuliConfigObject);
    this._resetStimuli();
  }
  
  //PUBLIC METHODS
  
  /**
   * reload color scheme properties
   * @param colorScheme - name of scheme
   */
  reloadScheme(colorScheme) {
    super.reloadScheme(colorScheme);
    this._reloadScheme(colorScheme);
  }
  
  /**
   * calculate keyboard properties that depends on config properties
   * @param keyboard - reference to object literal with all the data relevant to configuration of application
   * @return {Keyboard} - returns 'this' to support method chaining
   */
  init(keyboard) {
    
    // geometry and positions calculation
    this.minHorizontalKeyboxDelta = keyboard.keybox.width + 2 * keyboard.keybox.margin +
      (keyboard.keybox.showBorder ? keyboard.keybox.borderWidth * 2 : 0);
    this.horizontalKeyboxDelta = keyboard.viewport.width / keyboard.viewport.columns;
    this.horizontalKeyboxDelta = this.horizontalKeyboxDelta < this.minHorizontalKeyboxDelta ?
      this.minHorizontalKeyboxDelta : this.horizontalKeyboxDelta;
    
    this.minVerticalKeyboxDelta = keyboard.keybox.height + 2 * keyboard.keybox.margin
      + (keyboard.keybox.showBorder ? keyboard.keybox.borderWidth * 2 : 0);
    this.verticalKeyboxDelta = keyboard.viewport.height / keyboard.viewport.rows;
    this.verticalKeyboxDelta = this.verticalKeyboxDelta < this.minVerticalKeyboxDelta ?
      this.minVerticalKeyboxDelta : this.verticalKeyboxDelta;
    
    this.minViewportWidth = this.horizontalKeyboxDelta * keyboard.viewport.columns;
    this.viewportWidth = keyboard.viewport.width;
    this.viewportWidth = this.viewportWidth < this.minViewportWidth ? this.minViewportWidth : this.viewportWidth;
    
    this.minViewportHeight = this.verticalKeyboxDelta * keyboard.viewport.rows;
    this.viewportHeight = keyboard.viewport.height;
    this.viewportHeight = this.viewportHeight < this.minViewportHeight ? this.minViewportHeight : this.viewportHeight;
    
    this.startKeyboxPosition = keyboard.motion.shift * this.horizontalKeyboxDelta;
    this.endKeyboxPosition = this.viewportWidth + keyboard.motion.shift * this.horizontalKeyboxDelta;
    
    this.horizontalKeyboxPeriod = keyboard.motion.tweenDuration / keyboard.viewport.columns;
    let
      velocity = (this.endKeyboxPosition - this.startKeyboxPosition) / keyboard.motion.tweenDuration,
      gap = (this.horizontalKeyboxPeriod * velocity - keyboard.keybox.width) / velocity,
      shift = this.horizontalKeyboxPeriod * keyboard.motion.shift
    ;
    
    this.initialTimePosition = this.horizontalKeyboxPeriod *
      (keyboard.viewport.columns - 1) + 0.5 * gap - shift;
    
    this.pauseAfterDecision = this.stimulation.pauseAfterDecision;
    
    return this;
  };
  
  /**
   * init and run keyboard
   * @param keyboard - reference to object literal with all relevant to application data
   * @return {Keyboard} - returns 'this' to support method chaining
   */
  run(keyboard) {
    this
      .init(keyboard)
      ._redraw()
      ._resetStimuli()
      ._fitWindowSizeToViewport();
    return this;
  }
  
  /**
   * reset keyboard properties to fit keys to the viewport and redraw keyboard content to fit viewport size
   * @param keyboard - reference to object literal with all relevant to application data
   * @return {Keyboard} - returns 'this' to support method chaining
   */
  autofit(keyboard) {
    // reset tween parameters (t=S/V)
    this.keyboard.viewport.width = ((keyboard.keybox.showBorder ? keyboard.keybox.borderWidth * 2 : 0)
      + keyboard.keybox.width + keyboard.keybox.margin * 2) * keyboard.viewport.columns;
    
    this.keyboard.viewport.height = ((keyboard.keybox.showBorder ? keyboard.keybox.borderWidth * 2 : 0)
      + keyboard.keybox.height + keyboard.keybox.margin * 2) * keyboard.viewport.rows;
    
    this
      .init(this.keyboard)
      ._redraw()
      ._fitWindowSizeToViewport()
    ;
    
    ipcRenderer.send(`ipcKeyboard-change`, `change`);//stimuli reset => epochs reset => epoch series reset => save keyboard configuration changes
    
    return this;
    
  }
  
  /**
   * drops all symbols into start position and sets timeScale into zero (no movements) if stop == true
   * @param schools - array of groups of elements with the same movement rules
   * @return {Keyboard} - returns 'this' to support method chaining
   */
  initialState(schools) {
    for (let i = 0; i < schools.length; i++) {
      this.timelines[i]
        .seek(`initialPosition${i}`)
        .timeScale(0);
    }
    return this;
  }
  
  /**
   * to change motion properties of keyboard on the fly
   * @param schools - array of groups of elements with the same movement rules
   * @return {Keyboard} - returns 'this' to support method chaining
   */
  motionChange(schools) {
    for (let i = 0; i < schools.length; i++) {
      this.timelines[i].timeScale(schools[i].motion.speedScale); //speedScale - scale factor of speed value (defined by keyboard.motion.tweenDuration)
      // if (keyboard.schools[i].motion.reverse && !this.timelines[i].reversed)
      //   this.timeLines[i].reverse();
      // else
      //   this.timeLines[i].play();
    }
    return this;
  }
  
  keyboxBorder(showBorder) {
    let keyboxes = $(".key");
    this.keyboard.keybox.showBorder = showBorder;
    if (showBorder)
      keyboxes.addClass("keybox-bordered");
    else
      keyboxes.removeClass("keybox-bordered");
  }
  
}

module.exports = Keyboard;
