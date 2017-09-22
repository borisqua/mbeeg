"use strict";
const
  appRoot = require(`app-root-path`)
  , {ipcRenderer} = require(`electron`)
  // , Stimuli = require(`${appRoot}/src/core/dsprocessor/stimuli`)
;

$(() => {
  let
    carousel, viewport, timestamp, keys, groups, stimuli,
    length, velocity, boxDelay,
    timeLines;
  
  function init() {
    viewport = $("#viewport");
    timestamp = $("#timestamp");
    groups = [];
    stimuli = [];
    keys = [];
    
    let easing = "slow motion";
    switch (easing) {
      case "linear":
        easing = "linear";
        break;
      case "swing":
        easing = "swing";
        break;
      case "rough":
        easing = RoughEase.ease.config({
          template: Power0.easeNone,
          strength: 1,
          points: 20,
          taper: "none",
          randomize: true,
          clamp: false
        });
        break;
      case "slow motion":
        easing = SlowMo.ease.config(0.9, 0.2, false);
        break;
      case "stepped":
        easing = SteppedEase.config(34);
    }
    
    carousel = {
      viewport: {//viewport geometry
        width: viewport.width() * 0.8,
        height: 600,
        rows: 3, //TODO rows & columns are depended from keys array length
        columns: 11
      },
      keys: keys, //keys array
      groups: groups, //array of groups. Each group has the same movement properties, such as direction, trajectory, speed, etc.
      stimulation: {//array of stimuli. Each stimulus consists from keys array, stimulus duration and pause duration, time of stimulus
        duration: 100,
        pause: 200,
        sequence: {
          type: "random", //consecutive, rule-driven
          repetition: false, //
          stimuli: stimuli, //[{keys[id1,id2,id3...idN], repetition: 1}]
          dimensions: 1 //should be number for reduce-dimensions search
        },
        learning: {
          type: `consecutive`, //`word-driven`
        }
      },
      keybox: {
        width: viewport.height() / 3,
        height: viewport.height() / 3
      },
      duration: 10, //sec. time to go full path (determines the speed of motion)
      easing: easing,
      // easing: CustomEase.create("custom", "M0,0 C0.04,0.062 -0.002,0.12 0.034,0.175 0.053,0.205 0.192,0.22 0.212,0.248 0.245,0.294 0.274,0.404 0.301,0.446 0.335,0.497 0.446,0.5 0.472,0.536 0.54,0.63 0.541,0.697 0.6,0.752 0.626,0.776 0.704,0.789 0.804,0.846 0.872,0.884 0.91,1 1,1"),
      // interval: 10,
      // tweenlets:
      // {//to (spin, trajectory and end point of movement)
      //     left: this.keybox.width * this.viewport.columns
      //     , bezier:{
      //     type:"sharp",
      //     values:[{x:60, y:80}, {x:150, y:30}, {x:400 + Math.random() *100, y:320*Math.random() + 50}, {x:500, y:320*Math.random() + 50}, {x:700, y:100}, {x:850, y:500}],
      //     autoRotate:true
      //     }
      //     , ease: keyboard.easing
      //     , repeat: -1
      // }
      bezier: false
    };
    //make keys array
    let alphabet = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФXЦЧШЩЪЫЬЭЮЯ";
    for (let j = 0, rows = carousel.viewport.rows; j < rows; j++) {//rows//TODO rows & columns count depends on keys array length
      groups.push({
        id: j,
        speedScale: 1, //1 - full speed  , 0 - pause; actual speed is (viewport.width/duration)*speedscale
        reverse: false,
        easing: "slow motion",
        randomSpeed: false
      });
      for (let columns = carousel.viewport.columns, i = 0; i < columns; i++) {//columns
        let id = j * columns + i;
        keys.push({
          id: id, //key id
          symbol: alphabet[id],
          row: j,
          column: columns - i - 1, //i - for back alphabet order (right to left); columns-i-1 - for straight alphabet order (left to right)
          top: j * carousel.keybox.height,
          left: -carousel.keybox.width,
          stimuliId: id, //
          groupId: j
        });
        stimuli.push(id);
      }
    }
    //TODO LOADING & SAVING CONFIGURATION SHOULD BE IN RESPONSIBILITY OF CONTROLLER IN COOPERATION WITH CONSOLE RENDERER
    // const fs = require(`fs`);
    // fs.writeFile(`config.json`, JSON.stringify(carousel, null, 2), (err) => {
    //   if (err) throw err;
    // });
    
    // t=S/V
    length = carousel.keybox.width * carousel.viewport.columns;
    velocity = length / carousel.duration;
    boxDelay = carousel.keybox.width / velocity;
  }
  
  function getKeybox(i) {//i - key index in Keys array
    
    //create div & tween for it
    let keybox = $(`<div class="key" index="${i}"></div>`);
    
    keybox
      .css({
        "background": "url('pics/" + i + ".png') no-repeat center",// rgba(0,0,0,0.1)hsla(180,0%,50%,0.25)",
        "background-size": "60%"
        // "left":  carousel.keybox.width //* carousel.keys[i].column
      })
    // .hover(
    //   function () {
    //     $(this).css({"background-size": "100%"});
    //   },
    //   function () {
    //     $(this).css({"background-size": "60%"});
    //   }
    // )
    ;
    
    viewport.append(keybox);
    
    TweenLite.set(keybox, {
      left: carousel.keys[i].left,
      top: carousel.keys[i].top
    });
    
    let lets = carousel.bezier ?
      {//to
        left: length
        , bezier: {
        type: "sharp",
        values: [{x: 60, y: 80}, {x: 150, y: 30}, {x: 400 + Math.random() * 100, y: 320 * Math.random() + 50}, {
          x: 500,
          y: 320 * Math.random() + 50
        }, {x: 700, y: 100}, {x: 850, y: 500}],
        autoRotate: true
      },
        ease: carousel.easing,
        repeat: -1
      } :
      {//to
        left: length,
        ease: carousel.easing,
        repeat: -1
      };
    
    return new TweenMax(keybox
      , carousel.duration
      , lets);
  }
  
  function buildTimeline(row) {
    let timeline = new TimelineMax({delay: 0, repeat: 0, repeatDelay: -8});
    for (let keys = carousel.keys.length, i = 0; i < keys; i++) {
      if (carousel.keys[i].row === row)
        timeline.add(getKeybox(i), carousel.keys[i].column * boxDelay);
    }
    return timeline;
  }
  
  function run() {
    timeLines = [];
    timeLines.length = 0;
    for (let i = 0; i < 3; i++) {
      timeLines.push(buildTimeline(i).timeScale(100));
      setTimeout(() => {
        timeLines[i].timeScale(carousel.groups[i].speedScale);
        timeLines[i].resume();
      }, 100);
    }
    
    $(".key").on("click", (e) => {
      let output = $('.line');
      output.val(output.val() + carousel.keys[($(e.currentTarget).attr(`index`))].symbol);
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
