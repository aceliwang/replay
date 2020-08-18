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
const audioGain = document.getElementById('gain')
// log
console.log = msg => logNode.innerHTML = `${msg}<br>` + logNode.innerHTML;
console.error = msg => logNode.innerHTML = `<br><span class='error'>${msg}</span><br>` + logNode.innerHTML;
console.warn = msg => `<br><span class='warn'>${msg}<span><br>` + logNode.innerHTML;
console.info = msg => logNode.innerHTML = `<br><span class='info'>${msg}</span><br>` + logNode.innerHTML;
// variables
var mediaRecorder;
var recordedBlobs;
var mediaStream;
var timer;

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
    startCapture(options);
    recordButton.disabled = false;
}

recordButton.onclick = function () {
    switch (recordButton.value) {
        case 'Record':
            startRecording();
            recordButton.value = 'Stop';
            downloadButton.disabled = true;
            break;
        case 'Stop':
            stopRecording();
            recordButton.value = 'Record';
            setupButton.disabled = false;
            downloadButton.disabled = false;
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

// https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints
function parseOptions() {
    var displayMediaOptions = {
        audio: {
            // echoCancellation: document.getElementById('echoCancellation').value(),
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
        },
        video: {
            cursor: 'always',
            frameRate: 120,
            aspectRatio: 3.2,
            height: 320,
            width: 320,
// MONITOR
    // if width + height + aspectRatio: width takes priority
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
        setInterval(function () {
            analyser.getByteTimeDomainData(dataArray)
            let max = dataArray.sort()[dataArray.length - 1]
            audioMetreBar.style.width = Math.min(1, audioGain.value * (max - 128) / 128) * videoNode.clientWidth + 'px'
        }
            , 50)
    } catch (error) {
        console.log(error)
        console.log("hello")
        return
    }
    // audioMetreBar.style.width = videoNode.clientWidth + 'px';
    
}

async function startCapture(displayMediaOptions) {
    let captureStream = null;
    let previewVideo = document.getElementById('preview');
    try {
        captureStream = await navigator.mediaDevices.getDisplayMedia(
            parseOptions()
        );
        previewVideo.srcObject = captureStream;
        mediaStream = captureStream;
        previewVideo.volume = 0
        previewVideo.play()
        try {
            audioMetre();
        } catch (error) {
            console.log('Error: ' + error)
        }
        logInfo();
        previewPanel.style.display = 'block';
        console.log('Capture setup.')
    } catch (error) {
        console.error('Error:' + error);
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
    var a = document.createElement('span');
    controlPanel.appendChild(a);
    timer = setInterval(function () {
        let duration = Math.round((Date.now() - startTime) / 1000)
        let seconds = ('0' + duration % 60).slice(-2)
        let minutes = ('0' + Math.floor(duration / 60)).slice(-2)
        let hours = Math.floor(duration / 3600)
        a.innerHTML = hours + ':' + minutes + ':' + seconds
    }, 1000)
}

function stopRecording() {
    mediaRecorder.stop();
    console.log('Recording stopped.');
    clearInterval(timer);
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