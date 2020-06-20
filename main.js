const {app, BrowserWindow} = require('electron');
require('electron-reload')('./src/js');
const {autoUpdater} = require('electron-updater');
const {ipcMain} = require('electron');

let isDev = false;
if (process.env.NODE_ENV === 'dev') {
    isDev = true;
    require('dotenv').config();
}
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow() {
    // Create the browser window.
    win = new BrowserWindow({
        show: false,
        width: 850,
        height: 550,
        webPreferences: {
            nodeIntegration: true
        },
        frame: false
    });
    // and load the index.html of the app.
    win.loadFile('./src/html/index.html');
    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null;
    });
}

app.commandLine.appendSwitch('disable-http2');

//Introduce splash-screen to reduce jarring page load delay of main window
var splashScreen;

function createSplashWindow() {
    splashScreen = new BrowserWindow({
        width: 850,
        height: 550,
        frame: false
    });
    splashScreen.loadFile('./src/html/splashScreen.html');
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows
app.on('ready', () => {
    createSplashWindow();
    //Creating window immediately causes a white flicker on startup; thus, create after 500ms
    setTimeout(function() {
        createWindow();
        //Loading main window takes time; show lightweight splash screen for 2500ms
        //Total app startup time is now 3000ms
        win.once('ready-to-show', () => {
            setTimeout(function() {
                win.show();
                splashScreen.destroy();
            }, 2500);
            if (isDev) {
                win.webContents.openDevTools();
            }
        });
    }, 500);
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow();
    }
});

//Handle updates
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false;
var releaseBranch = process.env.RELEASE_BRANCH || 'release';
autoUpdater.requestHeaders = {'Cache-Control' : 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'};
console.log(releaseBranch);
var url = 'http://gitlab.com/api/v4/projects/16527632/jobs/artifacts/' + releaseBranch + '/raw/dist?job=build';
console.log(url);
autoUpdater.setFeedURL({
    provider: 'generic',
    channel: 'latest',
    url: url
});
ipcMain.on('updater-action', (event, arg) => {
    //event.sender.send('logger', 'from mainnnnnnnnn');
    if (arg == 'checkForUpdates') {
        autoUpdater.checkForUpdates();
    }
    //Indicate that there's an update
    autoUpdater.on('update-downloaded', (info) => {
        event.sender.send('updater-action-response', ['updateDownloaded', info]);
    });

    autoUpdater.on('error', (err) => {
        console.log('Error in auto-updater. ' + err);
        event.sender.send('updater-action-response', ['error', err]);
    });

    //Will decide if app always updates while quitting
    if (arg.action == 'alwaysUpdate') {
        if (arg.flag != null) {
            autoUpdater.autoInstallOnAppQuit = (arg.flag == 'true');
            console.log('set AutoUpdater value');
        }
    }

    //Update and force quit
    if (arg == 'updateAndQuit') {
        autoUpdater.quitAndInstall();
    }

    //For debugging---------------
    autoUpdater.on('update-available', (info) => {
        console.log('Update available.');
        console.log(info);
    });
    autoUpdater.on('update-not-available', (info) => {
        console.log('Update not available.');
        console.log(typeof info);
    });
    autoUpdater.on('checking-for-update', (info) => {
        console.log('Checking for update');
        console.log(info);
    });
    //For debugging----------------
});