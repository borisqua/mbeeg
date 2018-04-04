"use strict";
const
  net = require('net')
  , fs = require('fs')
  , {EBMLReader, OVReader, Epochs, DSVProcessor, EpochSeries, DSHProcessor, Tools, Stringifier, Classifier, Decisions} = require('mbeeg')
  , stringifier = new Stringifier({chunkEnd: `\r\n`})
  , {app, BrowserWindow, Menu, ipcMain, globalShortcut} = require('electron')
  , template = require('./menu')
  , window = require('./window')
  , stimuli = new require('stream').PassThrough({objectMode: true})//todo?? why two stimuli
  , ntFlashes = new require('stream').Transform({
    objectMode: true,
    transform(chunk, encoding, cb) {
      cb(null, `Flash:${chunk[1]};${chunk[0]}\r\n`);//;${chunk[3]}-cycle
    }
  })
;

global.config = Tools.loadConfiguration(`config.json`);

let
  winMain, winKeyboard, winConsole //winDebuggerLog;// Keep a global reference of the windows objects, if you don't, the window will be closed automatically when the JavaScript object is garbage collected.
  , menuTemplate = Menu.buildFromTemplate(template)
  , forceCloseApp = false
  , keyboardRuns = false
  , keyboardHidden = true
  , internalMbeegAvailable = false
;

const
  isSecondInstance = app.makeSingleInstance((commandLine, workingDirectory) => {
    if (winMain) {
      if (winMain.isMinimized()) winMain.restore();
      winMain.focus();
    }
  })
;
// let
//   openVibe = require('child_process').execFile
//   , executablePath = "C:\\Program Files (x86)\\openvibe\\openvibe-acquisition-server.cmd"
// ;
const
  openVibeClient = new net.connect(config.mbeeg.signal.port, config.mbeeg.signal.host)
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
    ebmlSource: openVibeClient
    , ebmlCallback: tcp2ebmlFeeder
  })
  , samples = new OVReader()
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

openVibeClient//todo>> display information about connection to openViBE, mbeeg mode & stimulation mode in the main window
  .on('error', e => {
    // console.error(`${JSON.stringify(e, null, 2)}`);
  })
  .on('connect', () => {
    console.log(`Socket for OpenViBE Acquisition Server has established at ${openVibeClient.address().address}:${openVibeClient.address().port}`);
  })
;

//openViBE acquisition server is required so run it first
// openVibe(executablePath, function (err, data) {
//   if (err) {
//     console.error(err);
//   }
// });

