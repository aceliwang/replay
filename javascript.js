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
const audioMetreGraph = document.getElementById('audio-metre-graph')
const audioGain = document.getElementById('gain')
const echoCancellation = document.getElementById('echo-cancellation')
const noiseSuppression = document.getElementById('noise-suppression')
const autoGainControl = document.getElementById('auto-gain-control')
const status = document.getElementById('status');
const statusDuration = document.getElementById('duration');
const remainingDuration = document.getElementById('remaining');
const maximumDuration = document.getElementById('maximum-duration')
const recordStart = document.getElementById('recording-start')
const recordStop = document.getElementById('recording-stop')
const clearStart = document.getElementById('clear-recording-start')
const clearStop = document.getElementById('clear-recording-stop')
const clearMaximumDuration = document.getElementById('clear-maximum-duration')
const recordingHeightMin = document.getElementById('recording-height-min')
const recordingHeightMax = document.getElementById('recording-height-max')
const rangeHeight = document.getElementById('range-recording-height')
const clearHeight = document.getElementById('clear-recording-height')
const recordingWidthMin = document.getElementById('recording-width-min')
const recordingWidthMax = document.getElementById('recording-width-max')
const rangeWidth = document.getElementById('range-recording-width')
const clearWidth = document.getElementById('clear-recording-width')
const aspectRatioMin = document.getElementById('aspect-ratio-min')
const aspectRatioMax = document.getElementById('aspect-ratio-max')
const logo = document.getElementById('logo')
// log
console.log = msg => { logNode.innerHTML = logNode.innerHTML + `<br># ${msg}`; logNode.scrollTop = logNode.scrollHeight; };
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
var recordStartTime = new Date(0);
var recordStopTime = new Date(0);
var schedulerTriggered = false;
var global = {};

// init
let now = new Date(Date.now())
clockDate.innerText = now.toLocaleDateString()
clockTime.innerText = now.toLocaleTimeString()
setInterval(
    function () {
        now = new Date(Date.now())
        clockTime.innerText = now.toLocaleTimeString()
        clockDate.innerText = now.toLocaleDateString()
        if (mediaStream !== undefined
            && now.getTime() - recordStartTime.getTime() <= 1000
            && now.getTime() - recordStartTime.getTime() >= 0
            && !schedulerTriggered) {
            recordButton.click()
            schedulerTriggered = true;
            console.log('Scheduled recording started')
        }
        if (mediaStream !== undefined
            && now.getTime() - recordStopTime.getTime() <= 1000
            && now.getTime() - recordStopTime.getTime() >= 0
            && schedulerTriggered) {
            recordButton.click()
            schedulerTriggered = false;
            console.log('Scheduled recording stopped')
        }
    }, 1000)

console.log(JSON.stringify(navigator.mediaDevices.getSupportedConstraints()))
for (let prop in navigator.mediaDevices.getSupportedConstraints()) {
    // if (prop)
    try {
        let setting = prop.split(/([A-Z][a-z]+)/).filter(function (e) { return e }).map(e => e.toLowerCase()).join('-')
        document.getElementById(
            ((setting) != 'height' && (setting) != 'width' && (setting) != 'aspect-ratio') ?
                setting : ((setting) == 'aspect-ratio' ?
                    'aspect-ratio-min' : ('recording-' + setting + '-min'))).disabled = false
    } catch {

    }
}

window.addEventListener('beforeunload', function () { alert('hi'); return false; })
window.onbeforeunload = () => alert('hi')
document.body.onbeforeunload = () => alert('hi')

recordStart.onchange = function () {
    recordStartTime = new Date(recordStart.value)
    status.value = 'Scheduled'
    console.log('Recording scheduled at ' + recordStartTime.toLocaleString())
}

recordStart.onclick = function () {
    let max = new Date();
    let s = (time) => { return ("0" + time).slice(-2) };
    this.min = max.getFullYear() + "-" + s(max.getMonth() + 1) + "-" + s(max.getDate()) + "T" + s(max.getHours()) + ":" + s(max.getMinutes())
}

recordStop.onchange = function () {
    recordStopTime = new Date(recordStop.value)
    maximumDuration.disabled = true;
    remainingDuration.style.display = 'inline-block';
}

recordStop.onclick = function () {
    let max;
    if (recordStart.value == '') {
        max = new Date();
    } else {
        max = new Date(recordStart.value)
    }
    let s = (time) => { return ("0" + time).slice(-2) };
    this.min = max.getFullYear() + "-" + s(max.getMonth() + 1) + "-" + s(max.getDate()) + "T" + s(max.getHours()) + ":" + s(max.getMinutes())
}

