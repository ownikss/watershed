window.segmentation = {
  watershed,
  markedWatershed,
};

function checkNeighbors(data, marked, point, width, segments) {
  const chain = [];
  const STACK = [];

  function mark(color, index) {
    marked[index] = color;
    while (chain.length) {
      const z = chain.pop();
      marked[z] = color;
    }
    return color;
  }

  let index = point;
  chain.push(index);

  while (typeof index !== 'undefined') {

    const value = data[index];
    marked[index] = -1;

    const x = index % width;
    const y = Math.round((index - x) / width);

    for (let i = -1; i < 2; i++) {
      for (let j = -1; j < 2; j++) {
        if (x + i < 0 || y + j < 0) {
          continue;
        }

        const k = g.getPixelIndex(width, x + i, y + j);

        if (data[k] <= value && marked[k] === 0) {
          marked[k] = -1;
          STACK.push(k);
          chain.push(k);
        }

        if (marked[k] > 0) {
          return mark(marked[k], index);
        }
      }
    }
    index = STACK.pop();
  }
  if (marked[point] === -1) {
    return mark(++segments, point);
  }
}


function checkNeighbors2(data, marked, point, width, minValue) {
  const value = marked[point];
  const STACK = [];

  let index = point;
  while (typeof index !== 'undefined') {
    const x = index % width;
    const y = Math.round((index - x) / width);

    for (let i = -1; i < 2; i++) {
      for (let j = -1; j < 2; j++) {
        if (x + i < 0 || y + j < 0) {
          continue;
        }

        const k = g.getPixelIndex(width, x + i, y + j);

        if (data[k] <= minValue && marked[k] === 0) {
          marked[k] = value;
          STACK.push(k);
        }
      }
    }
    index = STACK.pop();
  }
}

function drawSegments(canvas, segmentsCount, marked) {
  const q = 255 * 255 * 255 / segmentsCount;

  const colors = marked.map(i => {
    const v = i * q;
    const r = v % 255;
    const g = ((v - r) / 255) % 255;
    const b = Math.trunc(v / 255);
    return [r, g, b];
  });
  g.drawRGBImage(canvas, colors);
}

function watershed(canvas) {
  const data = g.getBlackImage(canvas);

  let segments = 0;
  const marked = new Array(data.length).fill(0);

  for (let i = 0; i <= 255; i += 1) {
    for (let j = 0; j < data.length; ++j) {
      if (data[j] <= i && !marked[j]) {
        let segment = checkNeighbors(data, marked, j, canvas.width, segments);
        segments = Math.max(segment, segments);
      }
    }
  }

  drawSegments(canvas, segments, marked);
}

function markedWatershed(canvas, points) {
  const data = g.getBlackImage(canvas);
  const marked = new Array(data.length).fill(0);
  let min = 255;
  for (let i = 0; i < points.length; i++) {
    const index = g.getPixelIndex(canvas.width, points[i].x, points[i].y);
    if (data[index] < min) {
      min = data[index];
    }
    marked[index] = i + 1;
    checkNeighbors2(data, marked, index, canvas.width);
  }

  for (let i = min; i <= 255; i += 1) {
    for (let j = 0; j < data.length; ++j) {
      if (data[j] <= i && marked[j]) {
        checkNeighbors2(data, marked, j, canvas.width, i);
      }
    }
  }
  drawSegments(canvas, points.length, marked);
}
