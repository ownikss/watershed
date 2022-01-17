window.g = {
  getGaussMatrix,
  applyFilter,
  applySobel,
  toBlack,
  getPixelIndex,
  getImagePixelValue,
  getBlackImage,
  drawBlackImage,
  drawRGBImage,
  toBlackByLimit,
  opening,
  closing,
  gradient,
  erosion,
  dilatation,
  applyWeber,
};

const SOBEL_X = [
  [-1, 0, 1],
  [-1, 0, 1],
  [-1, 0, 1],
];
const SOBEL_Y = [
  [-1, -2, -1],
  [0, 0, 0],
  [1, 2, 1],
];

function getGaussMatrix(size = 7, sigma = 0.84089642) {
  const radius = Math.trunc(size / 2);
  const matrix = new Array(size).fill(1).map(() => new Array(size).fill(0));

  function Gauss(x, y) {
    return 1 / (2 * Math.PI * sigma * sigma) * Math.pow(Math.E, -(x * x + y * y) / (2 * sigma * sigma));
  }

  for (let x = -radius; x <= radius; ++x) {
    for (let y = -radius; y <= radius; ++y) {
      matrix[x + radius][y + radius] = Gauss(x, y);
    }
  }
  return matrix;
}

/**
 * Only for one channel array
 * @param width
 * @param x
 * @param y
 * @returns index
 */
function getPixelIndex(width, x, y) {
  return x + y * width;
}

/**
 * Only for one channel array
 * @param data
 * @param width
 * @param x
 * @param y
 * @returns value - channel
 */
function getImagePixelValue(data, width, x, y) {
  return data[getPixelIndex(width, x, y)];
}

function drawBlackImage(canvas, data) {
  const context = canvas.getContext('2d');
  const imageData = context.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < data.length; i++) {
    imageData.data[i * 4] = data[i];
    imageData.data[i * 4 + 1] = data[i];
    imageData.data[i * 4 + 2] = data[i];
    imageData.data[i * 4 + 3] = 255;
  }
  context.putImageData(imageData, 0, 0);
}

function drawRGBImage(canvas, data) {
  const context = canvas.getContext('2d');
  const imageData = context.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < data.length; i++) {
    imageData.data[i * 4] = data[i][0];
    imageData.data[i * 4 + 1] = data[i][1];
    imageData.data[i * 4 + 2] = data[i][2];
    imageData.data[i * 4 + 3] = 255;
  }
  context.putImageData(imageData, 0, 0);
}

function toBlack(canvas) {
  const context = canvas.getContext('2d');
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;

  const imageSize = canvas.width * canvas.height;
  const res = new Array(imageSize);
  for (let i = 0; i < imageSize; ++i) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a = data[i * 4 + 3];
    res[i] = a < 200 ? 255 : Math.round((r + g + b) / 3);
  }
  drawBlackImage(canvas, res);
}

function Weber(i) {
  if (i <= 88) {
    return 20 - 12 * i / 88;
  }
  if (i <= 138) {
    return 0.002 * (i - 88) * (i - 88) + 8;
  }
  return 7 * (i - 138) / (255 - 138) + 13;
}

function applyWeber(canvas) {
  let data = getBlackImage(canvas);
  let i = 0;
  while (i < 255) {
    let min = 255;
    const w_i = Weber(min);
    const max = i + w_i;
    for (let j = 0; j < data.length; j++) {
      if (data[j] < max && data[j] > i) {
        data[j] = i;
      }
      if (data[j] > max && data[j] < min) {
        min = data[j];
      }
    }
    i = min;
  }
  drawBlackImage(canvas, data);
}

function applyToPoint(data, x, y, width, filter) {
  const filterRadius = Math.trunc(filter.length / 2);
  let res = 0;
  for (let i = -filterRadius; i <= filterRadius; ++i) {
    for (let j = -filterRadius; j <= filterRadius; ++j) {
      res += filter[i + filterRadius][j + filterRadius] * getImagePixelValue(data, width, x + i, y + j);
    }
  }
  return res;
}

function getBlackImage(canvas) {
  const context = canvas.getContext('2d');
  const fullData = context.getImageData(0, 0, canvas.width, canvas.height);
  return fullData.data.filter((i, index) => index % 4 === 1);
}

function applyFunctionToImage(canvas, width, fn, padding) {
  const data = getBlackImage(canvas);

  const height = data.length / width;
  const res = [...data];
  for (let y = padding; y <= height - padding; ++y) {
    for (let x = padding; x <= width - padding; ++x) {
      res[getPixelIndex(width, x, y)] = fn(data, x, y, width);
    }
  }
  drawBlackImage(canvas, res);
}

function applyFilter(canvas, filter) {
  const matrixRadius = Math.trunc(filter.length / 2);
  applyFunctionToImage(canvas, canvas.width, (...args) => applyToPoint(...args, filter), matrixRadius);

}

function applySobel(canvas) {
  const matrixRadius = 1;
  applyFunctionToImage(canvas, canvas.width, (...args) => {
    const x = applyToPoint(...args, SOBEL_X);
    const y = applyToPoint(...args, SOBEL_Y);
    return Math.sqrt(x * x + y * y);
  }, matrixRadius);
}

function toBlackByLimit(canvas, limit = 100) {
  const data = getBlackImage(canvas);
  drawBlackImage(canvas, data.map(i => i < limit ? 0 : 255));
}

const S = [
  [1, 1, 1],
  [1, 1, 1],
  [1, 1, 1],
];

function erosion(canvas) {
  const filterRadius = Math.trunc(S.length / 2);
  applyFunctionToImage(canvas, canvas.width, (data, x, y, width) => {
    let max = 0;
    for (let i = -filterRadius; i <= filterRadius; ++i) {
      for (let j = -filterRadius; j <= filterRadius; ++j) {
        const v = S[i + filterRadius][j + filterRadius] * getImagePixelValue(data, width, x + i, y + j);
        max = Math.max(v, max);
      }
    }
    return max;
  }, filterRadius);
}

function dilatation(canvas) {
  const filterRadius = Math.trunc(S.length / 2);
  applyFunctionToImage(canvas, canvas.width, (data, x, y, width) => {
    let min = 255;
    for (let i = -filterRadius; i <= filterRadius; ++i) {
      for (let j = -filterRadius; j <= filterRadius; ++j) {
        const v = S[i + filterRadius][j + filterRadius] * getImagePixelValue(data, width, x + i, y + j);
        min = Math.min(v, min);
      }
    }
    return min;
  }, filterRadius);
}

function opening(canvas) {
  erosion(canvas);
  dilatation(canvas);
}

function closing(canvas) {
  dilatation(canvas);
  erosion(canvas);
}

function gradient(canvas) {
  const filterRadius = Math.trunc(S.length / 2);
  applyFunctionToImage(canvas, canvas.width, (data, x, y, width) => {
    let min = 255;
    let max = 0;
    for (let i = -filterRadius; i <= filterRadius; ++i) {
      for (let j = -filterRadius; j <= filterRadius; ++j) {
        const v = S[i + filterRadius][j + filterRadius] * getImagePixelValue(data, width, x + i, y + j);
        min = Math.min(v, min);
        max = Math.max(v, max);
      }
    }
    return max - min;
  }, filterRadius);

}
