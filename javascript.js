// buttons
const setupButton = document.getElementById('setup');
const recordButton = document.getElementById('record');
const downloadButton = document.getElementById('download');
const settingsButton = document.getElementById('settings');
const infoButton = document.getElementById('info');
// divs
const videoDiv = document.getElementById('video_resize')
const previewPanel = document.getElementById('preview_panel')
const controlPanel = document.getElementById('controls_panel')
const settingsPanel = document.getElementById('settings_panel')
const infoPanel = document.getElementById('info_panel')
// components + forms
const logNode = document.getElementById('log');
const videoNode = document.getElementById('preview');
const audioMetreBar = document.getElementById('metre')
const audioMetreTitle = document.getElementById('audio-metre-label')
const audioGain = document.getElementById('gain')
const echoCancellation = document.getElementById('echo-cancellation')
const noiseSuppression = document.getElementById('noise-suppression')
const autoGainControl = document.getElementById('autogain-control')
const status = document.getElementById('status');
const status_duration = document.getElementById('duration');
// log
console.log = msg => logNode.innerHTML = `# ${msg}<br>` + logNode.innerHTML;
console.error = msg => logNode.innerHTML = `<br><span class='error'>${msg}</span><br>` + logNode.innerHTML;
console.warn = msg => `<br><span class='warn'>${msg}<span><br>` + logNode.innerHTML;
console.info = msg => logNode.innerHTML = `<br><span class='info'>${msg}</span><br>` + logNode.innerHTML;
// variables
var mediaRecorder;
var recordedBlobs;
var mediaStream;
var timer;
var audioMetreTitleOriginal = audioMetreTitle.innerHTML

settingsButton.onclick = function () {
    if (settingsPanel.style.display === 'none') {
        settingsPanel.style.display = 'block'
    } else if (settingsPanel.style.display === 'block') {
        settingsPanel.style.display = 'none'
    }
}

infoButton.onclick = function () {
    if (infoPanel.style.display === 'none') {
        infoPanel.style.display = 'block'
    } else if (infoPanel.style.display === 'block') {
        infoPanel.style.display = 'none'
    }
}

setupButton.onclick = function () {
    let options = parseOptions();
    startCapture(options, 'camera');
}

recordButton.onclick = function () {
    switch (recordButton.value) {
        case 'Record':
            startRecording();
            recordButton.value = 'Stop';
            downloadButton.disabled = true;
            settingsButton.disabled = true;
            setupButton.disabled = true;
            break;
        case 'Stop':
            stopRecording();
            recordButton.value = 'Record';
            setupButton.disabled = false;
            downloadButton.disabled = false;
            settingsButton.disabled = false;
        default:
            break;
    }
};

downloadButton.onclick = function () {
    downloadRecording();
}

videoDiv.onmouseup = function () {
    let width = Number(videoDiv.style.width.slice(0, -2))
    let height = Number(videoDiv.style.height.slice(0, -2))
    let aspectRatio = videoNode.clientHeight / videoNode.clientWidth
    if (height / width > aspectRatio) {
        videoDiv.style.height = width * aspectRatio
    } else if (height / width < aspectRatio) {
        videoNode.width = height / aspectRatio
        videoDiv.style.height = width * aspectRatio
    }
}

// settings
const settingsToggles = [echoCancellation, noiseSuppression, autoGainControl]
settingsToggles.forEach(function (item) {
    item.onclick = function () {
        if (item.value === 'On') {
            item.value = 'Off'
        } else {
            item.value = 'On'
        }
    }
}
)


// https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints
function parseOptions() {
    function parseValue(input) {
        if (input.value == 'On') {
            return true
        } else if (input.value == 'Off') {
            return false
        }
    }
    var displayMediaOptions = {
        audio: {
            // echoCancellation: document.getElementById('echoCancellation').value(),
            echoCancellation: parseValue(echoCancellation),
            noiseSuppression: parseValue(noiseSuppression),
            autoGainControl: parseValue(autoGainControl),
            sampleRate: 44100,
        },
        video: {
            cursor: 'always',
            frameRate: 999,
            aspectRatio: 3.2,
            height: 1080,
            width: 960,
            // MONITOR
            // if width + height + aspectRatio: width takes priority, then width, aspect ratio is calculated
            //
        }
    };
    return displayMediaOptions;
}

