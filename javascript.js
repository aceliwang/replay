// buttons
const screenSetupButton = document.getElementById('setup-screen');
const cameraSetupButton = document.getElementById('setup-camera');
const recordButton = document.getElementById('record');
const downloadButton = document.getElementById('download');
const settingsButton = document.getElementById('settings');
const infoButton = document.getElementById('info');
const logCopy = document.getElementById('copy_log');
const logClear = document.getElementById('clear_log');
// divs
const videoDiv = document.getElementById('video_resize')
const previewPanel = document.getElementById('preview_panel')
const controlPanel = document.getElementById('controls_panel')
const settingsPanel = document.getElementById('settings_panel')
const infoPanel = document.getElementById('info_panel')
const clockDate = document.getElementById('clock-date')
const clockTime = document.getElementById('clock-time')
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
const maximumDuration = document.getElementById('maximum-duration')
const recordStart = document.getElementById('recording-start')
const recordStop = document.getElementById('recording-stop')
const clearStart = document.getElementById('clear-recording-start')
const clearStop = document.getElementById('clear-recording-stop')
const logo = document.getElementById('logo')
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
var recordingBlob;
var url;
var recordStartTime = new Date();
var recordStopTime = new Date();
var schedulerTriggered = false; 

// init
let now = new Date(Date.now())
clockDate.innerText = now.toLocaleDateString()
clockTime.innerText = now.toLocaleTimeString()
setInterval(
    function () {
        now = new Date(Date.now())
        clockTime.innerText = now.toLocaleTimeString()
        clockDate.innerText = now.toLocaleDateString()
        console.log(now.getUTCSeconds() == recordStartTime.getUTCSeconds())
        if (mediaStream !== undefined && now.getUTCSeconds() == recordStartTime.getUTCSeconds() && !schedulerTriggered) {
            recordButton.click()
            schedulerTriggered = true;
        }
        if (mediaStream !== undefined && now.getUTCSeconds() == recordStopTime.getUTCSeconds() && schedulerTriggered) {
            recordButton.click()
            schedulerTriggered = false;
        }
    }, 1000)

recordStart.onchange = function() {
    recordStartTime = new Date(recordStart.value)
    status.value = 'Scheduled'
    console.log('Recording scheduled at ' + recordStartTime.toLocaleString())
}

recordStop.onchange = function() {
    recordStopTime = new Date(recordStop.value)
}

clearStart.onclick = function() {
    status.value = 'Not recording'
    if (recordStart.value !== '') {
        console.log('Scheduled recording cancelled')
    }
    recordStart.value = ''
}

clearStop.onclick = function() {
    recordStop.value = ''
}


settingsButton.onclick = function () {
    if (settingsPanel.style.display === 'none') {
        settingsPanel.style.display = 'block'
        logo.style.display = 'none'
    } else if (settingsPanel.style.display === 'block') {
        settingsPanel.style.display = 'none'
        logo.style.display = 'block'
    }
}

infoButton.onclick = function () {
    if (infoPanel.style.display === 'none') {
        infoPanel.style.display = 'block'
    } else if (infoPanel.style.display === 'block') {
        infoPanel.style.display = 'none'
    }
}

cameraSetupButton.onclick = function () {
    let options = parseOptions();
    startCapture(options, 'camera');
}

screenSetupButton.onclick = function () {
    let options = parseOptions();
    startCapture(options, 'screen');
}

recordButton.onclick = function () {
    switch (recordButton.firstElementChild.innerText) {
        case 'stop_circle':
            startRecording();
            recordButton.firstElementChild.innerText = 'stop';
            downloadButton.disabled = true;
            settingsButton.disabled = true;
            cameraSetupButton.disabled = true;
            screenSetupButton.disabled = true;
            break;
        case 'stop':
            stopRecording();
            recordButton.firstElementChild.innerText = 'stop_circle';
            cameraSetupButton.disabled = false;
            screenSetupButton.disabled = false;
            downloadButton.disabled = false;
            settingsButton.disabled = false;
            status.value = 'Recording stopped'
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

logCopy.onclick = function () {
    navigator.clipboard.writeText(logNode.innerText)
}

logClear.onclick = function () {
    logNode.innerHTML = '# Log'
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
        console.log(item.id + ' turned ' + item.value)
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
        console.log(type + ' capture set up.')
        if (type == 'camera') {

        }
        recordButton.disabled = false;
        status.value = 'Not recording'
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
    recordingBlob = new Blob(recordedBlobs, { type: 'video/webm' });
    url = window.URL.createObjectURL(recordingBlob);
    videoNode.src = url
    videoNode.srcObject = null
    videoNode.controls = true
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
        let duration = Math.floor((Date.now() - startTime) / 1000)
        if (maximumDuration.value != '' && duration >= Number(maximumDuration.value)) {
            recordButton.click()
        }
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