async function fetchAudioBuffer(url, audioContext) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

async function buildSequence() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const ids = [
    "station_in", "gap0", "ad1", "gap1", "ad2", "gap2", "ad3", "gap3",
    "ad4", "gap4", "ad5", "gap5", "ad6", "gap6", "ad7", "gap7", "station_out"
  ];

  const buffers = [];

  for (const id of ids) {
    const value = document.getElementById(id).value;
    if (!value.includes("none.wav")) {
      const buffer = await fetchAudioBuffer(value, audioContext);
      buffers.push(buffer);
    }
  }

  // Calculate total duration
  const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);
  const outputBuffer = audioContext.createBuffer(
    1,
    totalLength,
    audioContext.sampleRate
  );

  // Combine
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

  // RIFF header
  writeString(offset, "RIFF");
  offset += 4;
  view.setUint32(offset, length - 8, true);
  offset += 4;
  writeString(offset, "WAVE");
  offset += 4;

  // fmt subchunk
  writeString(offset, "fmt ");
  offset += 4;
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true); // PCM
  offset += 2;
  view.setUint16(offset, 1, true); // Mono
  offset += 2;
  view.setUint32(offset, buffer.sampleRate, true);
  offset += 4;
  view.setUint32(offset, buffer.sampleRate * 2, true);
  offset += 4;
  view.setUint16(offset, 2, true);
  offset += 2;
  view.setUint16(offset, 16, true);
  offset += 2;

  // data subchunk
  writeString(offset, "data");
  offset += 4;
  view.setUint32(offset, length - 44, true);
  offset += 4;

  // Write PCM samples
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
  const wavBlob = bufferToWav(buffer);

  const audio = new Audio(URL.createObjectURL(wavBlob));
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");

  const img = new Image();
  img.src = document.getElementById("videoImage").value;
  await img.decode();

  // Draw image once
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const canvasStream = canvas.captureStream();
  const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const dest = new AudioContext().createMediaStreamDestination();
  const source = new AudioContext().createBufferSource();
  const decoded = await new AudioContext().decodeAudioData(await wavBlob.arrayBuffer());
  source.buffer = decoded;
  source.connect(dest);
  source.start();

  const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const recorder = new MediaRecorder(combinedStream, { mimeType: "video/webm" });

  const chunks = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = () => {
    const videoBlob = new Blob(chunks, { type: "video/webm" });
    downloadBlob(videoBlob, "adbreak.webm");
  };

  recorder.start();
  audio.play();

  setTimeout(() => recorder.stop(), decoded.duration * 1000);
});
