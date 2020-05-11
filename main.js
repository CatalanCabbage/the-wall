const { app, BrowserWindow } = require('electron')
require('electron-reload')('./src/js');
const {autoUpdater} = require('electron-updater'); 
const {ipcMain} = require('electron');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    width: 850,
    height: 550,
    webPreferences: {
      nodeIntegration: true
    },
      frame: false,
      show: false
  })
  // and load the index.html of the app.
  win.loadFile('./src/html/index.html')
  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}

//Introduce splash-screen to reduce jarring page load delay of main window
var splashScreen
function createSplashWindow () {
  splashScreen = new BrowserWindow({
    width: 850,
    height: 550,
    frame: false
  })
  splashScreen.loadFile('./src/html/test.html');
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () =>{
  createSplashWindow();
  createWindow();
  win.once('ready-to-show', () => {
    win.show();
    splashScreen.destroy();
  });
  win.webContents.openDevTools();
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

//Handle updates
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false;
//To be handled: check for updates with release notes as response, update
ipcMain.on('updater-action', (event, arg) => {
  if (arg == 'checkForUpdates') {
    autoUpdater.checkForUpdates();
  }
  //Indicate that there's an update
  autoUpdater.on('update-downloaded', (info) => {
    event.sender.send('updater-action-response', ['updateDownloaded', info]);
  })

  autoUpdater.on('error', (err) => {
    console.log('Error in auto-updater. ' + err);
    event.sender.send('updater-action-response', ['error', err]);
  })
  
  //Will always update while quitting
  if (arg == 'alwaysUpdate') {
    autoUpdater.autoInstallOnAppQuit = true;    
  }

  //Update and force quit
  if (arg = 'updateAndQuit') {
    autoUpdater.quitAndInstall();
  }
  
  


  //For debugging---------------
  autoUpdater.on('update-available', (info) => {
    console.log('Update available.');
  })
  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available.');
  })
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update');
  })
  //For debuging----------------
})

