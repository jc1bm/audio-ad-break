import { createFFmpeg, fetchFile } from 'https://unpkg.com/@ffmpeg/ffmpeg@0.11.8/dist/esm/index.js';

const ffmpeg = createFFmpeg({ log: true });
const progress = document.getElementById("progress");

// Collect all dropdown IDs in correct order
const ids = [
  "station_in",
  "gap0", "ad1", "gap1", "ad2", "gap2", "ad3", "gap3",
  "ad4", "gap4", "ad5", "gap5", "ad6", "gap6", "ad7", "gap7",
  "station_out"
];

function getSelectedAudioPaths() {
  return ids.map(id => document.getElementById(id).value);
}

async function combineAudioFiles(audioPaths) {
  progress.textContent = "Loading FFmpeg...";
  if (!ffmpeg.isLoaded()) await ffmpeg.load();

  // Write each file into the FFmpeg virtual FS
  progress.textContent = "Fetching audio files...";
  for (let i = 0; i < audioPaths.length; i++) {
    const data = await fetchFile(audioPaths[i]);
    ffmpeg.FS('writeFile', `input${i}.wav`, data);
  }

  // Create concat list
  const concatList = audioPaths.map((_, i) => `file 'input${i}.wav'`).join('\n');
  ffmpeg.FS('writeFile', 'inputs.txt', new TextEncoder().encode(concatList));

  progress.textContent = "Combining audio...";
  await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', 'inputs.txt', '-c', 'copy', 'output.wav');

  const output = ffmpeg.FS('readFile', 'output.wav');
  return new Blob([output.buffer], { type: 'audio/wav' });
}

async function exportAudio() {
  const audioPaths = getSelectedAudioPaths();
  const blob = await combineAudioFiles(audioPaths);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ad-break.wav';
  a.click();
  URL.revokeObjectURL(url);
  progress.textContent = "Audio download ready.";
}

async function exportVideo() {
  const audioPaths = getSelectedAudioPaths();
  const imageFile = document.getElementById("imageSelect").value;

  const audioBlob = await combineAudioFiles(audioPaths);
  const audioData = await fetchFile(audioBlob);
  const imageData = await fetchFile(`images/${imageFile}`);

  ffmpeg.FS('writeFile', 'cover.jpg', imageData);
  ffmpeg.FS('writeFile', 'audio.wav', audioData);

  progress.textContent = "Creating video...";

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
  const videoBlob = new Blob([videoData.buffer], { type: 'video/webm' });
  const url = URL.createObjectURL(videoBlob);
  const a = document.createElement('a');
  a.href = url;
