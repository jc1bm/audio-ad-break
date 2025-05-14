async function createAdBreak() {
    const audioFiles = Array.from(document.getElementById('audioFiles').files);
    const imageFile = document.getElementById('image').files<source_id data="0" title="N/A" />;
    const exportAsVideo = document.getElementById('exportAsVideo').checked;
    
    const audioContext = new AudioContext();
    
    async function fetchAndDecode(file) {
        const arrayBuffer = await file.arrayBuffer();
        return await audioContext.decodeAudioData(arrayBuffer);
    }
    
    const audioBuffers = await Promise.all(audioFiles.map(fetchAndDecode));
    const totalLength = audioBuffers.reduce((sum, b) => sum + b.length, 0);
    const outputBuffer = audioContext.createBuffer(1, totalLength, audioContext.sampleRate);
    
    let offset = 0;
    audioBuffers.forEach(buffer => {
        outputBuffer.getChannelData(0).set(buffer.getChannelData(0), offset);
        offset += buffer.length;
    });

    if (exportAsVideo && imageFile) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = URL.createObjectURL(imageFile);
        
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const source = audioContext.createBufferSource();
            source.buffer = outputBuffer;
            
            const dest = audioContext.createMediaStreamDestination();
            source.connect(dest);
            
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

            setTimeout(() => recorder.stop(), outputBuffer.duration * 1000);
        };
    } else {
        const wavBlob = bufferToWave(outputBuffer, outputBuffer.length);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ad-break.wav';
        a.click();
    }
}

function bufferToWave(abuffer, len) {
    const numOfChan = abuffer.numberOfChannels,
          length = len * numOfChan * 2 + 44,
          buffer = new ArrayBuffer(length),
          view = new DataView(buffer),
          channels = [],
          sampleRate = abuffer.sampleRate,
          offset = 44;

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
