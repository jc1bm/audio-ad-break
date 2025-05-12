// Refactored script.js with both audio and video export functionality

async function createAdBreak() {
  const audioFiles = [
    'station_in', 'gap0', 'ad1', 'gap1', 'ad2', 'gap2', 'ad3', 'gap3',
    'ad4', 'gap4', 'ad5', 'gap5', 'ad6', 'gap6', 'ad7', 'gap7', 'station_out'
  ].map(id => document.getElementById(id).value);

  const audioContext = new AudioContext();
  const buffers = await Promise.all(audioFiles.map(fetchAudio));

  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
  const finalBuffer = audioContext.createBuffer(1, totalLength, audioContext.sampleRate);

  let offset = 0;
  buffers.forEach(buffer => {
    finalBuffer.getChannelData(0).set(buffer.getChannelData(0), offset);
    offset += buffer.length;
  });

  const exportType = document.getElementById('exportType').value;
  if (exportType === 'video') {
    await saveVideo(finalBuffer);
  } else {
    saveAudioOnly(finalBuffer);
  }

  async function fetchAudio(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
  }

  function saveAudioOnly(buffer) {
    const wavBlob = bufferToWave(buffer, buffer.length);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom_ad_break.wav';
    a.click();
  }

  async function saveVideo(buffer) {
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();

    const wavBlob = bufferToWave(buffer, buffer.length);
    const wavFile = new File([wavBlob], 'input.wav');

    const imageUrl = document.getElementById('imageSelector').value;
    const imageResponse = await fetch(imageUrl);
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageUint8Array = new Uint8Array(imageArrayBuffer);

    ffmpeg.FS('writeFile', 'input.wav', await fetchFile(wavFile));
    ffmpeg.FS('writeFile', 'image.jpg', imageUint8Array);

    await ffmpeg.run(
      '-loop', '1',
      '-i', 'image.jpg',
      '-i', 'input.wav',
      '-c:v', 'libx264',
      '-tune', 'stillimage',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      '-pix_fmt', 'yuv420p',
      'output.mp4'
    );

    const data = ffmpeg.FS('readFile', 'output.mp4');
    const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(videoBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom_ad_break.mp4';
    a.click();
  }

  function bufferToWave(abuffer, len) {
    const numOfChan = abuffer.numberOfChannels;
    const length = len * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);

    let offset = 44;
    let pos = 0;

    const channels = [];
    for (let i = 0; i < numOfChan; i++) {
      channels.push(abuffer.getChannelData(i));
    }

    writeUTFBytes(view, 0, 'RIFF');
    view.setUint32(4, length - 8, true);
    writeUTFBytes(view, 8, 'WAVE');
    writeUTFBytes(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numOfChan, true);
    view.setUint32(24, abuffer.sampleRate, true);
    view.setUint32(28, abuffer.sampleRate * 2 * numOfChan, true);
    view.setUint16(32, numOfChan * 2, true);
    view.setUint16(34, 16, true);
    writeUTFBytes(view, 36, 'data');
    view.setUint32(40, length - 44, true);

    while (pos < len) {
      for (let i = 0; i < numOfChan; i++) {
        view.setInt16(offset, channels[i][pos] * 0x7FFF, true);
        offset += 2;
      }
      pos++;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  function writeUTFBytes(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
} // End createAdBreak
