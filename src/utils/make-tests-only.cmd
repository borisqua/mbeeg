rem @ echo off
del C:\Users\Boris\YandexDisk\localhost.chrome\distr\bin\test\*.exe
del C:\Users\Boris\YandexDisk\localhost.chrome\distr\bin\test\*.zip
call pkg -t node6-win -c package_conf1.json -o ../../distr/bin/test/decisions.exe ../../test/decisions.js
