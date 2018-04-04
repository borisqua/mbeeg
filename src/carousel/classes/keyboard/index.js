"use strict";
const
  {ipcRenderer} = require('electron')
  , {TweenMax, TimelineMax} = require('gsap')
  , {Tools} = require('mbeeg')
  , Window = require('../window')
;

class Keyboard extends Window {
  constructor({
                keyboard,
                colorScheme,
                parametersOfStimulation,
                stimuli
              }) {
    // noinspection JSCheckFunctionSignatures
    super({colorScheme});
    
    this.keyboard = Tools.copyObject(keyboard);
    this.stimulation = Tools.copyObject(parametersOfStimulation);
    this.colorScheme = Tools.copyObject(colorScheme);
    
    this.stimuli = stimuli;
    
    // ----- DOM elements ----- //todo?? check if there isn't unused properties in this. context
    
    this.html = $('html');
    this.viewport = $("#keyboard");
    this.formMonitor = $('form#monitor');
    this.output = $('.line');
    this.window = $(window);
    this.monitor = $(`#monitor`);
    this.keyboxes = $('.keybox');
    this.windowVerticalFramesWidth = window.outerWidth - window.innerWidth;
    this.windowHorizontalFramesWidth = window.outerHeight - window.innerHeight;
    this.windowOuterWidth = window.outerWidth;
    this.styleSheets = document.styleSheets;
    
    // ----- EVENT HANDLERS -----
    
    this.window
      .on('resize', () => {
        Tools.runDebounced(
          () => {//unbounced actions
            let
              deltaWidth = window.outerWidth - this.windowOuterWidth
              , deltaHeight = window.outerHeight - this.windowOuterHeight
            ;
            this.viewportWidth = this.viewportWidth + deltaWidth;
            this.viewportHeight = this.viewportHeight + deltaHeight;
            
            if (this.viewportWidth < this.minViewportWidth) {
              deltaWidth = this.minViewportWidth - this.viewportWidth;
              this.viewportWidth = this.minViewportWidth;
            } else {
              deltaWidth = 0;
            }
            
            if (this.viewportHeight < this.minViewportHeight) {
              deltaHeight = this.minViewportHeight - this.viewportHeight;
              this.viewportHeight = this.minViewportHeight;
            } else {
              deltaHeight = 0;
            }
            
            this.windowOuterWidth = window.outerWidth + deltaWidth;
            this.windowOuterHeight = window.outerHeight + deltaHeight;
            
            this.keyboard.viewport.width = this.viewportWidth;
            this.keyboard.viewport.height = this.viewportHeight;
            this
              .init(this.keyboard)
              ._redrawContent()
            ;
            
            this.emit('keyboardLayoutChange', this.keyboard);
            
          }, 200);
        
      });
    
    //show stimulus animation on stimuli data received event
    if(this.keyboard.stimulation.autostart) {
      this.stimuli.on('data', stimulus => this._stimulate(stimulus));
    }
    
    //ipc messaging
    ipcRenderer.on('ipcApp-decision', (e, decision) => {
      this._putSymbol(decision);
    });
    
    // ----- START KEYBOARD -----
    this.run(this.keyboard);
  }
  
  // ----- PRIVATE METHODS -----
  
  // noinspection JSMethodCanBeStatic
  /**
   * switch on if specified all kinds of stimulation (e.g. keybox-${colorScheme}-color, ..-size, ..-shine, ..-shake, etc.)
   * @param keybox - keybox element collection for which the stimulus visualisation will be switched on
   * @private
   */
  _stimulusOn(keybox) {
    // noinspection JSUnresolvedVariable
    keybox.addClass(`stimulated
      ${this.colorScheme.available[this.colorScheme.selected].usePics ? (' stimulated-background' + +keybox.attr('index')) : ''}`);
    
    if (this.keyboard.stimulation.animation.selected !== "none") {
      keybox.addClass(this.keyboard.stimulation.animation.selected);
    }
  };
  
  /**
   * add norman-background{Index} for each keybox with index
   * @private
   */
  _addNormalBackgroundClassToKeyboxesWithPics() {
    for (let i = 0; i < this.keyboard.keys.length; i++) {
      $(`.keybox[index="${i}"]`).addClass(`normal-background${i}`)
    }
    return this;
  }
  
