const vlog = {};
module.exports = vlog;

const electron = require('electron');
const BrowserWindow = electron.remote.BrowserWindow; 
const app = electron.remote.app;
const path = require('path');
const fs = require('fs'); 
const {desktopCapturer} = require('electron');

var imgDir = path.join(app.getPath('pictures'), 'the-wall', 'screenshots');

var recording = false;
var blobs = [];
var recorder;
vlog.captureVideo = async function captureVideo() {
    if (!recording) {
        startRecording();
    } else {
        stopRecording();
    }
};

async function startRecording() {
    var title = document.title;
    //Sources, name: Title in HTML || Title in JS || "name" in package.json || "Electron"
    var sources = await desktopCapturer.getSources({types: ['window', 'screen']});
    sources.forEach((src) => {
        if (src.name == title) {
            navigator.webkitGetUserMedia({
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: src.id,
                        minWidth: 800,
                        maxWidth: 1280,
                        minHeight: 500,
                        maxHeight: 720
                    }
                }
            }, handleStream, handleUserMediaError);
            return;
        }
    });
}

function handleStream(stream) {
    recorder = new MediaRecorder(stream);
    console.time('Recording');
    blobs = [];
    recorder.start();
    recorder.ondataavailable = function(event) {
        blobs.push(event.data);
    };
}
function handleUserMediaError(e) {
    console.error('handleUserMediaError', e);
}

async function stopRecording() {
    recorder.stop();
    await new Promise(r => setTimeout(r, 2000)); //Give time for one last ondataavailable
    var blob = new Blob(blobs, {type: 'video/mp4'});    
    toArrayBuffer(blob, function(ab) {
    //toArrayBuffer(blobs[0], function(ab) {
        var buffer = toBuffer(ab);
        var fileName = 'vid1.mp4';
        var vidPath = path.join(imgDir, fileName);
        fs.writeFile(vidPath, buffer, function(err) {
            if (err) {
                console.error('Failed to save video ' + err);
            } else {
                console.log('Saved video: ' + vidPath);
            }
        });
    });
}

function toArrayBuffer(blob, cb) {
    var fileReader = new FileReader();
    fileReader.onload = function() {
        let arrayBuffer = this.result;
        cb(arrayBuffer);
    };
    fileReader.readAsArrayBuffer(blob);
}

function toBuffer(ab) {
    let buffer = new Buffer(ab.byteLength);
    let arr = new Uint8Array(ab);
    for (let i = 0; i < arr.byteLength; i++) {
        buffer[i] = arr[i];
    }
    return buffer;
}

vlog.captureScreen = async function captureScreen() {
    await startRecording(); //To be removed
    await new Promise(r => setTimeout(r, 2000));
    stopRecording();
    let win = BrowserWindow.getFocusedWindow();
    var fileName = 'capture2.jpeg';
    var imgPath = path.join(imgDir, fileName);
    if (!fs.existsSync(imgDir)) {
        fs.mkdirSync(imgDir, {recursive: true});
    }
    //CapturePage can have optional size params: {x: 0, y: 0, width: 800, height: 600}
    if(win == null) {
        console.log('No focussed window');
        return;
    }
    var img = await win.webContents.capturePage()
        .catch(err => {
            console.log(err);
        });
    fs.writeFile(imgPath,  
        img.toJPEG(100), 'base64', function (err) { 
            if (err) {
                throw err;
            } 
            console.log('Saved!'); 
        }); 
};

