import { createFFmpeg, fetchFile } from 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.2/dist/esm/ffmpeg.mjs';

const ffmpeg = createFFmpeg({ log: true });

async function createAdBreak() {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  const clips = [
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
    document.getElementById('station_out').value,
  ].filter(src => !src.includes('none.wav'));

  const exportType = document.getElementById('exportType').value;
  const imageFile = document.getElementById('imageInput')?.files?.[0];

  const listFile = 'input.txt';
  const concatList = [];

  // Load all audio files into ffmpeg FS
  for (let i = 0; i < clips.length; i++) {
    const name = `clip${i}.wav`;
    const data = await fetchFile(clips[i]);
    ffmpeg.FS('writeFile', name, data);
    concatList.push(`file '${name}'`);
  }

  // Write the concat list file
  ffmpeg.FS('writeFile', listFile, concatList.join('\n'));

  // Merge audio clips
  await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', 'output.wav');

  // Export logic
  if (exportType === 'audio') {
    const output = ffmpeg.FS('readFile', 'output.wav');
    downloadFile(output, 'ad-break.wav', 'audio/wav');
  } else if (exportType === 'video' && imageFile) {
    const imageName = 'cover.jpg';
    ffmpeg.FS('writeFile', imageName, await fetchFile(imageFile));

    // Create a video with the still image and merged audio
    await ffmpeg.run(
      '-loop', '1',
      '-i', imageName,
      '-i', 'output.wav',
      '-shortest',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-pix_fmt', 'yuv420p',
      'output.mp4'
    );

    const output = ffmpeg.FS('readFile', 'output.mp4');
    downloadFile(output, 'ad-break.mp4', 'video/mp4');
  } else {
    alert('Please select an image if exporting video.');
  }

  // Cleanup
  ffmpeg.FS('unlink', listFile);
  clips.forEach((_, i) => ffmpeg.FS('unlink', `clip${i}.wav`));
  if (exportType === 'video') {
    ffmpeg.FS('unlink', 'output.wav');
    ffmpeg.FS('unlink', 'cover.jpg');
    ffmpeg.FS('unlink', 'output.mp4');
  } else {
    ffmpeg.FS('unlink', 'output.wav');
  }
}

function downloadFile(data, filename, mimeType) {
  const blob = new Blob([data.buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

 window.createAdBreak = createAdBreak;
}
