async function createAdBreak() {
  const files = [
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
        document.getElementById('image').value

  ];
  const imagePath = document.getElementById('image').value;
  const exportAsVideo = document.getElementById('exportAsVideo').checked;

  const audioCtx = new AudioContext();

  async function fetchAndDecode(url) {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
  }

  const audioBuffers = await Promise.all(files.map(fetchAndDecode));
  const totalLength = audioBuffers.reduce((sum, b) => sum + b.length, 0);
  const outputBuffer = audioCtx.createBuffer(1, totalLength, audioCtx.sampleRate);

  let offset = 0;
  audioBuffers.forEach(buffer => {
    outputBuffer.getChannelData(0).set(buffer.getChannelData(0), offset);
    offset += buffer.length;
  });

  if (!exportAsVideo) {
    // ✅ Export as .wav
    const wavBlob = bufferToWave(outputBuffer, outputBuffer.length);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ad-break.wav';
    a.click();
    return;
  }

  // ✅ Export as .webm (video)
  const source = audioCtx.createBufferSource();
  source.buffer = outputBuffer;

  const dest = audioCtx.createMediaStreamDestination();
  source.connect(dest);

  const canvas = document.getElementById('videoCanvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.src = imagePath;

  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const canvasStream = canvas.captureStream();
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ]);

    const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
    const chunks = [];

    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ad-break.webm';
      a.click();
    };

    recorder.start();
    source.start();

    const duration = outputBuffer.duration * 1000;
    setTimeout(() => recorder.stop(), duration);
  };

  // Helper to convert buffer to WAV
  function bufferToWave(abuffer, len) {
    const numOfChan = abuffer.numberOfChannels,
          length = len * numOfChan * 2 + 44,
          buffer = new ArrayBuffer(length),
          view = new DataView(buffer),
          channels = [],
          sampleRate = abuffer.sampleRate,
          offset = 44;

    // Write WAV header
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

    let pos = 0;
    while (pos < len) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][pos]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
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
}
