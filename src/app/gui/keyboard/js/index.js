"use strict";
const
  {ipcRenderer} = require(`electron`);

$(function () {
  let carousel, viewport, timestamp, keys, speedValue, speedSlider,
    length, velocity, boxDelay;
  let timeLines;
  
  // function pad(l, v) {// l - length of zero-leading string number, v - number value
  // str = str.toString();
  // return str.length < max ? pad("0" + str, max) : str;
  // return pad = len => n =>
  //   [...Array(len).keys()].map(i => 0).concat([n]).join('').substr(-len)
  // return a = (l, v) => [...new Array(l).keys()].map(i => 0).concat(v).join('').substr(v.toString().length > l ? -v.toString().length : -l);
  // }
  
  function init() {
    viewport = $("#viewport");
    timestamp = $("#timestamp");
    keys = [];
    
    speedSlider = $(".ui-slider");
    speedValue = $(".value");
    
    let easing = "linear";
    switch ($("#easing").val()) {
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
        width: viewport.width(),
        height: 600,
        rows: 3, //TODO rows & columns are depended from keys array length
        columns: 10
      },
      keys: keys, //keys array
      keybox: {//keybox geometry
        width: viewport.height() / 3,
        height: viewport.height() / 3
      },
      duration: 10, //seconds to go trough full path (determines the speed of motion)
      easing: easing
      // , easing: CustomEase.create("custom", "M0,0 C0.04,0.062 -0.002,0.12 0.034,0.175 0.053,0.205 0.192,0.22 0.212,0.248 0.245,0.294 0.274,0.404 0.301,0.446 0.335,0.497 0.446,0.5 0.472,0.536 0.54,0.63 0.541,0.697 0.6,0.752 0.626,0.776 0.704,0.789 0.804,0.846 0.872,0.884 0.91,1 1,1")
      // , interval: 10 //
      // , tweenlets:
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
    };
    
    //make keys array
    for (let j = 0; j < carousel.viewport.columns; j++)//columns //TODO rows & columns are depended from keys array length
      for (let i = 0; i < carousel.viewport.rows; i++) {//rows
        keys.push({
          row: i,
          column: j
        });
      }
    
    // V=S/T => T=S/V
    length = carousel.keybox.width * carousel.viewport.columns;
    velocity = length / carousel.duration;
    boxDelay = carousel.keybox.width / velocity;
  }
  
  function getKeybox(i) {//i - key index in Keys array
    
    //create div & tween for it
    let keybox = $('<div class="key" index="' + i + '">{' + carousel.keys[i].column + ';' + carousel.keys[i].row + '}</div>');
    keybox
      .css({
        "background": "url('pics/" + i + ".png') no-repeat center",// rgba(0,0,0,0.1)hsla(180,0%,50%,0.25)",
        "background-size": "60%"
        // "left":  carousel.keybox.width //* carousel.keys[i].column
      })
      .hover(
        function () {
          $(this).css({"background-size": "100%"});
        },
        function () {
          $(this).css({"background-size": "60%"});
        }
      );
    viewport.append(keybox);
    TweenLite.set(keybox, {
      left: -carousel.keybox.width, // * carousel.keys[i].column,
      top: carousel.keys[i].row * carousel.keybox.height
    });
    let lets = $("#bezier").is(":checked") ?
      {//to
        left: length
        , bezier: {
        type: "sharp",
        values: [{x: 60, y: 80}, {x: 150, y: 30}, {x: 400 + Math.random() * 100, y: 320 * Math.random() + 50}, {
          x: 500,
          y: 320 * Math.random() + 50
        }, {x: 700, y: 100}, {x: 850, y: 500}],
        autoRotate: true
      }
        , ease: carousel.easing
        , repeat: -1
      } :
      {//to
        left: length
        , ease: carousel.easing
        , repeat: -1
      };
    
    return new TweenMax(keybox
      , carousel.duration
      , lets);
  }
  
  function buildTimeline(row) {
    let timeline = new TimelineMax({delay: 0, repeat: 0, repeatDelay: -8});
    for (let i = 0; i < carousel.keys.length; i++) {
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
      setTimeout(()=>{
        timeLines[i].timeScale($("#speedValue" + i).val());
        timeLines[i].resume();
      },100);
    }
    
    $(".key").on("click", function (e) {
      let output = $('.output');
      output.val(output.val() + e.currentTarget.innerHTML);
    });
    
    $(".ui-slider").on("input", function (e) {
      let index = $(e.target).attr("index");
      speedValue = $("#speedValue" + index);
      speedSlider = $("#speedSlider" + index);
      
      speedValue.val(speedSlider.val());
      if (speedSlider.val() === 0) {
        timeLines[index].pause();
      }
      else {
        timeLines[index].timeScale(speedSlider.val());
        timeLines[index].resume();
      }
      e.stopPropagation();
    });
    
    $(".value").on("input", function (e) {
      let index = $(e.target).attr("index");
      speedValue = $("#speedValue" + index);
      speedSlider = $("#speedSlider" + index);
      
      speedSlider.val(speedValue.val());
      if (speedSlider.val() === 0) {
        timeLines[index].pause();
      }
      else {
        timeLines[index].timeScale(speedSlider.val());
        timeLines[index].resume();
      }
      e.stopPropagation();
    });
    
    $("#restart").on('click', function (e) {
      e.preventDefault();
      viewport.html("");
      init();
      run();
    });
    
    $("#reverse").on('click', function (e) {
      e.preventDefault();
    });
    
    $(".rnd").on('click', function (e) {
      e.preventDefault();
      alert('UNDER CONSTRUCTION!!! \nOption not available yet...');
    })
  }
  
  // $(window).resize((e) => {
  //     $(`#windowsize`).html(`${e.target.outerWidth} x ${e.target.outerHeight}`);
  // });
  
  init();
  run();
  
});

