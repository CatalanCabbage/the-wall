const remote = require('electron').remote;
//Without the ../ in require, it looks inside node_modules
const views = require('./../js/views.js');
const headerFooter = require('./../js/headerFooter.js');
const general = require('./../js/general.js');
const about = require('./../js/about.js');
if (general.isDevEnv()) { 
    //Added so that it can be tested from the console
    // eslint-disable-next-line no-unused-vars
    var dataAccess = require('./../js/dataAccess.js');
}

const win = remote.getCurrentWindow();
const {ipcRenderer} = require('electron');

var currentPanel = 'cards';

//Add version number to title
var version = remote.app.getVersion();
$('title').html('The Wall v' + version);

// When document has loaded, initialise
document.onreadystatechange = () => {
    if (document.readyState == 'complete') {
        handleTitleBarEvents();
        initEvents();
        if(!general.isDevEnv()) {
            general.checkForUpdates();
        }
    }
};

window.onbeforeunload = () => {
    /* If window is reloaded, remove win event listeners
    (DOM element listeners get auto garbage collected but not
    Electron win listeners as the win is not dereferenced unless closed) */
    win.removeAllListeners();
};



async function initEvents() {
    headerFooter.initEventListeners();
    
    //Rendering
    views.renderCardView();
    headerFooter.populateInputsDropdown();
    headerFooter.generateProgressBar();

    views.renderWallView();
    var theWallElem = $('#the-wall');
    var mainPanelsElem = $('#main-panels');
    theWallElem.addClass('force-hide');

    document.getElementById('title-bar__title').addEventListener('click', () => {
        switch (currentPanel) {
            case 'cards':
                theWallElem.removeClass('force-hide');
                mainPanelsElem.addClass('force-hide');
                currentPanel = 'wall';
                break;
            case 'wall':
                mainPanelsElem.removeClass('force-hide');
                theWallElem.addClass('force-hide');
                currentPanel = 'cards';
                break;
            default:
                theWallElem.addClass('force-hide');
                mainPanelsElem.removeClass('force-hide');
                currentPanel = 'cards';
                break;
        }
    });
}

//Handle minimise/close buttons
function handleTitleBarEvents() {
    document.getElementById('minimize-button').addEventListener('click', () => {
        win.minimize();
    });
    document.getElementById('close-button').addEventListener('click', () => {
        win.close();
    });
}

//For logging from main process
ipcRenderer.on('logger', (event, arg) => {
    console.log(arg);
});


//Handle settings
//Settings menu dropdown
$('.settings.ui.dropdown.left.button')
    .dropdown({
        action: 'hide',
        onChange: function(value) {
            handleSettingsMenu(value);
        }
    });

function handleSettingsMenu(value) {
    switch (value) {
        case 'settings':
            handleSettingsModal();
            break;
        case 'about':
            about.showAboutModal();
            break;
    }
}

function handleSettingsModal() {
    //Show modal
    $('.settings.ui.modal')
        .modal({
            onApprove: function() {
                var changesMade = general.saveSettings();
                console.log(changesMade);
                if (changesMade) {
                    renderTargetDependantViews();
                }
            }
        })
        .modal('show');
    //Render
    general.renderSettingsModal();
}

function renderTargetDependantViews() {
    headerFooter.generateProgressBar();
    views.renderWallView();
}