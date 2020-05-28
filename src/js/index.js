const remote = require('electron').remote;
const dataAccess = require('./../js/dataAccess'); //Without the ../ it looks inside node_modules
const win = remote.getCurrentWindow();
const {ipcRenderer} = require('electron');

//Add version number to title
var version = remote.app.getVersion();
$('title').html('The Wall v' + version);

// When document has loaded, initialise
document.onreadystatechange = () => {
    if (document.readyState == 'complete') {
        handleWindowControls();
        initEvents();
    }
};

window.onbeforeunload = () => {
    /* If window is reloaded, remove win event listeners
    (DOM element listeners get auto garbage collected but not
    Electron win listeners as the win is not dereferenced unless closed) */
    win.removeAllListeners();
};

//Handle minimise/close buttons
function handleWindowControls() {
    document.getElementById('minimize-button').addEventListener('click', () => {
        win.minimize();
    });
    document.getElementById('close-button').addEventListener('click', () => {
        win.close();
    });
}
async function addMainPanels() {
    var mainPanelsElem = $('#main-panels');
    var panelElements = '';
    var name;
    var id;
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
        var total = section.total;
        var completed = section.completed;
        var panelTemplate = '<div class="panel ' + limitCardHeight + ' card" id="section' + id + '">'
                + '<div class="panel black ui statistic"><div class="value">' + completed + '</div><div class="label">' + total + '</div></div>'
                + '<div class="panel content">' + name + '</div>'
                + '</div>';
        panelElements = panelElements + panelTemplate;
    }
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
    //Inputs 
    document.getElementById('task-submit-btn').addEventListener('click', () => {
        addTask();
    });
    document.getElementById('task-input__points').addEventListener('focusout', () => {
        validatePoints();
    });
    //Rendering
    addMainPanels();
    populateInputsDropdown();
}
async function addTask() {
    let taskNameInp = $('#task-input__task');
    let sectionNameInp = $('#task-input__section');
    let pointsInp = $('#task-input__points');
    var taskName = taskNameInp.dropdown('get value').toLowerCase();

    if (!isValidInput()) {
        return;
    }
    let points = parseInt(pointsInp[0].value);

    //Add Section. 
    let sectionId = sectionNameInp.dropdown('get value');
    //In dropdown, value == id and text == name. If text == value, it's mostly a new addition.
    if (sectionNameInp.dropdown('get text') == sectionNameInp.dropdown('get value')) {
        //Try to check if already present in DB; if not, add it
        let sectionObj = await dataAccess.getSection(sectionNameInp.dropdown('get value').toLowerCase());
        if(sectionObj == null) { //Todo, change to findOrCreate
            sectionObj = await dataAccess.addSection({name: sectionNameInp.dropdown('get value').toLowerCase(), parentSectionId: 0});
        }
        sectionId = sectionObj.id;
    }
    
    //Add Task
    let taskInpObj = {
        name: taskName,
        desc: '--', 
        status: 'completed', 
        weightage: points, 
        parentSectionId: sectionId
    };
    var taskObj = await dataAccess.addTask(taskInpObj);
    
    //Add TaskTagRel
    var inputTags = $('.task-input.tags.ui.dropdown').dropdown('get value'); //Array of IDs
    var taskId = taskObj.id;
    var taskTagRel = [];
    inputTags.forEach(tagId => { //Form object to be inserted
        taskTagRel.push({tag_id: tagId, task_id: taskId});
    });
    
    //Clear inputs
    $('.task-input.ui.search.dropdown').dropdown('restore defaults');
    pointsInp.value = '';
    
    //Regenerate rendered data
    addMainPanels(); //Update main panels
    populateInputsDropdown(); //Update dropdown

    showToast('Task ' + taskName + ' added with ' + points + ' points!', 'green');
}

