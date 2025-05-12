function createAdBreak() {
  let audioFiles = [
    document.getElementById('station_in').value,
    document.getElementById('gap0').value,
    document.getElementById('ad1').value,
    document.getElementById('gap1').value,
    document.getElementById('ad2').value,
    document.getElementById('gap2').value,
    document.getElementById('ad3').value,
    document.getElementById('gap3').value,
    document.getElementById('ad4').value,
    document.getElementById('gap4').value,
    document.getElementById('ad5').value,
    document.getElementById('gap5').value,
    document.getElementById('ad6').value,
    document.getElementById('gap6').value,
    document.getElementById('ad7').value,
    document.getElementById('gap7').value,
    document.getElementById('station_out').value
  ];

  let audioContext = new AudioContext();
  let finalBuffer = null;

  async function fetchAudio(url) {
    let response = await fetch(url);
    let arrayBuffer = await response.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
  }

async function createVideoFromAudio(audioBlob) {
  const image = new Image();
  const selectedImage = document.getElementById('coverImage').value;
  image.src = selectedImage;
  await image.decode();

  // Prepare canvas
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const stream = canvas.captureStream(30); // 30 FPS

  // Set up audio
  const audioContext = new AudioContext();
  await audioContext.resume();

  const audio = new Audio(URL.createObjectURL(audioBlob));
  const source = audioContext.createMediaElementSource(audio);
  const dest = audioContext.createMediaStreamDestination();
  source.connect(dest);
  source.connect(audioContext.destination);

  // Add audio track to stream
  stream.addTrack(dest.stream.getAudioTracks()[0]);

  // Set up recorder
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = () => {
    const videoBlob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom_ad_break.webm';
    a.click();

    clearInterval(progressInterval);
    progressBar.style.width = '100%';
    setTimeout(() => {
      progressContainer.style.display = 'none';
      progressBar.style.width = '0%';
    }, 1000);
  };

  recorder.start();
  audio.play();

  // Set up progress bar
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  progressContainer.style.display = 'block';
  progressBar.style.width = '0%';

  const updateProgress = () => {
    const percent = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = `${percent}%`;
  };

  const progressInterval = setInterval(updateProgress, 100);

  // Stop when audio ends
  audio.onended = () => {
    recorder.stop();
  };

  // Fallback stop
  setTimeout(() => {
    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
  }, 60000);
}

// Expose to global scope
window.handleAdBreak = function () {
  createAdBreak();
};
