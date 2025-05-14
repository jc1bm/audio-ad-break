const audioContext = new AudioContext();

async function fetchAudio(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

function bufferToWave(abuffer, len) {
  const numOfChan = abuffer.numberOfChannels;
  const length = len * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const channels = [];
  const sampleRate = abuffer.sampleRate;
  let offset = 44;
  let pos = 0;

  writeUTFBytes(view, 0, 'RIFF');
  view.setUint32(4, length - 8, true);
  writeUTFBytes(view, 8, 'WAVE');
  writeUTFBytes(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2 * numOfChan, true);
  view.setUint16(32, numOfChan * 2, true);
  view.setUint16(34, 16, true);
  writeUTFBytes(view, 36, 'data');
  view.setUint32(40, length - 44, true);

  for (let i = 0; i < numOfChan; i++) {
    channels.push(abuffer.getChannelData(i));
  }

  while (pos < len) {
    for (let i = 0; i < numOfChan; i++) {
      const sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    pos++;
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeUTFBytes(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function saveAudio(buffer) {
  const wavBlob = bufferToWave(buffer, buffer.length);
  const url = URL.createObjectURL(wavBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'custom_ad_break.wav';
  a.click();
}

async function mergeAudio(audioFiles) {
  const buffers = await Promise.all(audioFiles.map(fetchAudio));
  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
  const finalBuffer = audioContext.createBuffer(1, totalLength, audioContext.sampleRate);

  let offset = 0;
  for (const buffer of buffers) {
    finalBuffer.getChannelData(0).set(buffer.getChannelData(0), offset);
    offset += buffer.length;
  }

  saveAudio(finalBuffer);
}

function createAdBreak() {
  const audioFiles = [
    'station_in',
    'gap0',
    'ad1', 'gap1',
    'ad2', 'gap2',
    'ad3', 'gap3',
    'ad4', 'gap4',
    'ad5', 'gap5',
    'ad6', 'gap6',
    'ad7', 'gap7',
    'station_out'
  ].map(id => document.getElementById(id).value);

  mergeAudio(audioFiles);
}

// Attach event listeners
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('generate').addEventListener('click', createAdBreak);
  resolveTargetFormat(); // load correct target audio format
});

// Target audio detection
async function resolveTargetFormat() {
  const basePath = 'audio/ad/target';
  const formats = ['.wav', '.mp3'];
  let found = false;

  for (const ext of formats) {
    const url = basePath + ext;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) {
        updateTargetOption(ext);
        found = true;
        break;
      }
    } catch (e) {
      console.warn(`Could not load ${url}`);
    }
  }

  if (!found) {
    removeTargetOptions();
  }
}

function updateTargetOption(ext) {
  const selects = document.querySelectorAll('select');
  selects.forEach(select => {
    [...select.options].forEach(option => {
      if (option.value.includes('audio/ad/target')) {
        option.value = `audio/ad/target${ext}`;
      }
    });
  });
}

function removeTargetOptions() {
  const selects = document.querySelectorAll('select');
  selects.forEach(select => {
    [...select.options].forEach((option, i) => {
      if (option.value === 'audio/ad/target.wav' || option.value === 'audio/ad/target.mp3') {
        select.remove(i);
      }
    });
  });
}