  /**
   * add faded-background{Index} for each keybox with index
   * @private
   */
  _addFadedBackgroundClassToKeyboxesWithPics() {
    for (let i = 0; i < this.keyboxes.length; i++) {
      this.keyboxes[i].className += ` faded-background${this.keyboxes[i].getAttribute('index')}`;
    }
  }
  
  /**
   * remove all classes but not keybox|bordered|normal|faded|selected
   * @private
   */
  _removeStimulusClasses() {
    let regexp = new RegExp('(?!(\\b(keybox|bordered|normal|faded|selected|background\\d*)(-background\\d*)?\\b))\\b(\\w+(-\\w*)|\\w+)\\b', 'g');
    this.keyboxes.removeClass(function (index, className) {
      return (className.match(regexp) || []).join(' ');
    });
  }
  
  /**
   * remove faded classes
   * @private
   */
  _removeFadedClasses() {
    let regexp = new RegExp('faded(-\\w+)*', 'g');
    this.keyboxes.removeClass(function (index, className) {
      return (className.match(regexp) || []).join(' ');
    });
  }
  
  /**
   * remove normal classes for keyboxes with and without pics
   * @private
   */
  _removeNormalClasses() {
    let regexp = new RegExp('normal(-\\w+)*', 'g');
    this.keyboxes.removeClass(function (index, className) {
      return (className.match(regexp) || []).join(' ');
    });
  }
  
  // noinspection JSMethodCanBeStatic
  /**
   * switch off all kinds of stimulation (e.g. keybox-${colorScheme}-color, ..-size, ..-shine, ..-shake, etc.)
   * @param keybox - keybox element for which the stimulus visualisation will be switched off
   * @private
   */
  _stimulusOff(keybox) {
    this._removeStimulusClasses(keybox);
  };
  
  /**
   * to change styles of stimulus keybox to make oddball
   * @param stimulus - reference to stimulus vector - [timestamp, key, target_flag, cycle_counter]
   * @private
   */
  _stimulate(stimulus) {
    if (!stimulus[0])//no timestamp (timestamp value === 0)
      return;
    let key = $(`.keybox[index="${stimulus[1]}"]`);
    ipcRenderer.send(`ipcKeyboard-stimulus`, stimulus);
    this._stimulusOn(key);
    setTimeout(() => { this._stimulusOff(key); }, this.stimulation.duration);
    
    // console.log(`stimulus ${stimulus}; delta ${stimulus[0] - this.prevStimTStamp}`);//for debug
    // this.prevStimTStamp = stimulus[0];//for debug
  };
  
  /**
   * unbind stimuli from the keyboard
   * @private
   */
  _unbindStimuli() {
    this.stimuli.removeAllListeners();
    this.stimuli.unbind();
    this._removeStimulusClasses(this.keyboxes);
    this.keyboxes.addClass('faded');
    this._removeNormalClasses();
    // noinspection JSUnresolvedVariable
    if (this.colorScheme.available[this.colorScheme.selected].usePics) {
      this._addFadedBackgroundClassToKeyboxesWithPics();
    }
  }
  
  /**
   * bind stimuli to the keyboard
   * @private
   */
  _bindStimuli() {
    this._removeFadedClasses(this.keyboxes);
    this.keyboxes.addClass(`normal`);
    // noinspection JSUnresolvedVariable
    if (this.colorScheme.available[this.colorScheme.selected].usePics) {
      this._addNormalBackgroundClassToKeyboxesWithPics();
    }
    this.stimuli.bind();
    this.stimuli.on('data', stimulus => this._stimulate(stimulus));
  }
  
  /**
   * switch off stimulation and darken keys while pause after next decision
   * @private
   */
  _pauseStimulation() {
    this._unbindStimuli();
    setTimeout(() => this._bindStimuli(), this.pauseAfterDecision);
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
      key = $(`.keybox[index="${keyIndex}"]`)
    ;
    if (keyIndex === -1) {
      inputField.value = inputField.value + '*';
    } else {
      inputField.value = inputField.value + this.keyboard.keys[keyIndex].symbol;
    }
    // noinspection JSUnresolvedVariable
    key.addClass(`selected ${this.colorScheme.available[this.colorScheme.selected].usePics ? 'selected-background' + keyIndex : ''}`);
    if(this.stimuli.isBound) {
      this._pauseStimulation();
    }
    setTimeout(() => key.removeClass(`selected selected-background${keyIndex}`), this.pauseAfterDecision);
    inputField.focus();
    inputField.scrollTop = inputField.scrollHeight;
  };
  