clearStart.onclick = function () {
    status.value = 'Not recording'
    if (recordStart.value !== '') {
        console.log('Scheduled recording cancelled')
    }
    recordStart.value = ''
}

clearStop.onclick = function () {
    recordStop.value = ''
    maximumDuration.disabled = false;
    remainingDuration.style.display = 'none'
}

clearMaximumDuration.onclick = function () {
    maximumDuration.value = ''
}

clearHeight.onclick = function () {
    recordingHeightMin.value = ''
    recordingHeightMax.value = ''
    disableAspectRatio()
}

clearWidth.onclick = function () {
    recordingWidthMin.value = ''
    recordingWidthMax.value = ''
    disableAspectRatio()
}

rangeHeight.onclick = function () {
    if (recordingHeightMax.style.display == 'none') {
        recordingHeightMax.style.display = 'inline'
        recordingHeightMax.disabled = false
        recordingHeightMin.style.width = '102px'
        rangeHeight.style.color = 'black'
        rangeHeight.style.backgroundColor = 'white'
        recordingHeightMin.placeholder = 'Min'
    } else {
        recordingHeightMax.style.display = 'none'
        recordingHeightMax.disabled = true
        recordingHeightMin.style.width = '210px'
        recordingHeightMin.placeholder = ''
        rangeHeight.style.color = 'white'
        rangeHeight.style.backgroundColor = 'black'
    }
}

rangeWidth.onclick = function () {
    if (recordingWidthMax.style.display == 'none') {
        recordingWidthMax.style.display = 'inline'
        recordingWidthMax.disabled = false
        recordingWidthMin.style.width = '102px'
        rangeWidth.style.color = 'black'
        rangeWidth.style.backgroundColor = 'white'
        recordingWidthMin.placeholder = 'Min'
    } else {
        recordingWidthMax.style.display = 'none'
        recordingWidthMax.disabled = true
        recordingWidthMin.style.width = '210px'
        recordingWidthMin.placeholder = ''
        rangeWidth.style.color = 'white'
        rangeWidth.style.backgroundColor = 'black'
    }
}


let disableAspectRatio = function () {
    console.log('fire')
    console.log('Hmax' + recordingHeightMax.value)
    console.log('Hmin' + recordingHeightMin.value)
    console.log('Wmax' + recordingWidthMax.value)
    console.log('Wmin' + recordingWidthMin.value)
    if ((recordingHeightMin.value == '' && recordingHeightMax.value == '') ||
        (recordingWidthMin.value == '' && recordingWidthMax.value == '')) {
        aspectRatioMin.disabled = false
        aspectRatioMax.disabled = false
    } else {
        aspectRatioMin.disabled = true
        aspectRatioMax.disabled = true
    }
    // if (recordingHeightMax.value != '' &&
    //     recordingHeightMin.value != '' &&
    //     recordingWidthMax.value != '' &&
    //     recordingWidthMin.value != '') {
    //     console.log('true')
    //     aspectRatioMin.disabled = false
    //     aspectRatioMax.disabled = false
    // } else {
    //     aspectRatioMin.disabled = true
    //     aspectRatioMax.disabled = true
    // }
}

recordingHeightMin.oninput = () => disableAspectRatio()
recordingHeightMax.oninput = () => disableAspectRatio()
recordingWidthMin.oninput = () => disableAspectRatio()
recordingWidthMax.oninput = () => disableAspectRatio()

settingsButton.onclick = function () {
    if (settingsPanel.style.display === 'none') {
        settingsPanel.style.display = 'block'
        // logo.style.display = 'none'
        logo.style.height = 0
        logo.style.top = '50%'
        // console.log('true')
        // logo.style.animation = '1s logo-exit-rotate 1 cubic-bezier(0.8, 0.05, 0.795, 0.035);'
        // logo.onanimationend = () => {logo.style.display = 'none'}
    } else if (settingsPanel.style.display === 'block') {
        settingsPanel.style.display = 'none'
        // logo.style.display = 'block'
        if (previewPanel.style.display != 'block' && infoPanel.style.display == 'none') {
            logo.style.height = '40vh'
            logo.style.top = 'calc(50% - 20vh)'
        }
    }
}

