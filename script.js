function createAdBreak() {
    const sting = document.getElementById('station').value;
    const ad1 = document.getElementById('ad1').value;
    const ad2 = document.getElementById('ad2').value;
    const ad3 = document.getElementById('ad3').value;
    const exportAsVideo = document.getElementById('exportAsVideo').checked;
    const imagePath = document.getElementById('image').value;

    const audioFiles = [sting, ad1, ad2, ad3];
    const audioContext = new AudioContext();
    let finalBuffer = null;

    async function fetchAudio(url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await audioContext.decodeAudioData(arrayBuffer);
    }

    async function mergeAudio() {
        const buffers = await Promise.all(audioFiles.map(fetchAudio));
        const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
        finalBuffer = audioContext.createBuffer(1, totalLength, audioContext.sampleRate);

        let offset = 0;
        buffers.forEach(buffer => {
            finalBuffer.getChannelData(0).set(buffer.getChannelData(0), offset);
            offset += buffer.length;
        });

        if (exportAsVideo) {
            await exportWebM(finalBuffer, imagePath);
        } else {
            saveAudio(finalBuffer);
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

    async function exportWebM(buffer, imagePath) {
        const canvas = document.getElementById('videoCanvas');
        const ctx = canvas.getContext('2d');

        // Load image
        const img = new Image();
        img.src = imagePath;
        await new Promise(resolve => {
            img.onload = resolve;
        });

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Stream canvas
        const canvasStream = canvas.captureStream(30);
        const audioDest = audioContext.createMediaStreamDestination();

        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioDest);
        source.start();

        const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioDest.stream.getAudioTracks()]);
        const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });

        const chunks = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'custom_ad_break.webm';
            a.click();
        };

        recorder.start();
        await new Promise(resolve => setTimeout(resolve, (buffer.duration + 0.5) * 1000));
        recorder.stop();
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

    mergeAudio();
}

