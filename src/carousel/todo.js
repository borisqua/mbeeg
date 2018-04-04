//Carousel TCP interface
//>>requests
//>>Start:\r\n - start keyboard
//>>Flash:flashDuration;nonflashDuration;flashOrder;repeatCount\r\n - start stimulation
//>>StopFlash:\r\n - stop stimulation
//>>Reset:\r\n - reset stimulation
//>>Decision:Id\r\n - the decision came

//todo>>responses
//todo>>Flash:Id;Timestamp;Cycle\r\n - stimulus echo
//todo>>FlashDone:


//==================CAROUSEL=====================================
//>> make global.config in main.js and access them from renderers by remote property of electron
//>> change boundaries of speedScale controls to 0-5 with step 0.1
//>> add to console: change size of keybox & auto font-size
//>> add duration control to the motion settings (slider from 1-20 step 1)
//>> add to settings: select images as stimuli
//>> add to console or to settings reverse motion
//todo>> draw UML diagrams for each main, console and keyboard operation
//todo>> Window class - window resizing and moving methods and saving shape and position of the window instance into global config to store window size and position between sessions
//todo>> add start frame shift and last frame shift control with range from -1 to 1 of keybox width

//todo>> add to console random speed motion
//todo>> add to the console window easing select

//todo>> make settings form with accordion left panel
//todo>> transfer settings, that require a reboot, from the console to the settings
//todo>> add to the settings window skin settings (background, borders, font, stimuli(3states), etc.)

//todo>> console should contain only online controls and settings only apply & restart settings

//todo>> use promises, generators, async await functions

//==================MBEEG=====================================
//todo>> controller class with logging functionality
//todo>> working with few channels
//todo>> learning mode
//todo>> SVM
//todo>> SGD SGD
//todo>> replace ..signal.cycles=n parameter to log=false/true

//>> 1. Выбор фона окна Карусели чёрного цвета (сейчас он в полосочку)
//>> 2. Сделать чекбокс реверса движения стимулов в строке
//>> 3. Скорость движения стимулов слайдером регулировать от 0 до 5 единиц с шагом 0.1
//>> 4. Мгновенное исчезновение буквы с одной стороны окна Карусели и её появление с другой стороны окна
//>> 5. Возможность использования произвольных PNG из папки в качестве стимулов. На первое время будет достаточно использовать жёстко зашитое именование файлов стимулов по маске f*.png и nf*.png, где:
//>>   f* - стимул в состоянии подсветки
//>>   nf* - стимул в состоянии паузы
//>>   * - порядковый номер стимула от 1 до 100
//>>   Стимул должен занимать всю площадь его контейнера keybox. Если размер PNG изображения больше, чем размер контейнера keybox, то изображение должно автоматически масштабироваться и вмещаться в keybox. В момент паузы должен отображаться файл nf*.png, в момент подсветки - файл f*.png.
//>> 6. Размер окна карусели должен автоматически устанавливаться, используя параметры в настройках keybox_w, keybox_h, rows, cols:
//>>   window_w = keybox_w * cols
//>>   window_h = keybox_h * rows

//todo>> 7. Внедрить возможность работы с несколькими ЭЭГ-каналами. В этом режиме одна эпоха будет представлять из себя матрицу размером Feat = Ch * Ep, где:
//todo>>   Ch - количество каналов ЭЭГ
//todo>>   Ep - количество семплов в эпохе
//todo>>   В данный момент реализована работа интегрального алгоритма, который не подразумевает работу с несколькими каналами, и матрица сигнала представляет из себя вектор размером Feat = 1 * Ep.
//todo>> 8. Сделать режим тренировки и внедрить линейный классификатор на основе SVM, где входом будет матрица Feat, выходом после тренировки - модель классификатора. В онлайн-режиме матрица входного сигнала Feat будет поступать на вход созданной модели классификации, которая будет выносить вердикт после каждого цикла подсветок. При достижении заданного уровня достоверности, алгоритм принятия решения (АПР) выносит решение о задуманном стимуле.
//todo>> 9. Внедрение АПР SGD, в котором "вес" текущего вердикта зависит от предыдущих вердиктов.