  // noinspection JSValidateJSDoc
  /**
   * place new tweenbox to the initial position in viewport and returns reference to tween associated with tweenbox
   * @param keyIndex - key index in Keys array
   * @return {Definition.TweenMax}
   * @private
   */
  _getKeybox(keyIndex) {//create div & tween for it (keyIndex - key index in Keys array)
    let
      keybox = $(`<div class="keybox" index="${keyIndex}">${this.keyboard.keys[keyIndex].symbol}</div>`)
      , defaultMode = this.keyboard.stimulation.autostart ? `normal` : `faded`
    ;
    // noinspection JSUnresolvedVariable
    keybox
      .css({
        width: this.keyboard.keybox.width,
        height: this.keyboard.keybox.height
      })
      .addClass(`${defaultMode} ${this.colorScheme.available[this.colorScheme.selected].usePics ? defaultMode + '-background' + keyIndex : ''}`)
    ;
    
    this.viewport.append(keybox);
    
    // noinspection JSUnresolvedVariable
    let
      startVars = {
        top: this.keyboard.keys[keyIndex].row * this.verticalKeyboxDelta
        + 0.5 * (this.verticalKeyboxDelta - this.keyboard.keybox.height)
        - this.keyboard.keybox.margin
        - (this.keyboard.keybox.showBorder ? this.keyboard.keybox.borderWidth : 0),
        left: this.keyboard.schools[this.keyboard.keys[keyIndex].school].motion.reverse ?
          this.rightmostKeyboxPosition : this.leftmostKeyboxPosition
      }
      , runVars = {
        left: this.keyboard.schools[this.keyboard.keys[keyIndex].school].motion.reverse ?
          this.leftmostKeyboxPosition : this.rightmostKeyboxPosition,
        ease: SlowMo.ease.config(0.9, 0.2, false),
        // ease: "linear",
        repeat: -1
      }
    ;
    
    // noinspection JSUnresolvedFunction
    TweenMax.set(keybox, startVars);
    
    // noinspection JSUnresolvedVariable
    Draggable.create(keybox, {
      type: "left,top",
      onPress: () => {
        for (let i = 0; i < this.keyboard.schools.length; i++) {
          this.timelines[i].kill();
        }
      }
    });
    
    return new TweenMax(keybox, this.keyboard.animation.tweenDuration, runVars);
  };
  
  /**
   * build timeline for specific school of keys
   * @param schoolIndex - index in array of groups of elements with same movement rules
   * @return Definition.TimelineMax object
   * @private
   */
  _buildTimeline(schoolIndex) {
    let timeline = new TimelineMax();
    for (let i = 0; i < this.keyboard.keys.length; i++) {
      if (this.keyboard.keys[i].school === schoolIndex) {
        let
          column = this.keyboard.keys[i].column
          , row = this.keyboard.keys[i].row
          , index = row * this.keyboard.viewport.columns
          + this.keyboard.viewport.columns - column - 1 //last column in each row moves first
        ;
        // noinspection JSUnresolvedFunction
        timeline.add(this._getKeybox(index), column * this.horizontalKeyboxPeriod);
      }
    }
    this.windowVerticalFramesWidth = window.outerWidth - window.innerWidth;
    this.keyboxes = $(".keybox");
    // noinspection JSUnresolvedFunction
    timeline.addLabel(`initialPosition${schoolIndex}`, this.initialTimePosition);
    return timeline;
  };
  
