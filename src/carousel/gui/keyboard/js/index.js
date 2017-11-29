"use strict";
// ODO - клавиатура/стимулы - количество не важно, не картинки, а шрифт (просто буквы, цифры)
// ODO - движение - без движения или движение с регулируемой вручную скоростью в одном направлении (реверс и рандомная скорость во вторую итерацию).
// ODO - без режима обучения (режим обучения + SVM => во вторую итерацию)
// ODO - изменение параметров: скорость движения
// ODO - изменение параметров: цвет фона черный/белый
// ODO - стимуляция - увеличение размера и/или подсветка в случайном порядке без повторов в одном цикле
// TODO - изменение параметров: длительность стимула и паузы
// TODO - обработка события decision объекта mbeeg

const
  {Tools, Stimuli} = require('mbeeg')
  , {ipcRenderer, remote} = require('electron')
  , {TweenMax, TweenLite/*, Power2, TimelineLite*/} = require('gsap')
  , {switchSchema, stimulusOn, stimulusOff} = require('carousel-helpers')
;

$(() => {
  let
    config = Tools.loadConfiguration(`config.json`)
    , viewport = $("#viewport")
    , length, velocity, boxDelay,
    timeLines
  ;
  const
    stimuli = new Stimuli({
      stimuliIdArray: config.stimulation.sequence.stimuli,
      signalDuration: config.stimulation.duration,
      pauseDuration: config.stimulation.pause
    })
  ;
  stimuli.on('data', stimulus => {
    let key = $(`.key[index="${stimulus[1]}"]`);
    stimulusOn(key, config);
    setTimeout(() => {
      stimulusOff(key, config);
    }, config.stimulation.duration);
    console.log(stimulus);
  });
  
  function init() {
    for (let i = 0; i < config.keyboard.schools.length; i++)
      switch (config.keyboard.schools[i].motion.easing) {
        case "linear":
          config.keyboard.schools[i].motion.easing = "linear";
          break;
        case "swing":
          config.keyboard.schools[i].motion.easing = "swing";
          break;
        case "rough":
          config.keyboard.schools[i].motion.easing = RoughEase.ease.config({
            template: Power0.easeNone,
            strength: 1,
            points: 20,
            taper: "none",
            randomize: true,
            clamp: false
          });
          break;
        case "slow motion":
          config.keyboard.schools[i].motion.easing = SlowMo.ease.config(0.9, 0.2, false);
          break;
        case "stepped":
          config.keyboard.schools[i].motion.easing = SteppedEase.config(34);
      }
    
    //make keys array
    /* let alphabet = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФXЦЧШЩЪЫЬЭЮЯ";
    for (let j = 0, rows = config.keyboard.viewport.rows; j < rows; j++) {//rows//todo rows & columns count depends on keys array length
      schools.push({
        id: j,
        speedScale: 1, //1 - full speed  , 0 - pause; actual speed is (viewport.width/duration)*speedscale
        reverse: false,
        randomSpeed: false
      });
      for (let columns = config.keyboard.viewport.columns, i = 0; i < columns; i++) {//columns
        let id = j * columns + i;
        keys.push({
          id: id, //key id
          symbol: alphabet[id],
          row: j,
          column: columns - i - 1, //i - for back alphabet order (right to left); columns-i-1 - for straight alphabet order (left to right)
          top: j * config.keyboard.keybox.height,
          left: -config.keyboard.keybox.width,
          stimulus: id, //
          school: j
        });
        stimuli.push(id);
      }
    }
    */
    
    // t=S/V
    length = config.keyboard.keybox.width * config.keyboard.viewport.columns;
    velocity = length / config.keyboard.duration;
    boxDelay = config.keyboard.keybox.width / velocity;
  }
  
  function getKeybox(i) {//i - key index in Keys array
    
    //create div & tween for it
    let
      keybox = $(`<div class="key" index="${i}">${config.keyboard.keys[i].symbol}</div>`)
    ;
    
    viewport.append(keybox);
    
    TweenLite.set(keybox, {
      left: config.keyboard.keys[i].left,
      top: config.keyboard.keys[i].top
    });
    
    let lets = config.keyboard.bezier ? {//to
      bezier: {
        type: "sharp",
        values: [{x: 60, y: 80}, {x: 150, y: 30}, {x: 400 + Math.random() * 100, y: 320 * Math.random() + 50}, {
          x: 500,
          y: 320 * Math.random() + 50
        }, {x: 700, y: 100}, {x: 850, y: 500}],
        autoRotate: true
      }
    } : {};
    
    lets = Object.assign({}, lets, {
      left: length
      , ease: config.keyboard.schools[config.keyboard.keys[i].school].motion.easing
      , repeat: -1
    });
    
    return new TweenMax(keybox
      , config.keyboard.duration
      , lets);
  }
  
  function buildTimeline(school) {
    let timeline = new TimelineMax({delay: 0, repeat: 0, repeatDelay: -8});
    for (let i = 0; i < config.keyboard.keys.length; i++) {
      if (config.keyboard.keys[i].school === school)
        timeline.add(getKeybox(i), config.keyboard.keys[i].column * boxDelay);
    }
    return timeline;
  }
  
  function run() {
    timeLines = [];
    for (let i = 0; i < config.keyboard.schools.length; i++) {
      timeLines.push(buildTimeline(i).timeScale(100));
      setTimeout(() => {
        timeLines[i].timeScale(config.keyboard.schools[i].motion.speedScale);
        timeLines[i].resume();
      }, 100);
    }
    
    $(".key").on("click", (e) => {
      let output = $('.line');
      output.val(output.val() + config.keyboard.keys[($(e.currentTarget).attr(`index`))].symbol);
    });
    
  }
  
  ipcRenderer
    .on(`ipcConsole-command`, (e, arg) => {
      config = Tools.copyObject(arg);
      switchSchema(config);
      for (let i = 0; i < config.keyboard.schools.length; i++) {
        
        timeLines[i].timeScale(+config.keyboard.schools[i].motion.speedScale);
        timeLines[i].resume();
        
        if (config.keyboard.schools[i].motion.reverse)
          timeLines[i].reverse();
        else
          timeLines[i].play();
        
      }
      // case `restart`:
      //   viewport.html("");
      //   init();
      //   run();
      //   break;
    });

// $(window).resize((e) => {
//     $(`#windowsize`).html(`${e.target.outerWidth} x ${e.target.outerHeight}`);
// });
  
  init();
  run();
  switchSchema(config);
  
})
;
