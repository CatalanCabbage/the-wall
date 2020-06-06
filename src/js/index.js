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
        handleTitleBarEvents();
        initEvents();
    }
};

window.onbeforeunload = () => {
    /* If window is reloaded, remove win event listeners
    (DOM element listeners get auto garbage collected but not
    Electron win listeners as the win is not dereferenced unless closed) */
    win.removeAllListeners();
};

async function initEvents() {
    //Inputs 
    document.getElementById('task-submit-btn').addEventListener('click', () => {
        addTask();
    });
    document.getElementById('task-input__points').addEventListener('focusout', () => {
        validatePoints();
    });
    document.getElementById('add-tag__name').addEventListener('focusout', () => {
        setPreviewTagText(null);
        console.log('focusout');
    });
    //Rendering
    await initTargetWeightage();

    addMainPanels();
    populateInputsDropdown();
    generateProgressBar();

    displayTheWall();
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

var maxWeightage = 100000;

async function initTargetWeightage () {
    targetWeightage = parseInt(await dataAccess.getParam('targetWeightage'));
    console.log('Getting from DB, targetWeightage is: ' + targetWeightage);
    if (targetWeightage == null || isNaN(targetWeightage)) { //if not in DB, init and add to DB
        var totalWeightage = parseInt(await dataAccess.getTotalWeightage());
        targetWeightage = totalWeightage + (maxWeightage-totalWeightage)%100;
        console.log('NaN/null, so targetWeightage is: ' + targetWeightage);
        dataAccess.addParam({key: 'targetWeightage', value: targetWeightage});
    }
}

var currentPanel = 'cards';

async function displayTheWall() {
    var mainPanelsElem = $('#the-wall');
    var theWallGraphicTemplate = '';
    var result = await dataAccess.getWeightageOfTags();
    var rawTagsObj = result.tagsWeightage;
    var normalizedTags = normalizeWeightage(rawTagsObj);
    var tagsObj = normalizedTags.normalizedTags;
    var unusedBricks = totalBricks - normalizedTags.totalUsedBricks;
    var keys = Object.keys(tagsObj);
    var numOfKeys = keys.length;
    var keyIndex = 0;
    var colorsRendered = {red: 'rgb(220, 40, 41)', orange: 'rgb(242, 113, 29)', yellow: 'rgb(253, 189, 4)', olive: 'rgb(181, 205, 23)', 
        green: 'rgb(34, 186, 67)', teal: 'rgb(0, 181, 174)', blue: 'rgb(33, 133, 208)', violet: 'rgb(99, 53, 201)', purple: 'rgb(163, 50, 200)', pink: 'rgb(222, 59, 152)'};
    theWallGraphicTemplate = theWallGraphicTemplate.concat('<div style="display: flex; justify-content: center; width: 100%; height: auto; background: white;"><div style="margin: 20px auto; display: grid; grid-template-columns: repeat(20, 25px); grid-template-rows: repeat(25, 15px);">');
    var tagName;
    for(var i = 0; i < totalBricks; i++) {
        var color;
        if(i < unusedBricks) {
            color = 'grey';
        } else {
            if (tagsObj[keys[keyIndex]].weightage > 0) {
                color = colorsRendered[tagsObj[keys[keyIndex]].color];
                tagsObj[keys[keyIndex]].weightage--;
                tagName = tagsObj[keys[keyIndex]].name;
            } else if (keyIndex < numOfKeys - 1) {
                //If weightage for a tag reaches 0, move on to the next tag
                while (tagsObj[keys[keyIndex]].weightage == 0) {
                    //In case next tag has weightage 0
                    keyIndex++;
                }
                color = colorsRendered[tagsObj[keys[keyIndex]].color];
                tagsObj[keys[keyIndex]].weightage--;
                tagName = tagsObj[keys[keyIndex]].name;
            }
        }
        theWallGraphicTemplate = theWallGraphicTemplate.concat('<div ');
        //If there's no tag name, no popup will be shown
        if(tagName != null) {
            theWallGraphicTemplate = theWallGraphicTemplate.concat('data-html="' + tagName + '" class="popup wall tag id' + keys[keyIndex] + '"');
        }
        theWallGraphicTemplate = theWallGraphicTemplate.concat('style="background: ' + color + '; border: 1px solid #FFF; border-radius: 0px;"></div>');
    }
    theWallGraphicTemplate = theWallGraphicTemplate.concat('</div></div>');
    mainPanelsElem.html(theWallGraphicTemplate);
    //Set popups to all bricks
    $('.popup.wall.tag').popup({
        preserve: true
    });

    //Dim all bricks of same ID on hover
    $('.popup.wall.tag').on('mouseover', (elem) => {
        var idClass = elem.target.classList[3];
        $('.popup.wall.tag.' + idClass).addClass('active-tags');
    });
    $('.popup.wall.tag').on('mouseout', (elem) => {
        var idClass = elem.target.classList[3];
        $('.popup.wall.tag.' + idClass).removeClass('active-tags');
    });
}

/*
 * Takes an object with tags to weightage mapping;
 * Normalizes(scales) weights to match number of bricks to be rendered in the Wall view.
 * Eg: If total bricks is 100, but target weightage is 200, it means that 2 points == 1 brick
 * Similarly, a tag with 10 weightage should become 5 weightage, etc.
 * 
 * totalUsedBricks is the total number of bricks mapped to tags after normalization.
 * 
 * Returns an object: {normalizedTags: <similarToInputObj>, totalUsedBricks: <n>}
 */
var totalBricks = 500;
function normalizeWeightage(tagsToWeightage) {
    console.log(tagsToWeightage);
    var totalUsedBricks = 0;
    var weightagePerBrick = targetWeightage / totalBricks;
    for (var key in tagsToWeightage) {
        tagsToWeightage[key].weightage = Math.floor(tagsToWeightage[key].weightage/weightagePerBrick);
        totalUsedBricks = totalUsedBricks + tagsToWeightage[key].weightage;
    }
    var result = {normalizedTags: tagsToWeightage, totalUsedBricks: totalUsedBricks};
    return result;
}

var totalTagsCount = 0;
async function addMainPanels() {
    var mainPanelsElem = $('#main-panels');
    var panelElements = '';
    var name;
    var sectionsResponse = await dataAccess.getWeightageOfSections();
    var sections = sectionsResponse[0];
    var numberOfSections = sectionsResponse[1];
    //When very few Cards are present, they expand in height to take up the full container
    //Need to limit heights manually when very few are present 
    var limitCardHeight = '';
    if (numberOfSections <= 4) {
        limitCardHeight = 'card--small';
    }
    var tagsForEachSection = await dataAccess.getTagsForEachSection();
    var allTags = await dataAccess.getTags();
    totalTagsCount = Object.keys(allTags).length;
    for (var sectionId in sections) {
        var section = sections[sectionId];
        name = section.name;
        //var total = section.total;
        var tags = 'no tags';
        if (tagsForEachSection[sectionId].tags.length > 0) {
            tags = tagsForEachSection[sectionId].tags;
        }
        var completed = section.completed;
        var tagsTemplate = '';
        if (tags == 'no tags') {
            tagsTemplate = tagsTemplate.concat('<div class="ui horizontal label">no tags</div>');
        } else {
            var numOfTags = 0;
            var numOfTagsToBeShown = 3;
            var extraTags = '';
            tags.forEach((tag) => {
                numOfTags++;
                var tagColor = allTags[tag.tag_id].color || '';
                if (numOfTags <= numOfTagsToBeShown) {
                    tagsTemplate = tagsTemplate.concat('<div class="ui tags ' + tagColor + ' horizontal label">' + tag.tag_name + '</div>');
                } else {
                    extraTags = extraTags.concat('<div class="ui tags ' + tagColor + ' horizontal label">' + tag.tag_name + '</div>');
                }
            });
            if (numOfTags > numOfTagsToBeShown) {
                var extraTagsCount = numOfTags - numOfTagsToBeShown;
                tagsTemplate = tagsTemplate.concat('<div class="ui extra tags horizontal label" data-html=\'<div style="margin-left: 10px">' + extraTags + '</div>\' data-position="bottom center" data-variation="tiny basic">+' + extraTagsCount + '</div>');
            }
        }
        var panelTemplate = '<div class="panel ' + limitCardHeight + ' card" id="section' + sectionId + '">' +
            '<div class="panel black ui statistic">' +
            '<div class="panel value">' + completed + '</div>' +
            '<div class="panel label">' + tagsTemplate + '</div>' +
            '</div>' +
            '<div class="panel content">' + name + '</div>' +
            '</div>';
        panelElements = panelElements + panelTemplate;
    }
    
    mainPanelsElem.html(panelElements);

    //Set number of columns depending on number of sections
    if (numberOfSections == 0) {
        //Show splash screen, initially when no task has been added
        var intialScreenTemplate = $('#initial-content').html();
        mainPanelsElem.html(intialScreenTemplate);
        $('.ui.about.button').click(function() {
            $('.about.ui.modal').modal('show');
        });
    } else if (numberOfSections == 1) {
        mainPanelsElem.addClass('one');
    } else if (numberOfSections >= 2 && numberOfSections <= 4) {
        mainPanelsElem.removeClass('one');
        mainPanelsElem.addClass('two');
    } else {
        mainPanelsElem.removeClass('two');
        mainPanelsElem.addClass('three');
    }
    $('.ui.extra.tags').popup({
        transition: 'vertical flip',
        preserve: true,
        boundary: '#main-panels'
    });
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
        if (sectionObj == null) { //Todo, change to findOrCreate
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
    dataAccess.addMultipleTaskTagRel(taskTagRel);
    //Clear inputs
    $('.task-input.ui.search.dropdown').dropdown('restore defaults');
    pointsInp.value = '';

    //Regenerate rendered data
    addMainPanels(); //Update main panels
    populateInputsDropdown(); //Update dropdown
    generateProgressBar();

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
            count: '{count} tags',
            maxSelections: 'Max {maxCount} tags',
            noResults: 'No tags found'
        },
        onChange: async function(value) {
            if (value == 'Add new Tag' || (Array.isArray(value) && value.includes('Add new Tag'))) {
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
            $('.about.ui.modal').modal('show');
            break;
    }
}

//Handles display of modal and high-level actions
async function handleSettingsModal() {
    $('.settings.ui.modal')
        .modal({
            onApprove: function() {
                saveSettings();
            }
        })
        .modal('show');
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
    $('.ui.target.slider').slider('set value', targetWeightage);
    $('#settings__target-slider-text').html(targetWeightage); //Init text box next to the slider
}

$('.about.popup').popup({
    preserve: true,
    hoverable: true
});


//Modal to get new Tag
function addNewTag() {
    //Open modal
    $('.tag.ui.modal')
        .modal({
            onApprove: function() {
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
    //Clear previous inputs if any
    setPreviewTagColor('');
    setPreviewTagText('Sample Tag');
    var addTagNameElem = $('#add-tag__name');
    addTagNameElem[0].value = '';

    //Add message
    var tagMessageContainer = $('#add-tag__message');
    var tagsMessageTemplate = '<i>Designed to represent <u>very broad</u> fields</i>';
    console.log(totalTagsCount);
    if (totalTagsCount >= 5 && totalTagsCount <= 9) {
        tagsMessageTemplate = tagsMessageTemplate.concat('<br><i>Ideally, should be very few!</i>');
    } else if (totalTagsCount > 9) {
        tagsMessageTemplate = tagsMessageTemplate.concat('<br><i>Try not to create too many!</i>');
    }
    tagMessageContainer.html(tagsMessageTemplate);
    //Populate colors
    var tagColorContainer = $('#add-tag__color');
    var colorButtonsTemplate = '';
    var colorsEnum = ['red', 'orange', 'yellow', 'olive', 'green', 'teal', 'blue', 'violet', 'purple', 'pink'];
    colorsEnum.forEach((color) => {
        colorButtonsTemplate = colorButtonsTemplate.concat('<button class="ui ' + color + ' tags color button" onclick="setPreviewTagColor(\'' + color + '\')"></button>');
    });
    tagColorContainer.html(colorButtonsTemplate);
}

var previewTagColor = '';

function setPreviewTagColor(color) {
    //Remove previous color class if any, and add new color class
    console.log('Previous color = ' + previewTagColor + ' new color = ' + color);
    var previewTagElem = $('#add-tag__preview');
    previewTagElem.removeClass(previewTagColor);
    previewTagColor = color;
    previewTagElem.addClass(previewTagColor);
}
//If text param is null, sets preview tag's text from add-tag__name element
function setPreviewTagText(text) {
    var previewTagElem = $('#add-tag__preview');
    if (text != null) {
        previewTagElem.text(text);
    } else {
        var addTagNameElem = $('#add-tag__name');
        var tagName = addTagNameElem[0].value;
        if (tagName.trim() !== '') {
            previewTagElem.text(tagName);
        }
    }
}

async function saveNewTag() {
    //Save tag    
    let tagNameInp = $('#add-tag__name');
    let tagName = tagNameInp[0].value.trim();
    console.log(tagName + ', color: ' + previewTagColor);
    //Validate Tags
    if (tagName == '') {
        showToast('Tag name cannot be empty', 'red');
        return false;
    }
    if (previewTagColor == '') {
        showToast('Select a color for the Tag', 'red');
        return false;
    }
    if (tagName.includes('<') || tagName.includes('>') || tagName.includes('"')) {
        showToast('Tag name must not contain <u> <>" </u>', 'red');
        return false;
    }
    //Save tags
    let tagObj = await dataAccess.addTag({name: tagName, color: previewTagColor});
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
    //Set targetWeightage
    var targetText = $('#settings__target-slider-text');
    var newTargetWeightage = parseInt(targetText[0].innerText);
    console.log(targetText[0].innerText);
    console.log(newTargetWeightage);

    if(targetWeightage != newTargetWeightage) {
        setTargetWeightage(newTargetWeightage);
        targetWeightage = newTargetWeightage;
        //Reinit progressBar and Wall
        generateProgressBar();
        displayTheWall();
    }
    console.log('approved');
}

function setTargetWeightage(newTargetWeightage) {
    dataAccess.addParam({key: 'targetWeightage', value: newTargetWeightage});
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
    let tasks = await dataAccess.getTaskNames();
    var tasksTemplate = '<option value="">Task</option>';
    tasks.forEach(task => {
        tasksTemplate = tasksTemplate.concat('<option value="' + task + '">' + task + '</option>');
    });
    //Populate Tasks Dropdown
    let taskNameInp = $('#task-input__task');
    taskNameInp.html(tasksTemplate);

    //Get Tags
    let tags = await dataAccess.getTags();
    var tagsTemplate = '<option value="">Task</option>';
    for (var tagId in tags) {
        tagsTemplate = tagsTemplate.concat('<option value="' + tagId + '">' + tags[tagId].name + '</option>');
    }
    tagsTemplate = tagsTemplate.concat('<option value="Add new Tag"><b>Add Tag</b></option>');
    //Populate Tags Dropdown
    let tagNameInp = $('#task-input__tag');
    tagNameInp.html(tagsTemplate);

    addTooltips();
}

//Messages to show on input tooltip
var messages = {};
var messageId = 0;
/* eslint-disable indent */
messages[messageId++] = {
    task: {line1: 'Eg. Be really specific!', line2: 'Read a couple of pages...'},
    section: {line1: 'Which book?', line2: 'Pragmatic Programmer'},
    tags: {line1: 'About what, overall?', line2: 'Dev'},
    points: {line1: 'How much value does it add?', line2: '20'}
};
messages[messageId++] = {
    task: {line1: 'Eg. Why are you crying?', line2: 'Perfectly aligned a div'},
    section: {line1: 'Which project?', line2: 'Portfolio website'},
    tags: {line1: 'Tech used:', line2: '\'JS\' and \'CSS\''},
    points: {line1: 'How much did you learn?', line2: '15'}
};
messages[messageId++] = {
    task: {line1: 'Eg. What did you read?', line2: 'Read an article about containers'},
    section: {line1: 'Uses what specifically?', line2: 'Docker'},
    tags: {line1: 'Which field?', line2: 'DevOps'},
    points: {line1: 'How useful was it?', line2: '25'}
};
messages[messageId++] = {
    task: {line1: 'Eg. What did you code?', line2: 'Implemented a BST'},
    section: {line1: 'From?', line2: 'Coursera Princeton Course'},
    tags: {line1: 'Belongs under:', line2: '\'Algos\' and \'Java\''},
    points: {line1: 'How much value does it add?', line2: '45'}
};
messages[messageId++] = {
    task: {line1: 'Eg. Why are you sweating?!', line2: 'Did 3.141 push-ups'},
    section: {line1: 'Whaat?!', line2: 'Exercise'},
    tags: {line1: 'Also belongs under:', line2: 'Fitness'},
    points: {line1: 'How much value does it add?', line2: '20'}
};
messages[messageId++] = {
    task: {line1: 'Eg. What did you make?', line2: 'A stickman'},
    section: {line1: 'Why is it grayscale?', line2: 'Pencil sketching'},
    tags: {line1: 'Belongs under:', line2: 'Art'},
    points: {line1: 'How much value does it add?', line2: '40'}
};
messages[messageId++] = {
    task: {line1: 'Eg. What did you learn?', line2: 'Async-await and promises'},
    section: {line1: 'It\'s relevant to:', line2: 'JS'},
    tags: {line1: 'The broad field is also:', line2: 'JS'},
    points: {line1: 'How valuable do you think it is?', line2: '40'}
};
/* eslint-enable indent */
//Add on-hover info tooltips to input buttons
function addTooltips() {
    //Pick a random message
    var activeMsgId = Math.floor(Math.random() * (Object.keys(messages).length));
    $('.task-input').attr('data-position', 'bottom center');
    $('.task-input.task').attr('data-html', '<div style="text-align:center">' + messages[activeMsgId].task.line1 + '<br><i>' + messages[activeMsgId].task.line2 + '</i></div>');
    $('.task-input.section').attr('data-html', '<div style="text-align:center">' + messages[activeMsgId].section.line1 + '<br><i>' + messages[activeMsgId].section.line2 + '</i></div>');
    $('.task-input.tags').attr('data-html', '<div style="text-align:center">' + messages[activeMsgId].tags.line1 + '<br><i>' + messages[activeMsgId].tags.line2 + '</i></div>');
    $('.task-input.points').attr('data-html', '<div style="text-align:center">' + messages[activeMsgId].points.line1 + '<br><i>' + messages[activeMsgId].points.line2 + '</i></div>');
    $('.task-input').popup({
        preserve: true,
        delay: {show: 350}
    });
}

//Handle updates
//Update available popup
function updatePopup(info) {
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
        errorMessageCount++;
        if (errorMessageCount < 3) {
            //Todo Display error message
            //console.log('error: ' + arg[1]);
        }
    }
});

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

var targetWeightage;
//Generate progress bar footer
async function generateProgressBar() {
    var result = await dataAccess.getWeightageOfTags();
    if (targetWeightage == null) {
        await initTargetWeightage();
    }
    var tagsObj = result.tagsWeightage;
    var totalWeightage = result.totalWeightage;
    //When no data is added, no need to display progress bar
    if (totalWeightage < 1) {
        return false;
    }
    var barContainerTemplate = '';
    var barsTemplate = '';
    var weightsArray = [];
    for (var id in tagsObj) {
        weightsArray.push(tagsObj[id].weightage);
        barsTemplate = barsTemplate.concat('<div class="' + tagsObj[id].color + ' bar points display footer" data-html="' + tagsObj[id].name + '" data-variation="tiny basic"></div>');
    }
    barContainerTemplate = barContainerTemplate.concat('<div class="ui multiple progress total points small" data-total="' + targetWeightage + '">');
    barContainerTemplate = barContainerTemplate.concat(barsTemplate);
    barContainerTemplate = barContainerTemplate.concat('<div class="label" id="footer-progress__label">' + totalWeightage + ' completed of ' + targetWeightage + '</div></div>');
    $('#footer-progress').html(barContainerTemplate);
    $('.ui.total.points.progress').progress('set progress', weightsArray);
    $('.bar.points.display.footer').popup({
        transition: 'scale',
        preserve: true
    });
}