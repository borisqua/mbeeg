"use strict";
const
  {EBMLReader, OVReader, Epochs, DSVProcessor, EpochSeries, DSHProcessor, Tools, Stringifier, Classifier, Decisions} = require('mbeeg')
  , stringifier = new Stringifier({chunkEnd: `\r\n`})
  , {app, BrowserWindow, Menu, ipcMain, globalShortcut} = require('electron')
  , template = require('./menu')
  , window = require('./window')
;
let
  winMain, winKeyboard, winConsole //winDebuggerLog;// Keep a global reference of the windows objects, if you don't, the window will be closed automatically when the JavaScript object is garbage collected.
  , menuTemplate = Menu.buildFromTemplate(template)
  , forceCloseApp = false
  , keyboardRuns = false
  , keyboardHidden = true
  // , openVibe = require('child_process').execFile
  // ,executablePath = "C:\\Program Files (x86)\\openvibe\\openvibe-acquisition-server.cmd"
;

global.config = Tools.loadConfiguration(`config.json`);

const
  Net = require('net')
  , fs = require('fs')
  , openVibeClient = new Net.Socket() //3. Create TCP client for openViBE eeg data server
  , tcp2ebmlFeeder = (context, tcpchunk) => {//todo rewrite this with closure (instead of context parameter use privateContext closure variable)
    if (context.tcpbuffer === undefined) {
      context.tcpbuffer = Buffer.alloc(0);
      context.tcpcursor = 0;
    }
    context.tcpbuffer = Buffer.concat([context.tcpbuffer, tcpchunk]);
    let bufferTailLength = context.tcpbuffer.length - context.tcpcursor;
    while (bufferTailLength) {
      if (!context.expectedEBMLChunkSize && bufferTailLength >= 8) {
        context.expectedEBMLChunkSize = context.tcpbuffer.readUIntLE(context.tcpcursor, 8);//first Uint64LE contains length of ebml data sent by openViBE
        context.tcpcursor += 8;
        bufferTailLength -= 8;
      }
      else if (!context.expectedEBMLChunkSize)
        break;
      if (bufferTailLength >= context.expectedEBMLChunkSize) {
        context.ebmlChunk = Buffer.from(context.tcpbuffer.slice(context.tcpcursor, context.tcpcursor + context.expectedEBMLChunkSize));
        context.tcpcursor += context.expectedEBMLChunkSize;
        bufferTailLength -= context.expectedEBMLChunkSize;
        context.expectedEBMLChunkSize = 0;
      } else
        break;
      context.write(context.ebmlChunk);
    }
    if (!bufferTailLength) {
      context.tcpbuffer = Buffer.alloc(0);
      context.tcpcursor = 0;
    }
  }
  , openVibeJSON = new EBMLReader({
    ebmlSource: openVibeClient.connect(config.mbeeg.signal.port, config.mbeeg.signal.host, () => {})
    , ebmlCallback: tcp2ebmlFeeder
  })
  , samples = new OVReader()
  , stimuli = new require('stream').PassThrough({objectMode: true})
  , epochs = new Epochs({
    stimuli: stimuli
    , samples: openVibeJSON.pipe(samples)
    , cycleLength: config.mbeeg.stimulation.sequence.stimuli.length
    , channels: config.mbeeg.signal.channels
    , epochDuration: config.mbeeg.signal.epoch.duration
  })
  , butterworth4 = new DSVProcessor({
    method: Tools.butterworth4Bulanov
    , parameters: config.mbeeg.signal.dsp.vertical.methods.butterworth4Bulanov
  })
  , detrend = new DSVProcessor({
    method: Tools.detrend
    , parameters: config.mbeeg.signal.dsp.vertical.methods.detrendNormalized
  })
  , epochSeries = new EpochSeries({
    stimuliIdArray: config.mbeeg.stimulation.sequence.stimuli
    , depthLimit: config.mbeeg.decision.methods.majority.maxCycles
  })
  , features = new DSHProcessor({
    method: samples => samples.reduce((a, b) => a + b) / samples.length
  })
  , classifier = new Classifier({
    method: Tools.absIntegral
    , parameters: config.mbeeg.classification.methods.absIntegral
    , postprocessing: Tools.normalizeVectorBySum
  })
  , decisions = new Decisions({
    method: Tools.majorityDecision
    , parameters: config.mbeeg.decision.methods.majority
  })
;

