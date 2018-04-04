function pad(l, v) {// l - length of zero-leading string number, v - number value
  return new Array(l).fill(0).concat(v).join('').substr(v.toString().length > l ? -v.toString().length : -l);
}

function getAverageRGB(imgEl) {
  
  let blockSize = 5, // only visit every 5 pixels
    defaultRGB = {r: 0, g: 0, b: 0}, // for non-supporting envs
    canvas = document.createElement('canvas'),
    context = canvas.getContext && canvas.getContext('2d'),
    data, width, height,
    i = -4,
    length,
    rgb = {r: 0, g: 0, b: 0},
    count = 0;
  
  if (!context) {
    return defaultRGB;
  }
  
  height = canvas.height = imgEl.naturalHeight || imgEl.offsetHeight || imgEl.height;
  width = canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || imgEl.width;
  
  context.drawImage(imgEl, 0, 0);
  
  try {
    data = context.getImageData(0, 0, width, height);
  } catch (e) {
    /* security error, img on diff domain */
    return defaultRGB;
  }
  
  length = data.data.length;
  
  while ((i += blockSize * 4) < length) {
    ++count;
    rgb.r += data.data[i];
    rgb.g += data.data[i + 1];
    rgb.b += data.data[i + 2];
  }
  
  // ~~ used to floor values
  rgb.r = ~~(rgb.r / count);
  rgb.g = ~~(rgb.g / count);
  rgb.b = ~~(rgb.b / count);
  
  return rgb;
  
}

// returns a map counting the frequency of each color
// in the image on the canvas
function getColors(c) {
  let col, colors = {};
  let pixels, r, g, b, a;
  r = g = b = a = 0;
  pixels = c.getImageData(0, 0, c.width, c.height);
  for (let i = 0, data = pixels.data; i < data.length; i += 4) {
    r = data[i];
    g = data[i + 1];
    b = data[i + 2];
    a = data[i + 3]; // alpha
    // skip pixels >50% transparent
    if (a < (255 / 2))
      continue;
    col = rgbToHex(r, g, b);
    if (!colors[col])
      colors[col] = 0;
    colors[col]++;
  }
  return colors;
}

function rgbToHex(r, g, b) {
  if (r > 255 || g > 255 || b > 255)
    throw "Invalid color component";
  return ((r << 16) | (g << 8) | b).toString(16);
}
