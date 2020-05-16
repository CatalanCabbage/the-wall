const remote = require('electron').remote;
const dataAccess = require('./../js/dataAccess'); //Without the ../ it looks inside node_modules
const win = remote.getCurrentWindow();
const {ipcRenderer} = require('electron');

// When document has loaded, initialise
document.onreadystatechange = (event) => {
    if (document.readyState == "complete") {
        handleWindowControls();
        initEvents();
    }
};

window.onbeforeunload = (event) => {
    /* If window is reloaded, remove win event listeners
    (DOM element listeners get auto garbage collected but not
    Electron win listeners as the win is not dereferenced unless closed) */
    win.removeAllListeners();
}
function handleWindowControls() {
    // Make minimise/maximise/restore/close buttons work when they are clicked
    document.getElementById('minimize-button').addEventListener("click", event => {
        win.minimize();
    });

    document.getElementById('close-button').addEventListener("click", event => {
        win.close();
    });
}
async function addMainPanels() {
    var mainPanelsElem = $("#main-panels");
    var panelElements = "", name, id;
    var sectionsResponse = await dataAccess.getWeightageOfSections();
    var sections = sectionsResponse[0];
    var numberOfSections = sectionsResponse[1];
    //When very few Cards are present, they expand in height to take up the full container
    //Need to limit heights manually when very few are present 
    var limitCardHeight = '';
    if (numberOfSections <= 4) {
        limitCardHeight = 'card--small';
    }

    for (var key in sections) {
        var section = sections[key];
        id = key;
        name = section.name;
        total = section.total;
        completed = section.completed;
        var panelTemplate = '<div class="panel ' + limitCardHeight + ' card" id="section' + id + '">'
                + '<div class="panel black ui statistic"><div class="value">' + completed + '</div><div class="label">' + total + '</div></div>'
                + '<div class="panel content">' + name + '</div>'
                + '</div>';
        panelElements = panelElements + panelTemplate;
    };
    //Set number of columns depending on number of sections
    if (numberOfSections == 0) {
        //Show splash screen, getting started
    } else if (numberOfSections == 1) {
        mainPanelsElem.addClass('one');
    } else if (numberOfSections >= 2 && numberOfSections <= 4) {
        mainPanelsElem.removeClass('one');
        mainPanelsElem.addClass('two');
    } else {
        mainPanelsElem.removeClass('two');
        mainPanelsElem.addClass('three');
    }
    mainPanelsElem.html(panelElements);
}
function initEvents() {
    //Handling for 'Submit'
    document.getElementById('task-submit-btn').addEventListener('click', event => {
        addTask();
    });
    document.getElementById('task-input__points').addEventListener('focusout', event => {
        validatePoints();
    });
    addMainPanels();
    populateInputsDropdown();
}
async function addTask() {
    let taskNameInp = document.getElementById('task-input__task');
    let sectionNameInp = document.getElementById('task-input__section');
    let pointsInp = document.getElementById('task-input__points');
    if (!isValidInput()) {
        return;
    }
    let points = parseInt(pointsInp.value);
    console.log(sectionNameInp.value.toString().toLowerCase());
    let sectionObj = await dataAccess.getSection(sectionNameInp.value.toString().toLowerCase());
    if(sectionObj == null) {
        //If null, add the Section
        sectionObj = await dataAccess.addSection({name: sectionNameInp.value.toString().toLowerCase(), parentSectionId: 0});
    }
    console.log(sectionObj);
    let sectionId = sectionObj.id;
    let taskInpObj = {
        name: taskNameInp.value,
        desc: "--", 
        status: "completed", 
        weightage: points, 
        parentSectionId: sectionId
    }
    taskObj = await dataAccess.addTask(taskInpObj);
    console.log(taskObj);
    overallWeightage = await dataAccess.getOverallWeightage();
    console.log(overallWeightage);
    //Clear inputs
    $('.ui.dropdown').dropdown('restore defaults');
    pointsInp.value = '';
    
    addMainPanels(); //Needs to update main panels on adding new entry
    populateInputsDropdown(); // Needs to update dropdown
    //Added toast
    showToast('Task ' + taskNameInp.value + ' added with ' + points + ' points!', 'green');
}

