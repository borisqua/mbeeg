@ echo off
rem usage 1. set env.variable DEBUG = *, -not_this, then run mbeegntsrv.exe
rem set DEBUG=utils:*, mbeeg:*, utils:mbeegntsr, mbeeg:Epochs, mbeeg:DSVProcessor, mbeeg:DSHProcessor, mbeeg:EpochSeries, mbeeg:Classifier, mbeeg:Decisions, -mbeeg:EBMLReader

set DEBUG=utils:*, mbeeg:*,-mbeeg:EBMLReader
mbeegntsrv.exe