infoButton.onclick = function () {
    if (infoPanel.style.display === 'none') {
        infoPanel.style.display = 'block'
        // logo.style.display = 'none'
        logo.style.height = 0
        logo.style.top = '50%'
    } else if (infoPanel.style.display === 'block') {
        infoPanel.style.display = 'none'
        // logo.style.display = 'block'
        if (previewPanel.style.display != 'block' && settingsPanel.style.display == 'none') {
            logo.style.height = '40vh'
            logo.style.top = 'calc(50% - 20vh)'
        }
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
    console.log('Recording button clicked')
    console.log('scheduler triggered ' + schedulerTriggered)
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
    logNode.innerHTML = '# Log<br>'
}

// settings
const settingsToggles = [echoCancellation, noiseSuppression, autoGainControl]
settingsToggles.forEach(function (item) {
    item.onclick = function () {
        if (item.value === 'On') {
            item.value = 'Off'
            item.style.backgroundColor = 'black'
            item.style.color = 'white'
        } else {
            item.value = 'On'
            item.style.backgroundColor = 'white'
            item.style.color = 'black'
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
            // cursor: String(document.getElementById('cursor').value),
            // cursor: "motion",
            frameRate: 999,
            aspectRatio: 18,
            height: 700,
            width: 600,
            zoom: 1,
            // CAMERA
            // if width OR height OR aspectRatio (single): all good
            // if 
            // if (width AND height)
            // MONITOR
            // if width + height + aspectRatio: width takes priority, then width, aspect ratio is calculated
            //
        }
    };
    console.log('form' + String(document.getElementById('cursor').value))
    console.log('seen' + displayMediaOptions.video.cursor)
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
        delete global.audioCtx;
        delete global.analyser;
        delete global.stream;
        global.audioCtx = new window.AudioContext();
        global.analyser = global.audioCtx.createAnalyser();
        global.stream = global.audioCtx.createMediaStreamSource(mediaStream);
        global.stream.connect(global.analyser);
        global.analyser.fftSize = 2048;
        let bufferLength = global.analyser.frequencyBinCount;
        let dataArray = new Uint8Array(bufferLength);
        audioMetreTitle.innerHTML = audioMetreTitleOriginal
        audioMetreTitle.style.display = 'block'
        audioMetreTitle.onclick = () => null
        let graphArray = new Array(50).fill(0)
        setInterval(function () {
            // console.log(graphArray)
            global.analyser.getByteTimeDomainData(dataArray)
            let max = dataArray.sort()[dataArray.length - 1]
            audioMetreBar.style.width = Math.min(1, audioGain.value * (max - 128) / 128) * videoNode.clientWidth + 'px'
            // graphArray.shift()
            // graphArray.push(max)
            // arrayText = graphArray.map((value, index) => {return (index == 0 ? 'M' : 'L') + index  + ' ' + value})
            // audioMetreGraph.setAttribute('d', 'M 0 0 l 1 ' + arrayText.join(' l 1 ') + ' Z')

        }
            , 50)
    } catch (error) {
        if (error.name === 'InvalidStateError') {
            audioMetreTitle.innerHTML = 'No audio track selected.&nbsp;<i class="material-icons">delete_forever</i>'
            audioMetreTitle.onclick = () => audioMetreTitle.style.display = 'none'
            audioMetreBar.style.width = '0px'
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
    statusDuration.style.display = 'inline-block'
    if (maximumDuration.value || recordStop.value) {
        remainingDuration.style.display = 'inline-block'
    }
    timer = setInterval(function () {
        let duration = Math.floor((Date.now() - startTime) / 1000)
        if (!schedulerTriggered && maximumDuration.value != '' && duration >= Number(maximumDuration.value)) {
            recordButton.click()
        }
        let seconds = ('0' + duration % 60).slice(-2)
        let minutes = ('0' + Math.floor((duration / 60) % 60)).slice(-2)
        let hours = Math.floor(duration / 3600)
        statusDuration.value = hours + ':' + minutes + ':' + seconds
        if (maximumDuration.value || recordStop.value) {
            let remaining = Math.floor((maximumDuration.value != '' ?
                maximumDuration.value - duration :
                (recordStopTime - Date.now()) / 1000))
            console.log(remaining)
            let rseconds = ('0' + remaining % 60).slice(-2)
            let rminutes = ('0' + Math.floor((remaining / 60) % 60)).slice(-2)
            let rhours = Math.floor(remaining / 3600)
            remainingDuration.innerHTML = '<i class="material-icons">event_busy</i><span>&nbsp;' + rhours + ':' + rminutes + ':' + rseconds + '</span>'
        }
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
    let name = (name == '') ? 'Video' : document.getElementById('download-name').value
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