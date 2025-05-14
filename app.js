const audioContext = new (window.AudioContext || window.webkitAudioContext)();

async function fetchAudioBuffer(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

async function buildSequence() {
  const ids = [
    "station_in", "gap0", "ad1", "gap1", "ad2", "gap2", "ad3", "gap3",
    "ad4", "gap4", "ad5", "gap5", "ad6", "gap6", "ad7", "gap7", "station_out"
  ];

  const buffers = [];

  for (const id of ids) {
    const value = document.getElementById(id).value;
    if (!value.includes("none.wav")) {
      const buffer = await fetchAudioBuffer(value);
      buffers.push(buffer);
    }
  }

  const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);
  const outputBuffer = audioContext.createBuffer(
    1,
    totalLength,
    audioContext.sampleRate
  );

  let offset = 0;
  for (const buffer of buffers) {
    outputBuffer.getChannelData(0).set(buffer.getChannelData(0), offset);
    offset += buffer.length;
  }

  return outputBuffer;
}

function bufferToWav(buffer) {
  const length = buffer.length * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  let offset = 0;
  writeString(offset, "RIFF"); offset += 4;
  view.setUint32(offset, length - 8, true); offset += 4;
  writeString(offset, "WAVE"); offset += 4;

  writeString(offset, "fmt "); offset += 4;
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint32(offset, buffer.sampleRate, true); offset += 4;
  view.setUint32(offset, buffer.sampleRate * 2, true); offset += 4;
  view.setUint16(offset, 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;

  writeString(offset, "data"); offset += 4;
  view.setUint32(offset, length - 44, true); offset += 4;

  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

document.getElementById("exportAudio").addEventListener("click", async () => {
  const buffer = await buildSequence();
  const wavBlob = bufferToWav(buffer);
  downloadBlob(wavBlob, "adbreak.wav");
});

document.getElementById("exportVideo").addEventListener("click", async () => {
  const buffer = await buildSequence();

  const dest = audioContext.createMediaStreamDestination();
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(dest);
  source.start();

  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");

  const img = new Image();
  img.src = document.getElementById("videoImage").value;
  await img.decode();
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const videoStream = canvas.captureStream();
  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...dest.stream.getAudioTracks()
  ]);

  const recorder = new MediaRecorder(combinedStream, { mimeType: "video/webm" });
  const chunks = [];

  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = () => {
    const videoBlob = new Blob(chunks, { type: "video/webm" });
    downloadBlob(videoBlob, "adbreak.webm");
  };

  recorder.start();
  setTimeout(() => recorder.stop(), buffer.duration * 1000);
});
