rem @ echo off
del C:\Users\Boris\YandexDisk\localhost.chrome\distr\bin\mbeeg2nt\*.exe
del C:\Users\Boris\YandexDisk\localhost.chrome\distr\bin\mbeeg2nt\*.zip
call pkg -t node8-win -c package_conf1.json -o ../../distr/bin/nt/stubnt.exe stubnt.js