if (!config.mbeeg.tcpserver.active) {//then run internal mbeeg server
  internalMbeegAvailable = true;
  app //run internal mbeeg if mbeeg over tcp disabled
    .on('activate', () => {//for macOS system event << entry point here
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      epochs
        .pipe(butterworth4)
        .pipe(detrend)
        .pipe(epochSeries)
        .pipe(features)
        .pipe(classifier)
        .pipe(decisions)
        .pipe(stringifier)
        .pipe(process.stdout);
    })
    .on('ready', () => {//<< entry point here
      // stimuli.pause();
      epochs //<< run internal mbeeg decision cycle
        .pipe(butterworth4)
        .pipe(detrend)
        .pipe(epochSeries)
        .pipe(features)
        .pipe(classifier)
        .pipe(decisions)
        .pipe(stringifier)
        .pipe(process.stdout)
      ;
    });
  
  decisions.on('data', decision => {
    winKeyboard.webContents.send(`ipcApp-decision`, decision);
  });
  
  ipcMain
    .on(`ipcKeyboard-command`, (e, command) => {
      switch (command) {
        case "stimulationChange":
          epochs.reset(config.mbeeg.stimulation.sequence.stimuli.length);
          epochSeries.reset(config.mbeeg.stimulation.sequence.stimuli);
          break;
        default:
      }
    });
}
else {
  const
    serverForNT = net.createServer(socket => {
        console.log(`client ${socket.remoteAddress}:${socket.remotePort} connected`);
        //todo>> handling client connections and disconnections
        socket
          .on(`end`, () => {
            stimuli.unpipe();
            winKeyboard.webContents.send(`ipcConsole-command`, `keyboardStop`);
            console.log('end: client disconnected');
          })
          .on(`close`, () => {
            stimuli.unpipe();
            winKeyboard.webContents.send(`ipcConsole-command`, `keyboardStop`);
            console.log('close: client disconnected');
          })
          .on(`error`, () => {
            stimuli.unpipe();
            winKeyboard.webContents.send(`ipcConsole-command`, `keyboardStop`);
            console.log('error: client disconnected');
          })
          .on('data', chunk => {
            let
              messages = chunk.toString().split(`\r\n`).filter(e => /[^\r\n\s]/.test(e) && !!e)
              , request = "none"
              , response = "none"
            ;
            for (let m = 0; m < messages.length; m++) {
              if (messages[m]) {
                
                try {
                  let
                    action = messages[m].split(':')[0],
                    params = messages[m].split(":").filter(e => /[^\r\n\s]/.test(e) && !!e).length > 1 ?
                      messages[m]
                        .split(':').filter(e => /[^\r\n\s]/.test(e) && !!e)[1]
                        .split(';').filter(e => /[^\r\n\s]/.test(e) && !!e)
                        .map(e => JSON.parse(e))
                      : []
                  ;
                  
                  //translating commands received by tcp into ipcConsole commands
                  switch (action) {
                    case "Ping":
                      request = "Ping";
                      response = "200 OK\r\n";// Stimulation started
                      break;
                    case "Start":
                      winKeyboard.show();
                      response = "200 OK\r\n";// Keyboard started
                      break;
                    case "Flash":
                      config.mbeeg.stimulation.duration = params[0] > 0 ? params[0] : config.mbeeg.stimulation.duration;
                      config.mbeeg.stimulation.pause = params[1] > 0 ? params[1] : config.mbeeg.stimulation.pause;
                      config.mbeeg.stimulation.sequence.stimuli = Array.isArray(params[2]) ? params[2] : config.mbeeg.stimulation.sequence.stimuli;
                      winKeyboard.webContents.send(`ipcConsole-command`, "stimuliChange");
                      request = "keyboardStart";
                      response = "200 OK\r\n";// Stimulation started
                      break;
                    case "Reset":
                      winKeyboard.webContents.send(`ipcConsole-command`, "keyboardStop");
                      request = "keyboardRestart";
                      response = "200 OK\r\n";// Keyboard reset was successful
                      break;
                    case "StopFlash":
                      request = "keyboardStop";
                      response = "200 OK\r\n";// Stimulation stopped
                      break;
                    case "Decision":
                      winKeyboard.webContents.send(`ipcApp-decision`, params[0]);
                      response = "200 OK\r\n";// the decision was successfully came
                      break;
                    default:
                      request = "command undefined";
                      response = "409 wrong command\r\n";
                  }
                  winKeyboard.webContents.send(`ipcConsole-command`, request);
                } catch (e) {
                  console.error(e);
                  response = "500 internal error";
                } finally {
                  socket.write(response);
                }
              }
            }
          });
        serverForNT.getConnections((err, count) => {
          console.log(`Connections count is ${count}`);
          if (count === 1) {//first connection
            stimuli.pipe(ntFlashes).pipe(socket);
          }
        });
      })
      .listen({port: config.carousel.tcpserver.port, host: config.carousel.tcpserver.host, exclusive: true}, () => {
        console.log(`\r\n ... carousel nt TCP server started at ${config.carousel.tcpserver.host}:${config.carousel.tcpserver.port} ...\n`);
      })
      .on('close', () => {
        console.log(`carousel nt sever closed.`)
      })
  ;
  
}

/**
 * create application windows and run them all in hidden mode (except winMain)
 */
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
  
  winConsole = window({
    // width: 900,
    // height: 950 + config.carousel.keyboard.viewport.rows * 32,
    // parent: winMain,
    // frame: false,//production
    show: false,
    url: "gui/console/index.html"
  });
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
  // winConsole.setMenu(null);//production
  
  winKeyboard = window({
    width: config.carousel.keyboard.keybox.width * config.carousel.keyboard.viewport.columns + 50,
    height: config.carousel.keyboard.keybox.height * config.carousel.keyboard.viewport.rows + 250,
    show: false,
    url: 'gui/keyboard/index.html'
  });
  
  // winKeyboard.toggleDevTools();
  
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
        if (internalMbeegAvailable) {
          epochs.reset(config.mbeeg.stimulation.sequence.stimuli.length);
          epochSeries.reset(config.mbeeg.stimulation.sequence.stimuli);
        }
        winMain.focus();
      }
    })
  ;
  
}

app //<< entry point is in the .on('ready', callback)
  .on('will-quit', () => globalShortcut.unregisterAll())
  .on('activate', () => {//for macOS system event  << entry point here
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (winMain === null) {
      createWindows();
    }
  })
  .on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') { app.quit() }
  })
  .on('ready', () => {//<< entry point here
    
    createWindows(); //<< then create all application windows and show main window
    
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

// main messages selector
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
    if (!keyboardHidden) {
      stimuli.write(stimulus);
    }
  })
  .on(`ipcKeyboard-command`, (e, command) => {
    switch (command) {
      default:
        winMain.webContents.send(`ipcKeyboard-command`, command);
        winConsole.webContents.send(`ipcKeyboard-command`, command);
        break;
    }
  })
  .on(`ipcConsole-command`, (e, command) => {
    winMain.webContents.send(`ipcConsole-command`, command);
    winKeyboard.webContents.send(`ipcConsole-command`, command);
  });

//only one instance permitted
if (isSecondInstance) { app.quit(); }

