"use strict";
//>> switch between "java class and json" and "nt simple string" notations of message format
//>> add nt command {StopFlash:\r\n} - stop in ntstims
//>> add nt command {Flash:flashDuration;nonflashDuration;flashOrder;\r\n} - start in ntstims
//>> add nt command {Reset:\r\n} - no in ntstims
//>> add nt command {Decision:Id;\r\n}
//todo>> add nt command {SetImageSet:\r\n}
//todo>> add nt command {SetMarkerName:\r\n}

const
  {Stimuli, /*Stringifier,*/ NTStimuliStringifier, Tools} = require('mbeeg')
  // , config = Tools.loadConfiguration(`config.json`)
  , config = Tools.loadConfiguration(`../../config.json`)
  , stimuli = new Stimuli({
    duration: config.mbeeg.stimulation.duration
    , pause: config.mbeeg.stimulation.pause
    , stimuliIdArray: config.mbeeg.stimulation.sequence.stimuli
  })
  , colors = require('colors')
  , Net = require('net')
  , ntStringifier = new NTStimuliStringifier({//todo clarify NT stringifiers - make stringify library
    chunkBegin: ``
    , chunkEnd: `\r\n`
    , chunksDelimiter: `,`
    , indentationSpace: 0
    , fields: [
      {name: "timestamp", type: "value"}
      , {name: "cellId", type: "value"}
      , {name: "target", type: "value"}
      , {
        name: "class",
        type: "literal",
        content: "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegEventCellFlashing"
      }
    ]
  })
  , repl = require('repl')
;

/** @namespace config.utilities.ntemulator */
let
  replSrv = {}
  , message = {}
  , running = false
  , mode = config.utilities.ntemulator.messages
;

