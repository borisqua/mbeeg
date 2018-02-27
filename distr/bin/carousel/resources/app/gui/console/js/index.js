"use strict";

const
  {remote, ipcRenderer} = require('electron')
  , fs = require('fs')
  , {Tools} = require('mbeeg')
  , {Helpers} = require('carousel')
;

$(() => {
    let
      config = remote.getGlobal('config')
      , alphabetField = $('input#alphabet')
      , motionGroup = $('#motion')
      , alphabet = config.carousel.keyboard.alphabet//"АБВГДЕЁЖЗИЙКЛМНОПРСТУФXЦЧШЩЪЫЬЭЮЯ"
      , maxLength = config.carousel.keyboard.viewport.columns * config.carousel.keyboard.viewport.rows
    ;
    alphabetField.attr('maxlength', maxLength);
    console.log(remote.getGlobal('config').keyboard.keys);
    
    function init() {
      maxLength = config.carousel.keyboard.viewport.columns * config.carousel.keyboard.viewport.rows;
      
      alphabet = alphabet.substr(0, maxLength);
      alphabetField.prev().html(`alphabet, max ${maxLength} symbols`);
      alphabetField.val(alphabet);
      alphabetField.attr('maxlength', maxLength);
      
      /**
       *
       * @param index
       * @return {*|jQuery|HTMLElement}
       */
      function getMotionControlGroup(index) {
        return $(`
          <div class="inputbox">
						<label class = "centered"> school ${index} </label>
						<input class="speed${index} centered slider" type="range" min="0" max="1" step="0.01" value="${config.carousel.keyboard.schools[index].motion.speedScale}" id="speedSlider${index}" index="${index}">
						<input id="speedValue${index}" class="speed${index} value" value="${config.carousel.keyboard.schools[index].motion.speedScale}" index="${index}"/>
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
      }
      
      /**
       * private function, initializes and adds listener to each element of given jQuery collection
       * @param event
       * @param jquery - jQuery collection by selector to work with
       * @param property - property of html element to set and store in config file
       * @param valueFromConfig - value from configuration file to initialize settings console form fields
       * @param callback - callback function to store changes into configuration data file
       */
      function addEventListener(event, jquery, property, valueFromConfig, callback) {
        jquery.unbind();
        if (!!property) {//if property exists then it is some kind of value field else it is some action button
          jquery.each((i, element) => element[property] = valueFromConfig);
        }
        jquery
          .on(event, e => {
            
            if (!!property) {
              let value = e.target[property];
              jquery.each((i, element) => element[property] = value);
              callback(value);//in general callback to update or store value in config
            } else {
              e.preventDefault();
              callback(); //in general callback to do some actions
            }
            
            
            Helpers.reloadSchema(config);
            ipcRenderer.send(`ipcConsole-command`, config);
            config.carousel.ipc.command = null;
            fs.writeFile(`config.json`, JSON.stringify(config, null, 2), err => { if (err) throw err; });
          });
      }
      
      /**
       *
       */
      function updateMotionControlGroup() {
        motionGroup.html(`
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
        addEventListener('change', $('#speed-scales-locker'), 'checked', config.carousel.console.speedScalesIsLocked,
          v => config.carousel.console.speedScalesIsLocked = v);
        
        for (let i = 0; i < config.carousel.keyboard.schools.length; i++) {
          motionGroup.append(getMotionControlGroup(i));
          addEventListener('input', $(`.speed${i}`), 'value',
            +config.carousel.keyboard.schools[i].motion.speedScale,
            v => {
              config.carousel.keyboard.schools[i].motion.speedScale = +v;
              config.carousel.ipc.command = "motionChange";
            });
        }
        window.resizeTo(900, 615 + config.carousel.keyboard.viewport.rows * 32);
      }
      
      /**
       *
       */
      function makeArrays() {
        config.carousel.keyboard.keys.length = 0;
        config.carousel.keyboard.schools.length = 0;
        config.mbeeg.stimulation.sequence.stimuli.length = 0;
        for (let j = 0; j < config.carousel.keyboard.viewport.rows; j++) {//rows
          config.carousel.keyboard.schools.push({
            id: j,
            motion: {
              easing: "slow motion",
              speedScale: !!config.carousel.keyboard.schools[j] ? config.carousel.keyboard.schools[j].speedScale : 0, //1 - full speed  , 0 - pause; actual speed is (viewport.width/duration)*speedscale
              reverse: false,
              randomSpeed: false
            }
          });
          for (let columns = config.carousel.keyboard.viewport.columns, i = 0; i < columns; i++) {//columns
            let id = j * columns + i;
            config.carousel.keyboard.keys.push({
              column: i, //columns - i - 1, //i - for back alphabet order (right to left); columns-i-1 - for straight alphabet order (left to right)
              left: -config.carousel.keyboard.keybox.width, //i * config.carousel.keyboard.keybox.width,
              row: j,
              school: j,
              stimulus: id, //
              symbol: config.carousel.keyboard.alphabet[id] ? config.carousel.keyboard.alphabet[id] : '',
              top: j * config.carousel.keyboard.keybox.height
            });
            if (config.carousel.keyboard.alphabet[id]) {
              config.mbeeg.stimulation.sequence.stimuli.push(id);
            }
          }
        }
      }
      
      /**
       *
       * @param property
       * @param value
       */
      function updateViewport(property, value) {
        config.carousel.keyboard.viewport[property] = +value;
        maxLength = config.carousel.keyboard.viewport.columns * config.carousel.keyboard.viewport.rows;
        alphabetField.prev().html(`alphabet, max ${maxLength} symbols`);
        alphabet = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФXЦЧШЩЪЫЬЭЮЯ";
        alphabet = alphabet.substr(0, maxLength);
        config.carousel.keyboard.alphabet = alphabet;
        alphabetField.val(alphabet);
        alphabetField.attr('maxlength', maxLength);
        makeArrays();
        config.carousel.ipc.command = "update";
      }
      
      addEventListener('change', $('#color-scheme'), 'value', config.carousel.appearance.colorScheme.selected,
        v => config.carousel.appearance.colorScheme.selected = v);
      addEventListener('change', $('#color'), 'checked', config.carousel.appearance.stimulation.color,
        v => config.carousel.appearance.stimulation.color = v);
      addEventListener('change', $('#size'), 'checked', config.carousel.appearance.stimulation.size,
        v => config.carousel.appearance.stimulation.size = v);
      addEventListener('change', $('#shine'), 'checked', config.carousel.appearance.stimulation.shine,
        v => config.carousel.appearance.stimulation.shine = v);
      addEventListener('change', $('#animation'), 'value', config.carousel.appearance.stimulation.animation.selected,
        v => config.carousel.appearance.stimulation.animation.selected = v);
      
      addEventListener('input', $('.duration'), 'value', +config.mbeeg.stimulation.duration,
        v => config.mbeeg.stimulation.duration = +v);
      addEventListener('input', $('.pause'), 'value', +config.mbeeg.stimulation.pause,
        v => config.mbeeg.stimulation.pause = +v);
      addEventListener('change', $('#keyboxBorder'), 'checked', config.carousel.keyboard.keybox.showBorder,
        v => config.carousel.keyboard.keybox.showBorder = v);
      addEventListener('input', $('.keyboxHeight'), 'value', +config.carousel.keyboard.keybox.height,
        v => {
          config.carousel.keyboard.keybox.height = +v;
          // config.carousel.ipc.command = "update";
        });
      addEventListener('input', $('.keyboxWidth'), 'value', +config.carousel.keyboard.keybox.width,
        v => {
          config.carousel.keyboard.keybox.width = +v;
          // config.carousel.ipc.command = "update";
        });
      addEventListener('input', $('.viewportColumns'), 'value', +config.carousel.keyboard.viewport.columns,
        v => {
          updateViewport('columns', v);
          updateMotionControlGroup();
        });
      addEventListener('input', $('.viewportRows'), 'value', +config.carousel.keyboard.viewport.rows,
        v => {
          updateViewport('rows', v);
          updateMotionControlGroup();
        });
      addEventListener('input', $('#alphabet'), 'value', config.carousel.keyboard.alphabet,
        v => {
          config.carousel.keyboard.alphabet = v;
          makeArrays();
          config.carousel.ipc.command = "update";
        });
      //buttons
      addEventListener('click', $('#initial-button'), "", "",
        () => {
          for (let i = 0; i < config.carousel.keyboard.schools.length; i++) {
            config.carousel.keyboard.schools[i].motion.speedScale = 0;
            $(`.speed${i}`).each((i, element) => element['value'] = 0);
          }
          config.carousel.ipc.command = "initialState";
          ipcRenderer.send(`ipcConsole-command`, config);
        });
      addEventListener('click', $('#autofit-button'), "", "",
        () => {
          config.carousel.ipc.command = "autofit";
          ipcRenderer.send(`ipcConsole-command`, config);
        });
      addEventListener('click', $('#restart-button'), "", "",
        () => {
          config.carousel.ipc.command = "restart";
          ipcRenderer.send(`ipcConsole-command`, config);
        });
      
      updateMotionControlGroup();
      
      $(".rnd")
      // .on('change', e => {
        .on('click', e => {
          e.preventDefault();
          // index = $(e.target).attr("index");
          // config.carousel.keyboard.schools[index].motion.randomSpeed = e.target.checked;
          // ipcRenderer.send(`ipcConsole-command`, config);
          alert('UNDER CONSTRUCTION!!! \nOption not available yet...');
        })
      ;
      
      $(".reverse")
      // .on('change', e => {
        .on('click', e => {
          e.preventDefault();
          // index = $(e.target).attr("index");
          // config.carousel.keyboard.schools[index].motion.reverse = e.target.checked;
          // ipcRenderer.send(`ipcConsole-command`, config);
          alert('UNDER CONSTRUCTION!!! \nOption not available yet...');
        })
      ;
    }
    
    ipcRenderer.on('ipcKeyboard-command', (e, arg) => {
      config = Tools.copyObject(arg);
    });
    
    init();
    Helpers.reloadSchema(config);
    
  }
);
