const logNode = document.getElementById('log');
const videoNode = document.getElementById('preview');
const setupButton = document.getElementById('setup');
const recordButton = document.getElementById('record');
const downloadButton = document.getElementById('download');
const videoDiv = document.getElementById('video_resize')
const previewPanel = document.getElementById('preview_panel')
const controlPanel = document.getElementById('controls_panel')
const audioMetreBar = document.getElementById('metre')
console.log = msg => logNode.innerHTML = `${msg}<br>` + logNode.innerHTML;
console.error = msg => `<br><span class='error'>${msg}</span><br>` + logNode.innerHTML;
console.warn = msg => `<br><span class='warn'>${msg}<span><br>` + logNode.innerHTML;
console.info = msg => `<br><span class='info'>${msg}</span><br>` + logNode.innerHTML;

let mediaRecorder;
let recordedBlobs;
let mediaStream;
let timer;

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

function parseOptions() {
    var displayMediaOptions = {
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
        },
        video: {
            cursor: 'always'
        }
    };
    return displayMediaOptions;
}

function logInfo() {
    let videoTrack = videoNode.srcObject.getVideoTracks()[0];
    console.info('Track settings:');
    console.info(JSON.stringify(videoTrack.getSettings(), null, 2));
    console.info('Track constraints:');
    console.info(JSON.stringify(videoTrack.getConstraints(), null, 2));
}

function audioMetre() {
    let audioCtx = new window.AudioContext();
    let analyser = audioCtx.createAnalyser();
    let stream = audioCtx.createMediaStreamSource(mediaStream);
    stream.connect(analyser);
    analyser.fftSize = 2048;
    let bufferLength = analyser.frequencyBinCount;
    let dataArray = new Uint8Array(bufferLength);
    // console.log(dataArray)
    audioMetreBar.style.width = videoNode.clientWidth + 'px';
    setInterval(function () {
        analyser.getByteTimeDomainData(dataArray)
        let max = dataArray.sort()[dataArray.length - 1]
        audioMetreBar.style.width = ((max - 128) / 128) * videoNode.clientWidth + 'px'
    }
        , 50)
}

async function startCapture(displayMediaOptions) {
    let captureStream = null;
    let previewVideo = document.getElementById('preview');
    try {
        captureStream = await navigator.mediaDevices.getDisplayMedia(
            displayMediaOptions
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
    var a = document.createElement('span');
    a.innerHTML = 0
    controlPanel.appendChild(a);
    timer = setInterval(function () {
        a.innerHTML = Number(a.innerHTML) + 1
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
    a.style.display = 'none';
    a.href = url;
    a.download = 'Video.webm';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}