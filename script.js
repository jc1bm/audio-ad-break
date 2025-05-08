function createAdBreak() {
    let sting = document.getElementById('sting').value;
    let ad1 = document.getElementById('ad1').value;

    let audioFiles = [sting, ad1]; // Add all selected files

    let audioContext = new AudioContext();
    let finalBuffer = null;

    async function fetchAudio(url) {
        let response = await fetch(url);
        let arrayBuffer = await response.arrayBuffer();
        return await audioContext.decodeAudioData(arrayBuffer);
    }

    async function mergeAudio() {
        let buffers = await Promise.all(audioFiles.map(fetchAudio));
        let totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
        finalBuffer = audioContext.createBuffer(1, totalLength, audioContext.sampleRate);
        
        let offset = 0;
        buffers.forEach(buffer => {
            finalBuffer.getChannelData(0).set(buffer.getChannelData(0), offset);
            offset += buffer.length;
        });

        saveAudio(finalBuffer);
    }

    async function saveAudio(buffer) {
        let wavBlob = bufferToWave(buffer, buffer.length);
        let url = URL.createObjectURL(wavBlob);
        let a = document.createElement('a');
        a.href = url;
        a.download = 'custom_ad_break.wav';
        a.click();
    }

    function bufferToWave(abuffer, len) {
        let numOfChan = abuffer.numberOfChannels,
            length = len * numOfChan * 2 + 44,
            buffer = new ArrayBuffer(length),
            view = new DataView(buffer),
            channels = [],
            sampleRate = abuffer.sampleRate,
            offset = 44,
            pos = 0;

        // WAV header
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

        // Write audio samples
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