function isValidInput() {
    var valid = true;
    let taskNameInp = document.getElementById('task-input__task');
    let sectionNameInp = document.getElementById('task-input__section');
    let pointsInp = document.getElementById('task-input__points');

    //Check empty
    if (taskNameInp.value.trim() == '') {
        valid = false;
    }
    if (sectionNameInp.value.trim() == '') {
        valid = false;
    }
    if (pointsInp.value.trim() == '') {
        valid = false;
    }
    if (!valid) {
        showToast('Fill in all fields', 'red');
        return false;
    }
    valid = validatePoints();

    return valid;
}
//Does nothing if no value has been entered
function validatePoints() {
    let pointsInp = document.getElementById('task-input__points');
    if (pointsInp.value.trim() == '') {
        return false;
    }
    var parsedPoints = parseInt(pointsInp.value);
    if (isNaN(parsedPoints)) {
        showToast('Points must be a number!', 'red');
        return false;
    }
    if (parsedPoints < 1) {
        showToast('Give yourself at least 1 point!', 'red');
        return false;
    }
    return true;
}


function showToast(message, color) {
    $('main')
        .toast({
            message: message,
            position: 'bottom right',
            displayTime: 3000,
            class: color
        });
}

//For dropdown in inputs, refer to Fomantic-UI
$('.ui.dropdown')
  .dropdown({
    allowAdditions: true
  });

//Populate dropdown entries for inputs, such as Section and Tasks
async function populateInputsDropdown() {
    //Get Sections
    let sectionNames = await dataAccess.getSectionNames();
    var sectionsTemplate = '<option value="">Section</option>';
    sectionNames.forEach(name => {
        sectionsTemplate = sectionsTemplate.concat('<option value="' + name + '">' + name + '</option>');
    });
    //Populate Sections Dropdown
    let sectionNameInp = $('#task-input__section');
    sectionNameInp.html(sectionsTemplate);

    //Get Tasks
    let taskNames = await dataAccess.getTaskNames();
    var tasksTemplate = '<option value="">Task</option>';
    taskNames.forEach(name => {
        tasksTemplate = tasksTemplate.concat('<option value="' + name + '">' + name + '</option>');
    });
    //Populate Tasks Dropdown
    let taskNameInp = $('#task-input__task');
    taskNameInp.html(tasksTemplate);
}

//Handle updates
//Update available popup
function updatePopup(info) {
    if (info.releaseNotes != null) {
        $('#release-notes').html('<p>Release notes</p>' + info + ', releaseNotes ' + info.releaseNotes + '<br><div class="ui divider"></div>');
    }
    $('.ui.update.modal')
        .modal({
            onApprove : function() {
                if ($('#update-checkbox')[0].checked) {
                    console.log('checked');
                    alwaysUpdate();
                }
                console.log('approved');
                updateAndQuit();
            }
        })
        .modal('show')
    ;
}

//Trigger check for update
//If update is present, ask if you want to update along with release notes 
//If yes, trigger update
//If no, do nothing
//arg format: 
var errorMessageCount = 0;
function checkForUpdates() {
    ipcRenderer.send('updater-action', 'checkForUpdates');
    console.log('Started check for updates');
    errorMessageCount = 0;
}
checkForUpdates();
//Ask if you want to update with release notes when a new update is downloaded
ipcRenderer.on('updater-action-response', (event, arg) => {
    if (arg[0] == 'updateDownloaded') {
        var info = arg[1];
        console.log('received info');
        console.log(info);
        updatePopup(info);
        //Ask if you want to update, with release notes
    }
    //Display if there's an error; is displayed only 2 times, unless checkForUpdates is clicked again
    if (arg[0] == 'error') {
        if(errorMessageCount < 3) {
            //Todo Display error message
            console.log(arg[1]);
        }
    }
})

//To update when user quits the application
function alwaysUpdate() {
    console.log('sending alwaysUpdate');
    ipcRenderer.send('updater-action', 'alwaysUpdate');
}

//To update and quit immediately
function updateAndQuit() {
    console.log('sending updateAndQuit');
    ipcRenderer.send('updater-action', 'updateAndQuit');
}