function isValidInput() {
    var valid = true;
    let taskNameInp = document.getElementById('task-input__task');
    let sectionNameInp = document.getElementById('task-input__section');
    let pointsInp = document.getElementById('task-input__points');

    let taskNameInpValue = taskNameInp.value.trim();
    let sectionNameInpValue = sectionNameInp.value.trim();
    let pointsInpValue = pointsInp.value.trim();
    //Check empty
    if (taskNameInpValue == '' || sectionNameInpValue == '' || pointsInpValue == '') {
        valid = false;
    }
    if (!valid) {
        showToast('Fill in all fields', 'red');
        return false;
    }

    //Check for invalid characters: 
    //Restricted Characters <>" and Characters not restricted: '/& 
    if (taskNameInpValue.includes('<') || taskNameInpValue.includes('>') || taskNameInpValue.includes('"')) {
        valid = false;
    }
    if (sectionNameInpValue.includes('<') || sectionNameInpValue.includes('>') || sectionNameInpValue.includes('"')) {
        valid = false;
    }
    if (pointsInpValue.includes('<') || pointsInpValue.includes('>') || pointsInpValue.includes('"')) {
        valid = false;
    }
    if (!valid) {
        showToast('Fields must not contain <u> <>" </u>', 'red');
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

//Input dropdown: Task and section
$('.task-input.ui.dropdown')
    .dropdown({
        allowAdditions: true
    });
//Input dropdown: Tags
$('.task-input.tags.ui.dropdown')
    .dropdown({
        maxSelections: 3,
        useLabels: false,
        transition: 'scale',
        message: {
            count         : '{count} tags',
            maxSelections : 'Max {maxCount} tags',
            noResults     : 'No tags found'
        },
        onChange: async function(value) {
            if(value == 'Add new Tag' || (Array.isArray(value) && value.includes('Add new Tag'))) {
                console.log($('.task-input.tags.ui.search.dropdown'));
                await addNewTag();    
                $('.task-input.tags.ui.search.dropdown').dropdown('restore defaults');            
            }
            console.log('Tag value ' + value);
        }
    });
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
            console.log('about');
            break;
    }
}

//Handles display of modal and high-level actions
async function handleSettingsModal() {
    console.log('In handleSettingsModal');
    $('.settings.ui.modal')
        .modal({
            onApprove : function() {
                saveSettings();
            }
        })
        .modal('show')
    ;
    //Initialize autoUpdate checkbox
    var autoUpdateFlag = await dataAccess.getParam('autoUpdate');
    console.log('In Initialize autoUpdate checkbox, param=' + autoUpdateFlag);
    if (autoUpdateFlag == 'true') {
        $('#settings__update-checkbox')[0].checked = true;
    } else {
        $('#settings__update-checkbox')[0].checked = false;
    }
}

//Modal to get new Tag
function addNewTag() {
    //Open modal
    $('.tag.ui.modal')
        .modal({
            onApprove : function () {
                console.log('cleared');
                //Add Tag with Description
                saveNewTag().then((res) => {
                    //The modal closes on input, before the value of this function is returned.
                    //Changing onApprove fn to async doesn't work either.
                    //Hence, keep the modal open by default, and close it on success masage 
                    if (res == true) {
                        $('.tag.ui.modal').modal('hide');
                    }
                });
                return false;
            }
        })
        .modal('show');
}

async function saveNewTag() {
    //Save tag    
    let tagNameInp = $('#add-tag__name');
    let tagDescInp = $('#add-tag__desc');
    let tagName = tagNameInp[0].value.trim();
    let tagDesc = tagDescInp[0].value.trim();
    console.log(tagName + tagDesc);
    //Validate Tags
    if (tagName == '') {
        showToast('Tag name cannot be empty', 'red');
        return false;
    }
    if (tagName.includes('<') || tagName.includes('>') || tagName.includes('"')) {
        showToast('Tag name must not contain <u> <>" </u>', 'red');
        return false;
    }
    if (tagDesc.includes('<') || tagDesc.includes('>') || tagDesc.includes('"')) {
        showToast('Tag description must not contain <u> <>" </u>', 'red');
        return false;
    }
    //Save tags
    let tagObj = await dataAccess.addTag({name: tagName, desc: tagDesc});
    if (tagObj == 'SequelizeUniqueConstraintError') {
        showToast('Tag <b>' + tagName + '</b> already exists', 'red');
        return false;
    }
    //Regenerate tags dropdown options 
    populateInputsDropdown();
    showToast('Tag <b>' + tagName + '</b> added', 'green');
    return true;
}


