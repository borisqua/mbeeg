rem @ echo off
del C:\Users\Boris\YandexDisk\localhost.chrome\distr\bin\*.exe
del C:\Users\Boris\YandexDisk\localhost.chrome\distr\bin\mbeeg2nt\*.exe
del C:\Users\Boris\YandexDisk\localhost.chrome\distr\bin\*.zip
del C:\Users\Boris\YandexDisk\localhost.chrome\distr\bin\mbeeg2nt\*.zip
call pkg -t node6-win -c package_conf0.json -o ../../distr/bin/ebml2ov.exe ebml2ov.js
call pkg -t node6-win -c package_conf1.json -o ../../distr/bin/ov2samples.exe ov2samples.js
call pkg -t node6-win -c package_conf1.json -o ../../distr/bin/stims.exe stims.js
call pkg -t node6-win -c package_conf1.json -o ../../distr/bin/mbeeg2nt/ntstims.exe ntstims.js
call pkg -t node6-win -c package_conf2.json -o ../../distr/bin/epochs.exe epochs.js
call pkg -t node6-win -c package_conf2.json -o ../../distr/bin/epochs2files.exe epochs2files.js
call pkg -t node6-win -c package_conf2.json -o ../../distr/bin/features.exe features.js
call pkg -t node6-win -c package_conf1.json -o ../../distr/bin/classify.exe classify.js
call pkg -t node6-win -c package_conf2.json -o ../../distr/bin/whoisthewinner.exe whoisthewinner.js
call pkg -t node6-win -c package_conf2.json -o ../../distr/bin/mbeegsrv.exe mbeegsrv.js
call pkg -t node6-win -c package_conf2.json -o ../../distr/bin/mbeeg2nt/mbeegntsrv.exe mbeegntsrv.js
call pkg -t node6-win -c package_conf0.json -o ../../distr/bin/mbeeg2nt/tcpclient.exe tcpclient.js
