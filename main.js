function loadImage(canvas, file) {
  return new Promise(resolve => {
    const context = canvas.getContext('2d');

    const image = document.getElementById('image');
    image.style = 'display: none';
    image.src = URL.createObjectURL(file);

    image.onload = () => {
      const width = image.width;
      const height = image.height;
      canvas.width = width;
      canvas.height = height;
      canvas.setAttribute('style', `width: ${canvas.width}px; height: ${canvas.height}px`);
      context.drawImage(image, 0, 0, width, height);
      canvas.toDataURL('image/png');
      resolve();
    };
  });
}

const {
  g,
  segmentation,
} = window;

function main() {

  const btn = document.getElementById('btn');
  let points = [];

  function updatePointsLabel() {
    document.getElementById('value').innerText = points.length;
  }

  const imageInput = document.getElementById('file-input');
  imageInput.onchange = async () => {
    btn.disabled = false;
    const file = imageInput.files[0];
    const canvas = document.getElementById('canvas');
    await loadImage(canvas, file);

    points = [];
    updatePointsLabel();
    canvas.onclick = (e) => {
      points.push({
        x: e.x,
        y: e.y,
      });
      updatePointsLabel();
    };

  };
  btn.onclick = () => {
    const canvas = document.getElementById('canvas');
    console.log('Перевод в ч/б');
    g.toBlack(canvas);

    console.log('Размытие, чтобы уменьшить шумы');
    const gauss = g.getGaussMatrix(5);
    g.applyFilter(canvas, gauss);

    console.log('Открытие+закрытие от шумов');
    g.opening(canvas);
    g.closing(canvas);

    console.log('градиент - Собель или морфологический');
    // Предлагают использовать морфологический градиент, но собель работает лучше
    g.applySobel(canvas);
    // () => g.gradient(canvas),

    console.log('Вебер - уменьшить число градаций серого');
    g.applyWeber(canvas);

    console.log('Сегментация');
    if (points.length > 0) {
      segmentation.markedWatershed(canvas, points);
    } else {
      segmentation.watershed(canvas);
    }

    const image = document.getElementById('image');
    image.style = '';
  };

}

main();
