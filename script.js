import { createFFmpeg, fetchFile } from "https://unpkg.com/@ffmpeg/ffmpeg@0.11.8/dist/esm/index.js";

const ffmpeg = createFFmpeg({ log: true });
const progressEl = document.getElementById("progress");

// Define clip IDs
const clipSlots = ['intro', 'ad1', 'ad2', 'ad3', 'ad4', 'ad5', 'ad6', 'ad7', 'outro'];
const imageSelect = document.getElementById("imageSelect");

// Populate dropdowns
const audioOptions = ['none', 'intro.wav', 'ad1.wav', 'ad2.wav', 'ad3.wav', 'ad4.wav', 'ad5.wav', 'ad6.wav', 'ad7.wav', 'outro.wav'];
const imageOptions = ['img1.jpg', 'img2.jpg'];

function populateDropdown(id, options) {
  const select = document.getElementById(id);
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    select.appendChild(o);
  });
}

clipSlots.forEach(id => populateDropdown(id, audioOptions));
populateDropdown("imageSelect", imageOptions);

async function getSelectedAudioFiles() {
  return clipSlots
    .map(id => document.getElementById(id).value)
    .filter(file => file !== 'none')
    .map(file => `audio/${file}`);
}

async function combineAudioFiles(audioFiles) {
  progressEl.textContent = "Loading ffmpeg...";
  if (!ffmpeg.isLoaded()) await ffmpeg.load();

  progressEl.textContent = "Fetching audio files...";
  for (let i = 0; i < audioFiles.length; i++) {
    const fileData = await fetchFile(audioFiles[i]);
    ffmpeg.FS('writeFile', `input${i}.wav`, fileData);
  }

  // Create input.txt
  const list = audioFiles.map((_, i) => `file 'input${i}.wav'`).join('\n');
  ffmpeg.FS('writeFile', 'input.txt', new TextEncoder().encode(list));

  progressEl.textContent = "Combining audio files...";
  await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', 'input.txt', '-c', 'copy', 'output.wav');

  const data = ffmpeg.FS('readFile', 'output.wav');
  return new Blob([data.buffer], { type: 'audio/wav' });
}

async function createVideoFile(audioBlob, imageFile) {
  progressEl.textContent = "Loading image...";
  const imageData = await fetchFile(`images/${imageFile}`);
  ffmpeg.FS('writeFile', 'cover.jpg', imageData);

  progressEl.textContent = "Writing audio to ffmpeg...";
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
  const files = await getSelectedAudioFiles();
  if (files.length === 0) return alert("Please select at least one audio file.");
  const audioBlob = await combineAudioFiles(files);

  const url = URL.createObjectURL(audioBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ad-break.wav";
  a.click();
  URL.revokeObjectURL(url);
  progressEl.textContent = "Done! Downloaded audio.";
});

document.getElementById("exportVideo").addEventListener("click", async () => {
  const files = await getSelectedAudioFiles();
  const image = imageSelect.value;
  if (files.length === 0 || !image) return alert("Select audio and image.");
  const audioBlob = await combineAudioFiles(files);
  const videoBlob = await createVideoFile(audioBlob, image);

  const url = URL.createObjectURL(videoBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ad-break.webm";
  a.click();
  URL.revokeObjectURL(url);
  progressEl.textContent = "Done! Downloaded video.";
});