/** @namespace config.carousel.tcpserver */
const
  server = Net.createConnection(config.carousel.tcpserver.port, config.carousel.tcpserver.host, () => {
    // noinspection JSUnresolvedFunction
    console.log(colors.green(
      `\r\n ... mock neurotrainer started in "${mode}" mode...
        \rto change server configuration use file config.json in the same directory as stims.exe and restart server.\r\n
        \rto get help enter > .help command
        \rto start new stimuli flow enter
        \r> .start [some array of unique stimuli identities]
        \ri.e.
        \r > .start [2,1,3,7]
        \rto stop stimuli flow enter
        \r > .stop
        \r
        \r`));
    
    let //helpers
      writeToServer = (messageToSend, messageToPrompt, messageOnError, callback = () => {}) => {
        if (!messageToSend) {
          replSrv.displayPrompt(true);
          return false;
        }
        if (server.write(messageToSend)) {
          console.log(messageToPrompt);
          callback();
        }
        else {
          console.log(messageOnError);
          //todo>> throw error
          replSrv.displayPrompt(true);
          return false;
        }
        replSrv.displayPrompt(true);
        return true;
      },
      ntOnlyMessage = message => {
        if (mode === 'nt') {
          return message;
        } else {
          console.log(`${message} is not available in current mode ("${mode}")`);
          replSrv.displayPrompt(true);
          return false;
        }
        
      };
    
    let //commands
      start = parameters => {
        try {
          
          if (!parameters) {
            message = `Start:\r\n`;
            writeToServer(
              message,
              `Start:\\r\\n command sent`,
              "Error - can't start keyboard",
            );
            replSrv.displayPrompt(true);
            return true;
          }
          
          let
            parse = parameters.split(/[\s;,]+(?![,\s\d]*])/)
            , sequence = parse[1] === undefined ? JSON.parse(parse[0]) : JSON.parse(parse[2])
            , duration = parse[1] === undefined ? config.mbeeg.stimulation.duration : JSON.parse(parse[0])
            , pause = parse[1] === undefined ? config.mbeeg.stimulation.pause : JSON.parse(parse[1])
          ;
          
          console.log(`duration = ${duration}, pause = ${pause} stimuli sequence = [${sequence}]`);
          if (mode === 'jc') {
            console.log(`typeof message ${typeof message}`);
            message = {};
            message.class = "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSceneSettings";
            message.objects = sequence;
            message = `${JSON.stringify(message)}\r\n`;
          } else if (mode === 'nt') {
            message = `Flash:${duration};${pause};[${sequence}];\r\n`;
          } else {
            console.log(`Error: stimulation start failed - unknown messaging mode selected;`);
            //todo>> throw error
            replSrv.displayPrompt(true);
            return false;
          }
          stimuli
            .bind()
            .reset({
              stimuliIdArray: sequence,
              duration: duration,
              pause: pause
            });
          
          writeToServer(
            message,
            `Flash:${duration};${pause};[${sequence}];\\r\\n sent`,
            `Error: sending the scene settings message is failed.`,
            () => {//pass stimuli to mbeegntsrv
              if (mode === 'jc') {
                if (!running) {
                  stimuli
                    .on('error', error => {throw ` error in stimuli stream - ${error}`;})//todo .on('error',..) to every pipe chain
                    .pipe(ntStringifier)
                    .on('error', error => {throw ` error in ntStringifier - ${error}`;})
                    // .pipe(process.stdout)
                    .pipe(server)// pipe stimuli to mbeeg server
                    .on('error', error => {throw ` error in mbeegntsrv - ${error}`;})
                  ;
                  running = true;
                }
              }
            });
          
          replSrv.displayPrompt(true);
          return true;
          
        } catch (e) {
          console.error(e);
          return false;
        }
      },
      stop = () => {
        if (mode === 'jc') {
          message = {};
          message.class = "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegFlashStop";
          message = `${JSON.stringify(message)}\r\n`
        } else if (mode === 'nt') {
          message = `StopFlash:\r\n`;
        }
        stimuli.unbind();
        stimuli.pause();
        
        return writeToServer(
          message,
          `StopFlash:\\r\\n sent`,
          `Error while stopping of message sending - can't write to the socket. Stimuli stopped but message wasn't send`
        );
        
      },
      messages = (newModeName = '') => {
        if (!newModeName) {
          console.log(`current messaging mode is ${mode}`);
          replSrv.displayPrompt(true);
          return true;
        } else if (newModeName !== 'jc' || newModeName !== 'nt') {
          console.log(`Error: unknown messaging mode selected - message mode should be either "js" or "nt"`);
          //todo>> throw error
          replSrv.displayPrompt(true);
          return false;
        }
        console.log(`stopping current stimuli-flow if it is running.`);
        if (stop()) {
          mode = newModeName;
          console.log(`Messaging mode successfully changed to ${newModeName}.`);
        } else {
          console.log(`Error: Messaging mode hasn't changed - can't stop current messaging.`);
          replSrv.displayPrompt(true);
          return false;
        }
        replSrv.displayPrompt(true);
        return true;
      },
      reset = () => {
        
        writeToServer(
          ntOnlyMessage(`Reset:\r\n`),
          `Reset:\\r\\n sent`,
          `Error while stopping of message sending - can't write to the socket. Stimuli stopped but message wasn't send`
        );
        
        return true;
        
      },
      decision = stimulusId => {
        
        writeToServer(
          ntOnlyMessage(`Decision:${stimulusId};\r\n`),
          `Decision:${stimulusId};\\r\\n sent`,
          `Error while sending mock decision - can't write to the socket`
        );
        
        return true;
      }
    ;
    replSrv = repl.start('> ');
    
    replSrv.defineCommand('start', {
      help: `Start stimulation with given array of stimuli identities`,
      action: start
    });
    replSrv.defineCommand('stop', {
      help: `Stop stimulation`,
      action: stop
    });
    replSrv.defineCommand('messages', {
      help: `Assign messages type:
      \tmessages nt - set messages format to string like "methodName:[Param1;Param2;...;ParamN]\\r\\n";
      \tmessages jc - set messages format to json with java classes`,
      action: messages
    });
    replSrv.defineCommand('reset', {
      help: `Reset visualization stops current stimulation and waits for the next command`,
      action: reset
    });
    replSrv.defineCommand('decision', {
      help: `Send decision with stimuli id to stimulator app`,
      action: decision
    })
  })
;

server
  .on('error', error => {throw error;})
  .on('data', chunk => {
    console.log(chunk.toString());
    replSrv.displayPrompt(true);
  })//data from server - stimuli, decisions e.g.
;