//Saves settings passed from Settings Modal
function saveSettings() {
    //Set auto-update property
    if ($('#settings__update-checkbox')[0].checked) {
        alwaysUpdate('true');
        console.log('checked');
    } else {
        alwaysUpdate('false');
        console.log('unchecked');
    }
    console.log('approved');
}

//Populate dropdown entries for inputs, such as Section and Tasks
async function populateInputsDropdown() {
    //Get Sections
    let sections = await dataAccess.getSections();
    var sectionsTemplate = '<option value="">Section</option>';
    sections.forEach(section => {
        sectionsTemplate = sectionsTemplate.concat('<option value="' + section.id + '">' + section.name + '</option>');
    });
    //Populate Sections Dropdown
    let sectionNameInp = $('#task-input__section');
    sectionNameInp.html(sectionsTemplate);

    //Get Tasks
    //Task.id doesn't need to be in the value, we don't require it to reference anything else
    let tasks = await dataAccess.getTasks();
    var tasksTemplate = '<option value="">Task</option>';
    tasks.forEach(task => {
        tasksTemplate = tasksTemplate.concat('<option value="' + task.name + '">' + task.name + '</option>');
    });
    //Populate Tasks Dropdown
    let taskNameInp = $('#task-input__task');
    taskNameInp.html(tasksTemplate);

    //Get Tags
    let tags = await dataAccess.getTags();
    var tagsTemplate = '<option value="">Task</option>';
    tags.forEach(tag => {
        tagsTemplate = tagsTemplate.concat('<option value="' + tag.id + '">' + tag.name + '</option>');
    });
    tagsTemplate = tagsTemplate.concat('<option value="Add new Tag"><b>Add Tag</b></option>');
    //Populate Tags Dropdown
    let tagNameInp = $('#task-input__tag');
    tagNameInp.html(tagsTemplate);
}

//Handle updates
//Update available popup
function updatePopup(info) {
    if (info.releaseNotes != null) {
        $('#release-notes').html('<p>Release notes</p>' + info.releaseNotes + '<br><div class="ui divider"></div>');
    }
    $('.update.ui.modal')
        .modal({
            onApprove : function() {
                if ($('#update-checkbox')[0].checked) {
                    console.log('checked');
                    alwaysUpdate('true');
                }
                console.log('approved');
                updateAndQuit();
            }
        })
        .modal('show')
    ;
}

//For logging from main process
ipcRenderer.on('logger', (event, arg) => {
    console.log(arg);
});


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
        console.log('received info in index.js');
        updatePopup(info);
        //Ask if you want to update, with release notes
    }
    //Display if there's an error; is displayed only 2 times, unless checkForUpdates is clicked again
    if (arg[0] == 'error') {
        //errorMessageCount++;
        if(errorMessageCount < 3) {
            //Todo Display error message
            console.log('error: ' + arg[1]);
            console.log(arg[1]);
        }
    }
});

//To always update when user quits the application
alwaysUpdate();
async function alwaysUpdate(inputFlag) {
    console.log('sending alwaysUpdate; input flag:');
    console.log(inputFlag);
    var autoUpdateFlag = await dataAccess.getParam('autoUpdate');
    //If first startup
    if (inputFlag == null) {
        console.log('inputFlag null, and ' + (autoUpdateFlag == 'true'));
        inputFlag = (autoUpdateFlag == 'true');
    } else {
        //When flag is received explicitly, set in DB also
        dataAccess.addParam({key: 'autoUpdate', value: inputFlag});
        console.log('inputFlag not null, ' + inputFlag);
    }
    //Update the current state in the app
    ipcRenderer.send('updater-action', {action: 'alwaysUpdate', flag: inputFlag});
}

//To update and quit immediately
function updateAndQuit() {
    console.log('sending updateAndQuit');
    ipcRenderer.send('updater-action', 'updateAndQuit');
}