  /**
   * recreating styleSheet rules for stimulation the behaviour of the keyboxes
   * @private
   */
  _reloadSchemeStyles() {
    //todo>> when loading, this method is called twice. draw UML diagram for clarifying keyboard loading process
    // noinspection JSUnresolvedVariable
    let
      useFonts = this.colorScheme.available[this.colorScheme.selected].useFonts,
      usePics = this.colorScheme.available[this.colorScheme.selected].usePics
    ;
    for (let i = this.styleSheets[1].cssRules.length - 1; i > -1; i--) {
      this.styleSheets[1].deleteRule(i);
    }
    
    this.styleSheets[1].insertRule(`
    .stimulated {
      color: ${this.keyboard.stimulation.color ?
      this.colorScheme.available[this.colorScheme.selected]['stimulated']['color'] :
      this.colorScheme.available[this.colorScheme.selected]['normal']['color']} !important;
      font-size: ${useFonts * this.fontScaleFactor * (this.keyboard.stimulation.size ?
      this.colorScheme.available[this.colorScheme.selected]['stimulated']['size'] :
      this.colorScheme.available[this.colorScheme.selected]['normal']['size'])}px !important;
      font-weight: ${this.keyboard.stimulation.weight ?
      this.colorScheme.available[this.colorScheme.selected]['stimulated']['fontWeight'] :
      this.colorScheme.available[this.colorScheme.selected]['normal']['fontWeight']} !important;
      text-shadow: ${this.keyboard.stimulation.shine ?
      this.colorScheme.available[this.colorScheme.selected]['stimulated']['textShadow'] :
      this.colorScheme.available[this.colorScheme.selected]['normal']['textShadow']} !important;
    }`, 0);
    
    this.styleSheets[1].insertRule(`
    .selected {
      color: ${this.colorScheme.available[this.colorScheme.selected]['selected']['color']} !important;
      font-size: ${useFonts * this.fontScaleFactor * this.colorScheme.available[this.colorScheme.selected]['selected']['size']}px !important;
      font-weight: ${this.colorScheme.available[this.colorScheme.selected]['selected']['fontWeight']} !important;
      text-shadow: ${this.colorScheme.available[this.colorScheme.selected]['selected']['textShadow']} !important;
    }`, 1);
    
    this.styleSheets[1].insertRule(`
    .faded {
      color: ${this.colorScheme.available[this.colorScheme.selected]['faded']['color']};
      font-size: ${useFonts * this.fontScaleFactor * this.colorScheme.available[this.colorScheme.selected]['faded']['size']}px;
      font-weight: ${this.colorScheme.available[this.colorScheme.selected]['faded']['fontWeight']};
      text-shadow: ${this.colorScheme.available[this.colorScheme.selected]['faded']['textShadow']};
    }`, 2);
    
    this.styleSheets[1].insertRule(`
    .normal {
      color: ${this.colorScheme.available[this.colorScheme.selected]['normal']['color']};
      font-size: ${useFonts * this.fontScaleFactor * this.colorScheme.available[this.colorScheme.selected]['normal']['size']}px;
      font-weight: ${this.colorScheme.available[this.colorScheme.selected]['normal']['fontWeight']};
      text-shadow: ${this.colorScheme.available[this.colorScheme.selected]['normal']['textShadow']};
    }`, 3);
    
    if (usePics) {
      let
        maxKeysLength = this.keyboard.viewport.columns * this.keyboard.viewport.rows,
        normalPathFilePrefix = `${this.colorScheme.available[this.colorScheme.selected]['picsFolder']}/${this.colorScheme.available[this.colorScheme.selected]['normal']['pngFilePrefix']}`,
        stimulatedPathFilePrefix = `${this.colorScheme.available[this.colorScheme.selected]['picsFolder']}/${this.colorScheme.available[this.colorScheme.selected]['stimulated']['pngFilePrefix']}`,
        fadedPathFilePrefix = `${this.colorScheme.available[this.colorScheme.selected]['picsFolder']}/${this.colorScheme.available[this.colorScheme.selected]['faded']['pngFilePrefix']}`,
        selectedPathFilePrefix = `${this.colorScheme.available[this.colorScheme.selected]['picsFolder']}/${this.colorScheme.available[this.colorScheme.selected]['selected']['pngFilePrefix']}`
      ;
      for (let k = 0; k <= maxKeysLength; k++) {
        this.styleSheets[1].insertRule(`
      .normal-background${k} {
        background-image: url("../../${normalPathFilePrefix}${k}.png");
        background-size: cover;
        background-repeat: no-repeat;
      }`, 4 * (k + 1));//4 8 12
        this.styleSheets[1].insertRule(`
      .stimulated-background${k} {
        background-image: url("../../${stimulatedPathFilePrefix}${k}.png") !important;
        background-size: cover !important;
        background-repeat: no-repeat !important;
      }`, 4 * (k + 1) + 1);//5 9 13
        this.styleSheets[1].insertRule(`
      .faded-background${k} {
        background-image: url("../../${fadedPathFilePrefix}${k}.png") !important;
        background-size: cover !important;
        background-repeat: no-repeat !important;
      }`, 4 * (k + 1) + 2);//6 10 14
        this.styleSheets[1].insertRule(`
      .selected-background${k} {
        background-image: url("../../${selectedPathFilePrefix}${k}.png") !important;
        background-size: cover !important;
        background-repeat: no-repeat !important;
      }`, 4 * (k + 1) + 3);//7 11 15
      }
    }
    return this;
  };
  
