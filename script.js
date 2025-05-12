<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Ad-In-Situ Maker</title>
</head>
<body>
  <h1>Ad-In-Situ Maker</h1>

  <!-- Station In -->
  <select id="station_in">
    <option value="audio/station/absolute.wav">Absolute</option>
    <option value="audio/station/sting2.wav">Sting 2</option>
    <option value="audio/ad/none.wav">None</option>
  </select>

  <!-- Gaps and Ads -->
  <!-- ... keep your full select structure here (unchanged) ... -->

  <!-- Station Out -->
  <br /><br />
  <select id="station_out">
    <option value="audio/station/absolute.wav">Absolute</option>
    <option value="audio/station/sting2.wav">Sting 2</option>
    <option value="audio/ad/none.wav">None</option>
  </select>

  <!-- Export Type -->
  <br /><br />
  <select id="exportType">
    <option value="audio">Audio Only (WAV)</option>
    <option value="video">Video with Image (MP4)</option>
  </select>

  <br /><br />

  <button onclick="createAdBreak()">Generate Ad Break</button>

  <!-- FFmpeg.wasm -->
  <script src="https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.2/dist/ffmpeg.min.js"></script>

  <!-- Main script logic -->
  <script src="script.js" defer></script>

  <!-- Dynamic format detection -->
  <script>
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
          if (option.value.includes('audio/ad/target')) {
            select.remove(i);
          }
        });
      });
    }

    window.addEventListener('DOMContentLoaded', resolveTargetFormat);
  </script>

  <!-- Upload/clear links -->
  <br /><br />
  <a href="https://github.com/jc1bm/audio-ad-break/tree/main/audio/ad" target="_blank">Clear target audio</a>
  <br /><br />
  <a href="https://github.com/jc1bm/audio-ad-break/upload/main/audio/ad" target="_blank">Upload target audio</a>

</body>
</html>
