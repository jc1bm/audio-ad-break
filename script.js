import { createFFmpeg, fetchFile } from "https://unpkg.com/@ffmpeg/ffmpeg@0.11.8/dist/esm/index.js";

const ffmpeg = createFFmpeg({ log: true });
const progressEl = document.getElementById("progress");

const clipSlots = ['intro', 'ad1', 'ad2', 'ad3', 'ad4', 'ad5', 'ad6', 'ad7', 'outro'];
const audioFiles = ['intro.wav', 'ad1.wav', 'ad2.wav', 'ad3.wav', 'ad4.wav', 'ad5.wav', 'ad6.wav', 'ad7.wav', 'outro.wav'];
const imageFiles = ['img1.jpg', 'img2.jpg', 'img3.jpg'];

function populateDropdown(id, options) {
  const select = document.getElementById(id);
  options.forEach(file => {
    const option = document.createElement('option');
    option.value = file;
    option.textContent = file;
    select.appendChild(option);
  });
}

// Populate audio dropdowns
clipSlots.forEach(slot => populateDropdown(slot, audioFiles));

// Populate image dropdown
populateDropdown("imageSelect", imageFiles);

async function getSelectedAudioFiles() {
  return clipSlots.map(id => `audio/ad/${document.getElementById(id).value}`);
}

async function combineAudioFiles(audioPaths) {
  progressEl.textContent = "Loading ffmpeg...";
  if (!ffmpeg.isLoaded()) await ffmpeg.load();

  progressEl.textContent = "Fetching audio files...";
  for (let i = 0; i < audioPaths.length; i++) {
    const data = await fetchFile(audioPaths[i]);
    ffmpeg.FS('writeFile', `input${i}.wav`, data);
  }

  const inputList = audioPaths.map((_, i) => `file 'input${i}.wav'`).join('\n');
  ffmpeg.FS('writeFile', 'input.txt', new TextEncoder().encode(inputList));

  progressEl.textContent = "Combining audio files...";
  await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', 'input.txt', '-c', 'copy', 'output.wav');

  const result = ffmpeg.FS('readFile', 'output.wav');
  return new Blob([result.buffer], { type: 'audio/wav' });
}

async function createVideoFile(audioBlob, imageFile) {
  const imageData = await fetchFile(`images/${imageFile}`);
  ffmpeg.FS('writeFile', 'cover.jpg', imageData);
  ffmpeg.FS('writeFile', 'audio.wav', await fetchFile(audioBlob));

  progressEl.textContent = "Creating video...";
  await ffmpeg.run(
    '-loop', '1',
    '-i', 'cover.jpg',
    '-i', 'audio.wav',
    '-c:v', 'libvpx-vp9',
    '-c:a', 'libopus',
    '-b:v', '1M',
    '-shortest',
    'output.webm'
  );

  const videoData = ffmpeg.FS('readFile', 'output.webm');
  return new Blob([videoData.buffer], { type: 'video/webm' });
}

document.getElementById("exportAudio").addEventListener("click", async () => {
  const audioPaths = await getSelectedAudioFiles();
  const blob = await combineAudioFiles(audioPaths);
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'ad-break.wav';
  a.click();
  URL.revokeObjectURL(url);
  progressEl.textContent = "Downloaded audio.";
});

document.getElementById("exportVideo").addEventListener("click", async () => {
  const audioPaths = await getSelectedAudioFiles();
  const image = document.getElementById("imageSelect").value;
  if (!image) return alert("Select an image.");

  const audioBlob = await combineAudioFiles(audioPaths);
  const videoBlob = await createVideoFile(audioBlob, image);

  const url = URL.createObjectURL(videoBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ad-break.webm';
  a.click();
  URL.revokeObjectURL(url);
  progressEl.textContent = "Downloaded video.";
});