function createWindows() {
  // Menu.setApplicationMenu(menu);
  
  winMain = window({
    width: 800,
    height: 600,
    show: false,
    url: "gui/main/index.html"
  });
  winMain.setMenu(menuTemplate);
  winMain
    .on(`close`, () => {
      fs.writeFile(`config.json`, JSON.stringify(config, null, 2), err => { if (err) throw err; });
      forceCloseApp = true;
      keyboardRuns = false;
      app.quit();
    })
    .on('ready-to-show', () => {
      winMain.show();
    })
  ;
  // winMain.toggleDevTools();
  winKeyboard = window({
    width: config.carousel.keyboard.keybox.width * config.carousel.keyboard.viewport.columns + 50,
    height: config.carousel.keyboard.keybox.height * config.carousel.keyboard.viewport.rows + 250,
    show: false,
    url: 'gui/keyboard/index.html'
  });
  // winKeyboard.toggleDevTools();
  winKeyboard.hide();
  keyboardHidden = true;
  // winKeyboard.setMenu(null);//production
  winKeyboard
    .on(`show`, () => {
      keyboardHidden = false;
      keyboardRuns = true;
      stimuli.resume();
      
    })
    .on(`close`, e => {
      if (!forceCloseApp) {
        e.preventDefault();
        keyboardHidden = true;
        winKeyboard.hide();
        stimuli.pause();
        epochs.reset(config.mbeeg.stimulation.sequence.stimuli.length);
        epochSeries.reset(config.mbeeg.stimulation.sequence.stimuli);
        winMain.focus();
      }
    })
  ;
  
  winConsole = window({
    // width: 900,
    // height: 950 + config.carousel.keyboard.viewport.rows * 32,
    // parent: winMain,
    // frame: false,//production
    show: false,
    url: "gui/console/index.html"
  });
  // winConsole.setMenu(null);//production
  winConsole.on(`close`, (e) => {
    if (!forceCloseApp) {
      e.preventDefault();
      winConsole.hide();
      if (keyboardHidden)
        winMain.focus();
      else
        winKeyboard.focus();
    }
  });
}

//openViBE acquisition server is required so run it first
// openVibe(executablePath, function(err, data) {
//     if(err){
//        console.error(err);
//        return;
//     }
// });

// noinspection JSUnusedLocalSymbols
const isSecondInstance = app.makeSingleInstance((commandLine, workingDirectory) => {
  if (winMain) {
    if (winMain.isMinimized()) winMain.restore();
    winMain.focus();
  }
});
if (isSecondInstance) { app.quit(); }

app
  .on('will-quit', () => globalShortcut.unregisterAll())
  .on('activate', () => {//for macOS system event
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (winMain === null) {
      epochs
        .pipe(butterworth4)
        .pipe(detrend)
        .pipe(epochSeries)
        .pipe(features)
        .pipe(classifier)
        .pipe(decisions)
        .pipe(stringifier)
        .pipe(process.stdout);
      createWindows();
    }
  })
  .on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') { app.quit() }
  })
  .on('ready', () => {
    stimuli.pause();
    epochs
      .pipe(butterworth4)
      .pipe(detrend)
      .pipe(epochSeries)
      .pipe(features)
      .pipe(classifier)
      .pipe(decisions)
      .pipe(stringifier)
      .pipe(process.stdout)
    ;
    createWindows();
    
    globalShortcut.register(`CommandOrControl+W`, () => {
      BrowserWindow.getFocusedWindow().close();
    });
    globalShortcut.register(`CommandOrControl+Shift+K`, () => {
      winKeyboard.show();
    });
    globalShortcut.register(`CommandOrControl+Shift+C`, () => {
      winConsole.show();
    })
    
  })
;

decisions.on('data', decision => {
  winKeyboard.webContents.send(`ipcApp-decision`, decision);
});

ipcMain
  .on(`ipcMain-message`, (e, arg) => {//asynchronous-message
    switch (arg) {
      case 'keyboardLaunch':
        // winKeyboard.setFullScreen(!winKeyboard.isFullScreen());
        winKeyboard.show();
        break;
      case 'consoleLaunch':
        winConsole.show();
        break;
    }
  })
  .on(`ipcKeyboard-stimulus`, (e, stimulus) => {
    if (!keyboardHidden)
      stimuli.write(stimulus);
  })
  .on(`ipcKeyboard-change`, (e, arg) => {
    epochs.reset(config.mbeeg.stimulation.sequence.stimuli.length);
    epochSeries.reset(config.mbeeg.stimulation.sequence.stimuli);
  })
  .on(`ipcConsole-command`, (e, command) => {
    winMain.webContents.send(`ipcConsole-command`, command);
    winKeyboard.webContents.send(`ipcConsole-command`, command);
  });