function logInfo() {
    let videoTrack = videoNode.srcObject.getVideoTracks()[0];
    console.info(JSON.stringify(videoTrack.getSettings(), null, 2));
    console.info('Track settings:');
    console.info(JSON.stringify(videoTrack.getConstraints(), null, 2));
    console.info('Track constraints:');
}

function audioMetre() {
    try {
        let audioCtx = new window.AudioContext();
        let analyser = audioCtx.createAnalyser();
        let stream = audioCtx.createMediaStreamSource(mediaStream);
        stream.connect(analyser);
        analyser.fftSize = 2048;
        let bufferLength = analyser.frequencyBinCount;
        let dataArray = new Uint8Array(bufferLength);
        audioMetreTitle.innerHTML = audioMetreTitleOriginal
        audioMetreTitle.style.display = 'block'
        audioMetreTitle.onclick = () => null
        setInterval(function () {
            analyser.getByteTimeDomainData(dataArray)
            let max = dataArray.sort()[dataArray.length - 1]
            audioMetreBar.style.width = Math.min(1, audioGain.value * (max - 128) / 128) * videoNode.clientWidth + 'px'
        }
            , 50)
    } catch (error) {
        if (error.name === 'InvalidStateError') {
            audioMetreTitle.innerHTML = 'No audio track selected. Click to hide.'
            audioMetreTitle.onclick = () => audioMetreTitle.style.display = 'none'
            console.log('Nil audio recorded.')
        } else {
            console.log(error)
        }
        return
    }
    // audioMetreBar.style.width = videoNode.clientWidth + 'px';

}

async function startCapture(displayMediaOptions, type) {
    let captureStream = null;
    let previewVideo = videoNode;
    try {
        if (type == 'screen') {
            captureStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions
            );
        } else if (type == 'camera') {
            captureStream = await navigator.mediaDevices.getUserMedia(displayMediaOptions
            );
        }
        previewVideo.srcObject = captureStream;
        mediaStream = captureStream;
        captureStream.oninactive = () => {
            console.log('Capture ended by user.')
            previewPanel.style.display = 'none'
            recordButton.disabled = true
        }
        previewVideo.volume = 0
        previewVideo.play()
        try {
            audioMetre();
        } catch (error) {
            console.log('Error: ' + error)
        }
        logInfo();
        previewPanel.style.display = 'block';
        console.log('Screen capture set up.')
        recordButton.disabled = false;
        status.value = 'Not recording.'
    } catch (error) {
        if (error.name === 'NotAllowedError') {
            console.log('Capture permission denied.')
        } else {
            console.error('Error: ' + error);
        }
    }
}


function handleDataAvailable(event) {
    if (event.data && event.data.size > 0) {
        recordedBlobs.push(event.data);
    }
    console.log('Download available.')
}

function startRecording() {
    recordedBlobs = [];
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm;codecs=vp8' });
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start();
    console.log('Recording started.');
    let startTime = Date.now()
    status.value = 'Recording'
    status.disabled = false
    status_duration.style.display = 'inline-block'
    timer = setInterval(function () {
        let duration = Math.round((Date.now() - startTime) / 1000)
        let seconds = ('0' + duration % 60).slice(-2)
        let minutes = ('0' + Math.floor(duration / 60)).slice(-2)
        let hours = Math.floor(duration / 3600)
        status_duration.value = hours + ':' + minutes + ':' + seconds
    }, 1000)
}

function stopRecording() {
    mediaRecorder.stop();
    console.log('Recording stopped.');
    clearInterval(timer);
    status.innerHTML = 'Recording stopped. ' + status.innerHTML
    status.value = 'Not recording'
    status.disabled = true
}

function downloadRecording() {
    const blob = new Blob(recordedBlobs, { type: 'video/webm' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    let name = document.getElementById('download-name').value
    if (name === '') {
        name = 'Video'
    }
    a.style.display = 'none';
    a.href = url;
    a.download = name + '.webm';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
    console.log('Recording downloaded: ' + a.download)
}

function createLogo() {
    var canvas = document.createElement('svg');
    let canvasHeight = 50
    var radius = 200
    canvas.appendChild()
}