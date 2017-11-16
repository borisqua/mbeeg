"use strict";
// TODO - клавиатура/стимулы - количество не важно, не картинки, а шрифт (просто буквы, цифры)
// TODO - стимуляция - увеличение размера и/или подсветка в случайном порядке без повторов в одном цикле
// TODO - движение - без движения или движение с регулируемой вручную скоростью в одном направлении (реверс и рандомная скорость во вторую итерацию).
// TODO - без режима обучения (режим обучения + SVM => во вторую итерацию)
// TODO - изменение параметров: скорости движения, длительность стимула и паузы, цвет фона черный/белый (произвольный цвет или кожа/обои во вторую итерацию)

const
  fs = require('fs')
  , {Tools} = require('mbeeg')
  , {ipcRenderer} = require('electron')
  , {TweenMax, TweenLite, Power2, TimelineLite} = require('gsap');
;


$(() => {
  let
    config = Tools.loadConfiguration(`config.json`)
    , viewport = $("#viewport")
    , length, velocity, boxDelay,
    timeLines
  ;
  
  function init() {
    
    for (let i = 0; i < config.keyboard.groups.length; i++)
      switch (config.keyboard.groups[i].motion.easing) {
        case "linear":
          config.keyboard.groups[i].motion.easing = "linear";
          break;
        case "swing":
          config.keyboard.groups[i].motion.easing = "swing";
          break;
        case "rough":
          config.keyboard.groups[i].motion.easing = RoughEase.ease.config({
            template: Power0.easeNone,
            strength: 1,
            points: 20,
            taper: "none",
            randomize: true,
            clamp: false
          });
          break;
        case "slow motion":
          config.keyboard.groups[i].motion.easing = SlowMo.ease.config(0.9, 0.2, false);
          break;
        case "stepped":
          config.keyboard.groups[i].motion.easing = SteppedEase.config(34);
      }
    
    // config = {
    //   stimulation: {//array of stimuli. Each stimulus consists from keys array, stimulus duration and pause duration, time of stimulus
    //     learning: {
    //       type: `consecutive`, //`word-driven`
    //     }
    //   },
    //   keyboard: {
    //     viewport: {//viewport geometry
    //       width: viewport.width() * 0.8,
    //       height: 600,
    //       rows: 3, //TODO rows & columns are depended from keys array length
    //       columns: 11
    //     },
    //     // easing: CustomEase.create("custom", "M0,0 C0.04,0.062 -0.002,0.12 0.034,0.175 0.053,0.205 0.192,0.22 0.212,0.248 0.245,0.294 0.274,0.404 0.301,0.446 0.335,0.497 0.446,0.5 0.472,0.536 0.54,0.63 0.541,0.697 0.6,0.752 0.626,0.776 0.704,0.789 0.804,0.846 0.872,0.884 0.91,1 1,1"),
    //     // interval: 10,
    //     // tweenlets:
    //     // {//to (spin, trajectory and end point of movement)
    //     //     left: this.keybox.width * this.viewport.columns
    //     //     , bezier:{
    //     //     type:"sharp",
    //     //     values:[{x:60, y:80}, {x:150, y:30}, {x:400 + Math.random() *100, y:320*Math.random() + 50}, {x:500, y:320*Math.random() + 50}, {x:700, y:100}, {x:850, y:500}],
    //     //     autoRotate:true
    //     //     }
    //     //     , ease: keyboard.easing
    //     //     , repeat: -1
    //     // }
    //     bezier: false
    //   }
    // };
    
    //make keys array
    /* let alphabet = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФXЦЧШЩЪЫЬЭЮЯ";
    for (let j = 0, rows = config.keyboard.viewport.rows; j < rows; j++) {//rows//TODO rows & columns count depends on keys array length
      groups.push({
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
          stimuliId: id, //
          groupId: j
        });
        stimuli.push(id);
      }
    }
    */
    /*
        fs.writeFile(`config.json`, JSON.stringify(config, null, 2), (err) => {
          if (err) throw err;// TODO LOADING & SAVING CONFIGURATION SHOULD BE IN RESPONSIBILITY OF CONTROLLER IN COOPERATION WITH CONSOLE RENDERER
        });
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
    
    keybox
      .css({
        // "background": "url('pics/" + i + ".png') no-repeat center",// rgba(0,0,0,0.1)hsla(180,0%,50%,0.25)",
        // "background-size": "60%",  text-decoration: none;
        "color": "#FF1177",
        "display": "flex",
        "justify-content": "center",
        "align-items": "center",
        "font": "bold 500% sans-serif"
      })
      .hover(
        function () {//in handler
          $(this).css({
            "background-size": "100%",
            "color": "#FFF",
            "text-shadow": "0 0 15px #fff, 0 0 1em #ff07d3",//FF1177,ff75f3
            "font-size": "700%"
          });
        },
        function () {//out handler
          $(this).css({
            // "background-size": "60%",
            "color": "#FF1177",
            "text-shadow": "none",
            "font-size": "500%"
          });
        }
      )
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
      , ease: config.keyboard.groups[config.keyboard.keys[i].groupId].motion.easing
      , repeat: -1
    });
    
    return new TweenMax(keybox
      , config.keyboard.duration
      , lets);
  }
  
  function buildTimeline(row) {
    let timeline = new TimelineMax({delay: 0, repeat: 0, repeatDelay: -8});
    for (let i = 0; i < config.keyboard.keys.length; i++) {
      if (config.keyboard.keys[i].row === row)
        timeline.add(getKeybox(i), config.keyboard.keys[i].column * boxDelay);
    }
    return timeline;
  }
  
  function run() {
    timeLines = [];
    timeLines.length = 0;
    for (let i = 0; i < config.keyboard.groups.length; i++) {
      timeLines.push(buildTimeline(i).timeScale(100));
      setTimeout(() => {
        timeLines[i].timeScale(config.keyboard.groups[i].motion.speedScale);
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
      switch (arg.command) {
        case `change`:
          // if (arg.value === 0) {
          //   timeLines[arg.index].pause();
          // } else {
          timeLines[+arg.index].timeScale(+arg.value);
          timeLines[+arg.index].resume();
          // }
          break;
        case `restart`:
          viewport.html("");
          init();
          run();
          break;
        case `reverse`:
          if (timeLines[+arg.index].reversed())
            timeLines[+arg.index].play();
          else
            timeLines[+arg.index].reverse();
          break;
      }
    });
  
  // $(window).resize((e) => {
  //     $(`#windowsize`).html(`${e.target.outerWidth} x ${e.target.outerHeight}`);
  // });
  
  init();
  run();
  
});
