"use strict";
const
  fs = require('fs'),
  csv = require('csv-streamify');

let
  n = process.argv,
  stimuli = fs.createWriteStream(`data/integral/stimuli${n[2]}${n[3]}.csv`),
  eeg = fs.createWriteStream(`data/integral/eeg${n[2]}${n[3]}.csv`);

class InpFilesTransformator {
  constructor() {
    this.index = -4;
    this.parser = csv({
      delimiter: `;`,
      columns: true,
      objectMode: true
    });
    this.parser
      .on(`data`, (line) => {
        this.index += 4;
        if (+line.cell_ID) {
          stimuli.write(`${this.index}, ${+line.cell_ID - 1}, ${+line.cell_ID === +n[2] ? 1 : 0}\n`);
          eeg.write(`${this.index}, ${parseFloat(line.PZ.replace(',', '.'))}\n`);
        } else {
          eeg.write(`${this.index}, ${parseFloat(line.PZ.replace(',', '.'))}\n`);
        }
      })
      .on(`end`, () => {
        stimuli.close();
        eeg.close();
      });
    
    fs.createReadStream(`../testEEG/stim${n[2]}/${n[3]}.csv`)
      .pipe(this.parser);
    
  }
}

const filesWriter = new InpFilesTransformator();


