var general = {};
module.exports = general;
const {ipcRenderer} = require('electron');
//Without the ../ it looks inside node_modules
const dataAccess = require('./../js/dataAccess.js');

var maxWeightage = 100000;

var totalTagsCount; 
var targetWeightage;

/* 
 * Return target weightage from DB; if not in DB,
 * take current weightage's closest multiple of 100 as target and set it in DB too 
 */
general.getTargetWeightage = async function getTargetWeightage() {
    var targetWeightage = parseInt(await dataAccess.getParam('targetWeightage'));
    if (targetWeightage == null || isNaN(targetWeightage)) { //if not in DB, init and add to DB
        var totalWeightage = parseInt(await dataAccess.getTotalWeightage());
        targetWeightage = totalWeightage + (maxWeightage-totalWeightage)%100;
        console.log('NaN/null, so targetWeightage is: ' + targetWeightage);
        dataAccess.addParam({key: 'targetWeightage', value: targetWeightage});
    }
    return targetWeightage;
};
general.getTargetWeightage().then((targetWeightage) => {
    this.targetWeightage = targetWeightage;
});

general.setTargetWeightage = async function setTargetWeightage(targetWeightage) {
    var isValidParam = targetWeightage != null && !isNaN(targetWeightage);
    if (isValidParam) {
        dataAccess.addParam({key: 'targetWeightage', value: targetWeightage});
    }
    return isValidParam;
};

/* Number of unique Tags in the DB; cache it when called the first time.
 * If param invalidate isn't null, invalidates cache
 */
general.getTotalTagsCount = async function getTotalTagsCount(invalidate) {
    if (invalidate == null && totalTagsCount != null) {
        return totalTagsCount;
    }
    var allTags = await dataAccess.getTags();
    totalTagsCount = Object.keys(allTags).length;
    return totalTagsCount;
}; 
general.getTotalTagsCount().then((totalTagsCount) => {
    this.totalTagsCount = totalTagsCount;
});

/*
 * Shows a standard toast with given message and color
 */
general.showToast = function showToast(message, color) {
    $('main')
        .toast({
            message: message,
            position: 'bottom right',
            displayTime: 3000,
            class: color
        });
};


//Handle updates
//Update available popup
general.updatePopup = function updatePopup(info) {
    if (info.releaseNotes != null) {
        $('#release-notes').html('<p>Release notes</p>' + info.releaseNotes + '<br><div class="ui divider"></div>');
    }
    $('.update.ui.modal')
        .modal({
            onApprove: function() {
                if ($('#update-checkbox')[0].checked) {
                    console.log('checked');
                    alwaysUpdate('true');
                }
                console.log('approved');
                updateAndQuit();
            }
        })
        .modal('show');
};

//To update and quit immediately
function updateAndQuit() {
    console.log('sending updateAndQuit');
    ipcRenderer.send('updater-action', 'updateAndQuit');
}

//To always update when user quits the application
alwaysUpdate();
async function alwaysUpdate(inputFlag) {
    var autoUpdateFlag = await dataAccess.getParam('autoUpdate');
    //If first startup
    if (inputFlag == null) {
        inputFlag = (autoUpdateFlag == 'true');
    } else {
        //When flag is received explicitly, set in DB also
        dataAccess.addParam({key: 'autoUpdate', value: inputFlag});
    }
    //Update the current state in the app
    ipcRenderer.send('updater-action', {action: 'alwaysUpdate', flag: inputFlag});
}


//Trigger check for update
//If update is present, ask if you want to update along with release notes 
//If yes, trigger update
//If no, do nothing
var errorMessageCount = 0;

function checkForUpdates() {
    ipcRenderer.send('updater-action', 'checkForUpdates');
    errorMessageCount = 0;
}
checkForUpdates();
//Ask if you want to update with release notes when a new update is downloaded
ipcRenderer.on('updater-action-response', (event, arg) => {
    if (arg[0] == 'updateDownloaded') {
        var info = arg[1];
        console.log('received info in index.js');
        general.updatePopup(info);
        //Ask if you want to update, with release notes
    }
    //Display if there's an error; is displayed only 2 times, unless checkForUpdates is clicked again
    if (arg[0] == 'error') {
        errorMessageCount++;
        if (errorMessageCount < 3) {
            //Todo Display error message
            //console.log('error: ' + arg[1]);
        }
    }
});

general.renderSettingsModal = async function renderSettingsModal() {
    if (targetWeightage == null) {
        targetWeightage = await general.getTargetWeightage();
    }
    //Initialize autoUpdate checkbox
    var autoUpdateFlag = await dataAccess.getParam('autoUpdate');
    if (autoUpdateFlag == 'true') {
        $('#settings__update-checkbox')[0].checked = true;
    } else {
        $('#settings__update-checkbox')[0].checked = false;
    }
    
    //Initialize Slider
    var totalWeightage = await dataAccess.getTotalWeightage();
    var minWeightageLimit = totalWeightage + (maxWeightage-totalWeightage)%100;
    $('.ui.target.slider')
        .slider({
            min: minWeightageLimit,
            max: 10000,
            start: 0,
            step: 100,
            onMove: function(targetPointsInput) {
                $('#settings__target-slider-text').html(targetPointsInput);
            }
        });
    console.log(targetWeightage);
    $('.ui.target.slider').slider('set value', targetWeightage);
    $('#settings__target-slider-text').html(targetWeightage); //Init text box next to the slider
};

//Saves settings passed from Settings Modal
general.saveSettings = function saveSettings() {
    var changesMade = false;
    //Set auto-update property
    if ($('#settings__update-checkbox')[0].checked) {
        alwaysUpdate('true');
    } else {
        alwaysUpdate('false');
    }
    //Set targetWeightage
    var targetText = $('#settings__target-slider-text');
    var newTargetWeightage = parseInt(targetText[0].innerText);

    if(targetWeightage != newTargetWeightage) {
        general.setTargetWeightage(newTargetWeightage);
        targetWeightage = newTargetWeightage;
        //Reinit progressBar and Wall
        changesMade = true;
    }
    return changesMade;
};


