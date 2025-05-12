// Reusable function to fetch and decode audio files
async function fetchAudio(audioContext, url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

// Moved OUTSIDE for global access — handle the audio stitching
async function handleAdBreak(audioFiles) {
  const audioContext = new AudioContext();
  const buffers = [];

  for (let file of audioFiles) {
    if (file.endsWith(".mp3") || file.endsWith(".wav")) {
      const buffer = await fetchAudio(audioContext, `audio/${file}`);
      buffers.push(buffer);
    } else {
      // Treat as gap in seconds (e.g., "0.5")
      const duration = parseFloat(file);
      if (!isNaN(duration)) {
        const silence = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
        buffers.push(silence);
      }
    }
  }

  // Combine buffers into one
  const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
  const finalBuffer = audioContext.createBuffer(1, totalLength, audioContext.sampleRate);
  let offset = 0;
  for (let buffer of buffers) {
    finalBuffer.getChannelData(0).set(buffer.getChannelData(0), offset);
    offset += buffer.length;
  }

  // Export to Blob
  const audioBlob = await encodeWav(finalBuffer);
  await createVideoFromAudio(audioBlob);
}

// Your main trigger function — now only handles inputs and orchestration
function createAdBreak() {
  const audioFiles = [
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

  handleAdBreak(audioFiles).catch((err) => console.error("Error creating ad break:", err));
}

// Keep your video creation logic here
async function createVideoFromAudio(audioBlob) {
  // (unchanged from your existing code)
}

// Helper: encode AudioBuffer into WAV Blob
async function encodeWav(audioBuffer) {
  const numOfChan = audioBuffer.numberOfChannels,
        length = audioBuffer.length * numOfChan * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [],
        sampleRate = audioBuffer.sampleRate;

  let offset = 0;
  function writeString(str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
    offset += str.length;
  }

  writeString('RIFF');
  view.setUint32(offset, length - 8, true); offset += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, numOfChan, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, sampleRate * 2 * numOfChan, true); offset += 4;
  view.setUint16(offset, numOfChan * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeString('data');
  view.setUint32(offset, length - offset - 4, true); offset += 4;

  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  for (let i = 0; i < audioBuffer.length; i++) {
    for (let j = 0; j < numOfChan; j++) {
      const sample = Math.max(-1, Math.min(1, channels[j][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

// Optional: expose createAdBreak for buttons
window.handleAdBreak = createAdBreak;
