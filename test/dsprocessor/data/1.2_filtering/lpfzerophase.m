function outdata = lpfzerophase(indata,Samplingrate,CutOff)

%
% (c) vb 2017-03-05
%
% lowpass fourth order Butterworth filter with zero-phase
% (or forward-backward filtering)
%
% input:
% indata - time series values vector
% Samplingrate - timeseries sampling rate, Hz
% CutOff - low pass cut off freq, Hz
%
% output:
% outdata - time series filtered data (the same siza as indata)
%
%
%
% Code based on:
%//--------------------------------------------------------------------------
%// This function returns the data filtered. Converted to C# 2 July 2014.
%// Original source written in VBA for Microsoft Excel, 2000 by Sam Van
%// Wassenbergh (University of Antwerp), 6 june 2007.
%//--------------------------------------------------------------------------
% https://www.codeproject.com/Tips/1092012/A-Butterworth-Filter-in-Csharp
%

if isempty(indata) outdata = []; end;
if CutOff == 0 outdata = indata; end;
if exist('Samplingrate','var') == 0 error('No Samplingrate given!'); end;

dF2 = length(indata) - 1;
Dat2 = zeros(1,dF2+4);
data = indata;
for r = 0:1:dF2 Dat2(3+r) = indata(r+1); end;
Dat2(2) = indata(1);
Dat2(1) = indata(1);
Dat2(dF2+4) = indata(dF2+1);
Dat2(dF2+3) = indata(dF2+1);

pi = 3.14159265358979;
%wc = tan(CutOff * pi / Samplingrate); % tangent via function

w = (CutOff * pi / Samplingrate);
wc = w + (w*w*w)/3 + (w*w*w*w*w)*2/15; % tangent via calc (Maclaurin series)

k1 = 1.414213562 * wc; % Sqrt(2) * wc
k2 = wc * wc;
a = k2 / (1 + k1 + k2);
b = 2 * a;
c = a;
k3 = b / k2;
d = -2 * a + k3;
e = 1 - (2 * a) - k3;

% RECURSIVE TRIGGERS - ENABLE filter is performed (first, last points constant)
DatYt = zeros(1, dF2+5);
DatYt(2) = indata(1);
DatYt(1) = indata(1);
for s = 2:1:dF2+2
    DatYt(s+1) = a * Dat2(s+1) + b * Dat2(s) + c * Dat2(s-1) ...
        + d * DatYt(s) + e * DatYt(s-1);
end;
DatYt(dF2+4) = DatYt(dF2+2);
DatYt(dF2+3) = DatYt(dF2+2);

% FORWARD filter
DatZt = zeros(1, dF2+3);
DatZt(dF2+1) = DatYt(dF2+3);
DatZt(dF2+2) = DatYt(dF2+4);
for t = -dF2+1:1:0
    DatZt(-t+1) = a * DatYt(-t+3) + b * DatYt(-t+4) + c * DatYt(-t+5) ...
        + d * DatZt(-t+2) + e * DatZt(-t+3);
end;

% Calculated points copied for return
for p = 0:1:dF2 outdata(p+1) = DatZt(p+1); end;

end
