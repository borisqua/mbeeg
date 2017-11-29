# mbEEG 0.0.0

js tools and library to prepare and classify EEG dataflow from 
openViBE acquisition server and associated by timestamps with 
stimuli dataflow from some stimuli source by abstract interface

## Contents
1. Structure
    1. Core
       1. Signal 
       2. Stimuli
       3. Epoching & DSP
       4. Featuring & horizontal processing
       5. Classification
       6. Decision making 
    2. Tools
       1. EBML
       2. openViBE streams
    3. GUI
       1. Main window
       2. Carousel keyboard
       3. Configuration window (Console)
2. mbEEG
2. Utilities

## todo

### Core
#### DSVProcessor
1. ~~Test on gauge dataset~~
2. ~~Pipe stimuli from keyboard~~
3. Using external Math/Stat/NN libraries
 
#### keyboard
 
#### controller
1. ~~Stimuli set loader~~
    - stimuli set data structure
      - ~~alphabet~~
      - special symbols
      - macros
      - commands & functions
      - phrases
1. Stimuli generator
    - ~~console-keyboard IPC~~
    - data structure that describes stimulation scheme
      - dimensions: simple, rc, md
      - learning sequence type (consecutive, word driven)
      - stimulation sequence type:
        1. random without repetitions
        2. random with more frequent repetitions of stimulus with higher choice probability (on prediction base)
        3. ... any other with some specific order (chessboard e.g.)
    - Stimulator class 
      - generates stimuli sequences in accordance to stimulation scheme 
      - visualizes stimuli by changing css properties of elements that represent keyboard keys
      - highlights targets in accordance to learning sequence type
      - write stimuli dataflow into public readable stream 
1. Evaluation
1. Learning
 
#### ebml
1. ~~Parser/Reader~~
2. Coder/Writer