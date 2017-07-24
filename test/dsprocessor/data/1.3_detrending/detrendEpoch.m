function [detrend, trend] = detrendEpoch(indata)

%
% (c) vb 2017-03-07
%
% custom detrend of time series data
%
% input:
% indata - time series values vector
%
% output:
% detrend - time series detrend data (the same size as indata)
% trend - time series trend data (the same size as indata)
%
% a =  ( (n * sum(x*y)) - (sum(x) * sum (y)) ) / ( (n * sum(x*x)) - ( sum(x) * sum(x) ) )
%
% b = ( ( sum(y) - (a * sum(x) ) ) / n
%
% where:
% n - length of time series data vector indata. samples
% x - index of single sample in series
% y - value of single sample on index x
%
% Trend formula:
% TREND(y) = x * a + b
%
% Detrend formula:
% DETREND(y) = (y / (x * a + b) - 1) * 100
%

if exist('indata', 'var') == 0 error('No input time series!'); end;

n = length(indata);

sumxy = 0;
for i=1:1:n sumxy = sumxy + i*indata(i); end;

sumx = 0;
for i=1:1:n sumx = sumx + i; end;

sumy = 0;
for i=1:1:n sumy = sumy + indata(i); end;

sumxx = 0;
for i=1:1:n sumxx = sumxx + i*i; end;

a = ( n * sumxy - sumx * sumy ) / ( n * sumxx - sumx*sumx );

b = ( sumy - a*sumx ) / n;

for i=1:1:n 
    trend(i) = i*a + b;
    detrend(i) = ( ( indata(i) / trend(i) ) - 1 ) * 100;
 end;

end


