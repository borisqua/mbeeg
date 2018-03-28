rem @ echo off
del C:\Users\Boris\YandexDisk\localhost.chrome\distr\bin\mbeeg2nt\*.exe
del C:\Users\Boris\YandexDisk\localhost.chrome\distr\bin\mbeeg2nt\*.zip
call pkg -t node6-win -c package_conf1.json -o ../../distr/bin/mbeeg2nt/stubnt.exe stubnt.js
call pkg -t node6-win -c package_conf2.json -o ../../distr/bin/mbeeg2nt/mbeegntsrv.exe mbeegntsrv.js
call pkg -t node6-win -c package_conf0.json -o ../../distr/bin/mbeeg2nt/tcpclient.exe tcpclient.js
