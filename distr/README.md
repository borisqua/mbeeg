# mbEEG 1.0.0

Сервер и набор утилит для анализа EEG сигнала

Комплект утилит представляет из себя скомпилированные модули mbeeg оформленные в 
виде самостоятельных приложений.
Конфигурирование всех модулей осуществляется с помощью файла config.json.
Использование данных компонент возможно также в виде библиотеки классов node.js, а также
в виде сервисов TCP сервера mbEEG (mbeegsrv.exe). В текущей сборке сервер выдаёт три потока 
- стимулы, суммы по каналам, вердикты и решения.
Каждый из модулей может принимать/выдавать потоки различными способами 
мной протестированы IPC, TCP, node.sj Stream, stderr/stdin/stdout

Порядок работы модулей в составе mbeeg следующий:
- парсинг входящего бинарного EBML потока в json OpenViBE Stream поток
- парсинг OpenViBE Stream потока и преобразование его в поток сэмплов ЭЭГ
- формирование эпох представляющих собой отрезки сэплов ЭЭГ синхронизированных по времени с идентификаторами стимулов, 
в процессе нарезки данные ЭЭГ подвергаются обработке методами DSP
- формирование фич из данных эпох, фичи представляют собой совокупности данных готовых для распознавания/классификации/распознавания
- классификация данных фич и формирование вердиктов, представляющих собой нормированные векторы весов стимулов полученные в результате работы
алгоритма классификатора.
- получение вердикта, выбор стимула победителя на основании обработки серии вердиктов.

## 1. Парсинг ebml

````
> ebml2ov.exe
````
(Без параметров, параметры входного потока ebml задаются в config.json)*
	
На входе бинарный ebml поток от OpenViBE acquisition server по TCP через 1024 порт

На выходе openvibe Stream в виде JSON

## 2. Организация входных потоков
#### 2.1 Парсинг ovStream.
  
````
> ov2samples -h
  
  Usage: ov2samples <option>

  openViBE json stream parser. Gets json ovStream and puts samples into stdout.


  Options:

    -V, --version  output the version number
    -p, --pipe     Get ovStream from stdin through pipe
    -j, --json     Outputs json wrapped vectors
    -h, --help     output usage information
````
На входе OpenViBE stream

На выходе поток сэмплов eeg сигнала.
	
#### 2.2 Стимулы

````
> stims.exe -h
  
  Usage: stims <option>

  Generate sequence of randomly arranged stimuli, and pipes it to stdout


  Options:

    -V, --version       output the version number
    -p, --plain         Outputs plain vectors strings
    -j, --json          Outputs json wrapped vectors
    -n, --neurotrainer  Outputs wrapped with Neuro Trainer specific json
    -h, --help          output usage information
````

В данной версии массив стимулов задается в файле конфигурации config.json

Возможна реализация передачи массива стимулов как при вызове модуля, так и путём передачи потока.

На выходе поток стимулов с таймстэмпами и таргет-флагами
Возможен вывод в различных форматах:
- плоский формат в виде csv векторов
- json формат 
- json формат с описание java классов, в виде описанном в документе "Протокол взаимодействия с mbeeg v3.odt"
		
## 3. Эпохи

````
> epochs <option>

  Epochs generator. Gets stimuli & samples flows and produces stream of json epoch objects.


  Options:

    -V, --version   output the version number
    -c, --channels  Outputs activity by channels
    -e --epochs     Outputs json epoch-objects
    -p --pipe       Gets stimuli flow from stdin through pipe
    -h, --help      output usage information
````

формируются из входных потоков стимулов и сэмплов путём синхронизации их по таймстэмпу с последующим DSP процессингом (вертикальный процессинг).
	
Передачу стимулов можно организовать внешним потоком через pipe.

По умолчанию эпохи используют стимулы описанные в файле config.json
На выходе эпохи. Возможно организовать вывод эпох до фильтрации, после фильтрации, до детрендинга, после и т.д. и т.п.
путём комбинирования значения параметра `dspsteps` файла config.json
````
...
"dspsteps":"filter, detrend, rereference"
...
````
	
В текущей версии реализована фильтрация lowpass Butterworh 4 пор-ка, 1 вариант дереференсинга и 1 вариант детрендинга. 

Существует возможность использования любых внешних DSP библиотек python или js
	
## 4. Фичи

````
> features.exe

  Usage: features [option]

  Features generator. Gets epoch flow and produces stream of features ready to classification.


  Options:

    -V, --version  output the version number
    -p --pipe      Gets epochs flow from stdin through pipe
    -i --internal  Gets epochs flow from source defined in config.json file
    -j --json      Wraps features array into json.
    -h, --help     output usage information
````

Формируются путём усреденния каждных 5 смежных эпох, существует возможность изменять данную глубину усреднения в файле config.json,
а также испозьзовать другие методы получения образов для классификации/распознавания (горизонтальный процессинг)
	
## 5. Классификация

````
> classify.exe

  Usage: classify [option]

  Gets features flow and produces stream of verdicts with weights of each stimulus that characterizes the probability of choice.


  Options:

    -V, --version       output the version number
    -p --pipe           Gets epochs flow from stdin through pipe
    -i --internal       Gets epochs flow from source defined in config.json file
    -j --json           Wraps features array into json.
    -n, --neurotrainer  Outputs wrapped into Neuro Trainer specific json
    -h, --help          output usage information
````

На входе у классификатора поток подготовленных на предыдущем этапе "фич" либо поток фич организованный из вне с помощью pipe
На выходе поток матриц с весовыми коэффициентами характеризующими вероятность выбора пользователем стимула - так называемый вердикт.
Возможен вывод вердитка в различных форматах:
- плоский формат в виде csv векторов
- json формат 
- json формат с описанием java классов, в виде описанном в документе "Протокол взаимодействия с mbeeg v3.odt"

## 6. Принятие решения о выборе

````
> whosthewinner.exe

  Usage: whosthewinner [option]

  Analyzing verdicts stream and making decision wick of keys had been chosen.
  

  Options:

    -V, --version  output the version number
    -p --pipe      Gets epochs flow from stdin through pipe
    -i --internal  Gets epochs flow from source defined in config.json file
    -j --json      Wraps features array into json.
    -h, --help     output usage information
````

На входе поток вердиктов, который обрабатывается с помощью алгоритма принятия решения. В текущей реализации используется алгоритм majority,
но возможно и использование алгоритма SGD. Используемый алгоритм настраивается с помощью файла config.json

Вывод возможен в скалярном виде (целое число - идендитифкатор выбранного стимула) или в формате json.
	