  /**
   * redraw viewport and refill timelines with current content size & config settings
   * without resizing content
   * @return {Keyboard} - returns 'this' to support method chaining
   * @private
   */
  _redrawContent() {
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
        .seek(`initialPosition${i}`);
    }
    this._reloadSchemeStyles();
    this.switchKeyboxBorder(this.keyboard.keybox.showBorder);
    
    return this;
  };
  
  /**
   * resize keyboard content to fit with viewport size
   * @return {Keyboard} - returns 'this' to support method chaining
   * @private
   */
  _fitWindowSizeToViewport() {
    this.windowOuterWidth = this.viewport.outerWidth(true)
      + this.viewport.parents().length
      * (+this.viewport.css('margin-right').match(/\d+/)[0] + +this.viewport.css('margin-left').match(/\d+/)[0] + +this.viewport.css('border-width').match(/\d+/)[0])
      + this.windowVerticalFramesWidth
    ;
    this.windowOuterHeight = this.viewport.outerHeight(true) + this.formMonitor.outerHeight(true)
      + this.viewport.parents().length
      * (+this.viewport.css('margin-top').match(/\d+/)[0] + +this.viewport.css('margin-bottom').match(/\d+/)[0] + +this.viewport.css('border-width').match(/\d+/)[0])
      + this.windowHorizontalFramesWidth
    ;
    window.resizeTo(this.windowOuterWidth, this.windowOuterHeight);
    return this;
  };
  
  /**
   * reset stimuli with settings from application config.json
   * @return {Keyboard} - returns 'this' to support method chaining
   * @private
   */
  _resetStimuli() {
    // noinspection JSUnresolvedVariable
    this.stimuli.reset({
      stimuliIdArray: this.stimulation.sequence.stimuli,
      duration: this.stimulation.duration,
      pause: this.stimulation.pause
    });
    ipcRenderer.send('ipcKeyboard-command', 'stimulationChange');
    return this;
  };
  
  //GETTERS & SETTERS
  
  /**
   * color scheme configuration setter
   * @param colorScheme - object literal with color scheme properties
   */
  set colorSchemeConfiguration(colorScheme) {
    this.colorScheme = Tools.copyObject(colorScheme);
  }
  
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
  set keyboardConfiguration(keyboardObject) {
    this.keyboard = Tools.copyObject(keyboardObject);
    this.run(this.keyboard);
    // super.reloadScheme(this.colorScheme);
  }
  
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
   * start stimulation
   */
  startStimulation() {
    // this.setImmediate(this._bindStimuli());
    this._bindStimuli();
  }
  
  /**
   * stop stimulation
   */
  stopStimulation() {
    // this.setImmediate(this._unbindStimuli());
    this._unbindStimuli();
  }
  
  /**
   * reload color scheme properties
   * @param colorScheme - name of scheme
   */
  reloadScheme(colorScheme) {
    super.reloadScheme(colorScheme);
    this
      ._reloadSchemeStyles()
      ._addNormalBackgroundClassToKeyboxesWithPics()
    ;
    return this;
  }
  
  /**
   * calculate keyboard properties that depends on config properties
   * @param keyboard - reference to object literal with all the data relevant to configuration of application
   * @return {Keyboard} - returns 'this' to support method chaining
   */
  init(keyboard) {
    this.keyboard = Tools.copyObject(keyboard);
    // timing, geometry and position calculation
    this.fontScaleFactor = Math.min(keyboard.keybox.width, keyboard.keybox.height);
    
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
    
    this.minViewportWidth = this.minHorizontalKeyboxDelta * keyboard.viewport.columns;
    this.viewportWidth = keyboard.viewport.width;
    this.viewportWidth = this.viewportWidth < this.minViewportWidth ? this.minViewportWidth : this.viewportWidth;
    
    this.minViewportHeight = this.minVerticalKeyboxDelta * keyboard.viewport.rows;
    this.viewportHeight = keyboard.viewport.height;
    this.viewportHeight = this.viewportHeight < this.minViewportHeight ? this.minViewportHeight : this.viewportHeight;
    
    this.leftmostKeyboxPosition = keyboard.animation.leftShift * this.horizontalKeyboxDelta;
    this.rightmostKeyboxPosition = this.viewportWidth + keyboard.animation.leftShift * this.horizontalKeyboxDelta;
    
    this.horizontalKeyboxPeriod = keyboard.animation.tweenDuration / keyboard.viewport.columns;
    let
      velocity = (this.rightmostKeyboxPosition - this.leftmostKeyboxPosition) / keyboard.animation.tweenDuration,
      gap = (this.horizontalKeyboxPeriod * velocity - keyboard.keybox.width) / velocity,
      shift = this.horizontalKeyboxPeriod * keyboard.animation.leftShift
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
      ._redrawContent()
      ._resetStimuli()
      ._fitWindowSizeToViewport()
    ;
    return this;
  }
  
  /**
   * reset keyboard properties to fit keys to the viewport and redraw keyboard content to fit viewport size
   * @return {Keyboard} - returns 'this' to support method chaining
   */
  autofit() {
    this.keyboard.viewport.width = this.minViewportWidth;
    this.keyboard.viewport.height = this.minViewportHeight;
    this
      .init(this.keyboard)
      ._redrawContent()
      ._fitWindowSizeToViewport()
      .initialState(this.keyboard.schools)
    ;
    
    this.emit('keyboardLayoutChange', this.keyboard);
    
    return this;
    
  }
  
  /**
   * drops all symbols into start position and sets timeScale into zero (no movements) if stop == true
   * @param schools - array of groups of elements with the same movement rules
   * @return {Keyboard} - returns 'this' to support method chaining
   */
  initialState(schools) {
    for (let i = 0; i < schools.length; i++) {
      this.keyboard.schools[i].motion.speedScale = 0;
      this.timelines[i]
        .timeScale(0)
        .seek(`initialPosition${i}`)
      ;
    }
    this.emit('keyboardLayoutChange', this.keyboard);
    return this;
  }
  
  /**
   * to change motion properties of keyboard on the fly
   * @param schools - array of groups of elements with the same movement rules
   * @return {Keyboard} - returns 'this' to support method chaining
   */
  motionChange(schools) {
    for (let i = 0; i < schools.length; i++) {
      this.keyboard.schools[i].motion.speedScale = schools[i].motion.speedScale;
      this.keyboard.schools[i].motion.reverse = schools[i].motion.reverse;
      this.keyboard.schools[i].motion.randomSpeed = schools[i].motion.randomSpeed;
      this.timelines[i].timeScale(schools[i].motion.speedScale); //speedScale - scale factor of speed value (defined by keyboard.animation.tweenDuration)
      // if (this.keyboard.schools[i].motion.reverse && !this.timelines[i].reversed()) {
      //   this.timelines[i].reverse();
      // } else {
      //   this.timelines[i].play();
      // }
    }
    return this;
  }
  
  /**
   * show or hide keybox border
   * @param showBorder - true if show border of false if not
   */
  switchKeyboxBorder(showBorder) {
    this.keyboard.keybox.showBorder = showBorder;
    if (showBorder)
      this.keyboxes.addClass("bordered");
    else
      this.keyboxes.removeClass("bordered");
  }
  
  /**
   * update keybox size with new keybox.width & keybox.height
   * @param keybox - object literal with new keybox width & height
   */
  updateKeyboxSize(keybox) {
    Tools.runDebounced(() => {//debounced actions
        this.keyboard.keybox.width = keybox.width;
        this.keyboard.keybox.height = keybox.height;
        this.keyboxes
          .css({
            width: keybox.width,
            height: keybox.height
          });
        this
          .init(this.keyboard)
          ._redrawContent()
          .autofit()
        ;
      }, 200
    );
  }
  
}

module.exports = Keyboard;
