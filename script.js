function createAdBreak() {
    let audioFiles = [
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
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({ log: true });

    await ffmpeg.load();

    // Convert buffer to WAV Blob
    const wavBlob = bufferToWave(buffer, buffer.length);
    const wavFile = new File([wavBlob], 'input.wav');

    // Fetch image from public /images folder
    const imageUrl = document.getElementById('imageSelector').value;
    const imageResponse = await fetch(imageUrl);
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageUint8Array = new Uint8Array(imageArrayBuffer);

    // Load files into FFmpeg FS
    ffmpeg.FS('writeFile', 'input.wav', await fetchFile(wavFile));
    ffmpeg.FS('writeFile', 'image.jpg', imageUint8Array);

    // Combine into video with still image
    await ffmpeg.run(
        '-loop', '1',           // Loop the image
        '-i', 'image.jpg',      // Image input
        '-i', 'input.wav',      // Audio input
        '-c:v', 'libx264',      // Video codec
        '-tune', 'stillimage',  // Optimize for still image
        '-c:a', 'aac',          // Audio codec
        '-b:a', '192k',
        '-shortest',            // Match video length to audio
        '-pix_fmt', 'yuv420p',  // Ensures compatibility
        'output.mp4'
    );

    // Read and export the result
    const data = ffmpeg.FS('readFile', 'output.mp4');
    const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(videoBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom_ad_break.mp4';
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
