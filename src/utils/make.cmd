rem @ echo off
call pkg -t node6-win -c package_conf0.json -o ../../distr/ebml2ov.exe ebml2ov.js
call pkg -t node6-win -c package_conf1.json -o ../../distr/ov2samples.exe ov2samples.js
call pkg -t node6-win -c package_conf1.json -o ../../distr/stims.exe stims.js
call pkg -t node6-win -c package_conf1.json -o ../../distr/mbeeg2nt/ntstims.exe ntstims.js
call pkg -t node6-win -c package_conf2.json -o ../../distr/epochs.exe epochs.js
call pkg -t node6-win -c package_conf2.json -o ../../distr/epochs2files.exe epochs2files.js
call pkg -t node6-win -c package_conf2.json -o ../../distr/features.exe features.js
call pkg -t node6-win -c package_conf1.json -o ../../distr/classify.exe classify.js
call pkg -t node6-win -c package_conf2.json -o ../../distr/whoisthewinner.exe whoisthewinner.js
call pkg -t node6-win -c package_conf2.json -o ../../distr/mbeegsrv.exe mbeegsrv.js
call pkg -t node6-win -c package_conf2.json -o ../../distr/mbeeg2nt/mbeegntsrv.exe mbeegntsrv.js
call pkg -t node6-win -c package_conf0.json -o ../../distr/mbeeg2nt/tcpclient.exe tcpclient.js
