rem @ echo off
call pkg -t node6-win -c package_conf0.json -o ../ebml2ov.exe ebml2ov.js
call pkg -t node6-win -c package_conf1.json -o ../ov2samples.exe ov2samples.js
call pkg -t node6-win -c package_conf1.json -o ../stims.exe stims.js
call pkg -t node6-win -c package_conf1.json -o ../ntstims.exe ntstims.js
call pkg -t node6-win -c package_conf2.json -o ../epochs.exe epochs.js
call pkg -t node6-win -c package_conf2.json -o ../features.exe features.js
call pkg -t node6-win -c package_conf1.json -o ../classify.exe classify.js
call pkg -t node6-win -c package_conf2.json -o ../whoisthewinner.exe whoisthewinner.js
call pkg -t node6-win -c package_conf2.json -o ../mbeegsrv.exe mbeegsrv.js
call pkg -t node6-win -c package_conf2.json -o ../mbeegntsrv.exe mbeegntsrv.js
call pkg -t node6-win -c package_conf0.json -o ../tcpclient.exe tcpclient.js
