const headerFooter = {};
module.exports = headerFooter;

//Consists of functionality like header Input bar, footer Progress bar, etc. 
const dataAccess = require('./../js/dataAccess.js'); 
const general = require('./../js/general.js'); 
const views = require('./../js/views.js'); 

//Input dropdown: Task and section
$('.task-input.ui.dropdown')
    .dropdown({
        allowAdditions: true
    });

headerFooter.initEventListeners = function initEventListeners() {
    //Inputs 
    $('#task-submit-btn').on('click', () => {
        addTask();
    });
    $('#task-input__points').on('focusout', () => {
        validatePoints();
    });
    $('#add-tag__name').on('focusout', () => {
        setPreviewTagText(null);
    });
};


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
    views.addCards(); //Update main panels
    headerFooter.populateInputsDropdown(); //Update dropdown
    headerFooter.generateProgressBar();

    general.showToast('Task ' + taskName + ' added with ' + points + ' points!', 'green');
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
        general.showToast('Fill in all fields', 'red');
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
        general.showToast('Fields must not contain <u> <>" </u>', 'red');
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
        general.showToast('Points must be a number!', 'red');
        return false;
    }
    if (parsedPoints < 1) {
        general.showToast('Give yourself at least 1 point!', 'red');
        return false;
    }
    return true;
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



//Modal to get new Tag
headerFooter.handleAddNewTag =  function handleAddNewTag() {
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
    var totalTagsCount = general.getTotalTagsCount();
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
};

var previewTagColor = '';

function setPreviewTagColor(color) {
    //Remove previous color class if any, and add new color class
    console.log('Previous color = ' + previewTagColor + ' new color = ' + color);
    var previewTagElem = $('#add-tag__preview');
    previewTagElem.removeClass(previewTagColor);
    previewTagColor = color;
    previewTagElem.addClass(previewTagColor);
}


async function saveNewTag() {
    //Save tag    
    let tagNameInp = $('#add-tag__name');
    let tagName = tagNameInp[0].value.trim();
    console.log(tagName + ', color: ' + previewTagColor);
    //Validate Tags
    if (tagName == '') {
        general.showToast('Tag name cannot be empty', 'red');
        return false;
    }
    if (previewTagColor == '') {
        general.showToast('Select a color for the Tag', 'red');
        return false;
    }
    if (tagName.includes('<') || tagName.includes('>') || tagName.includes('"')) {
        general.showToast('Tag name must not contain <u> <>" </u>', 'red');
        return false;
    }
    //Save tags
    let tagObj = await dataAccess.addTag({name: tagName, color: previewTagColor});
    if (tagObj == 'SequelizeUniqueConstraintError') {
        general.showToast('Tag <b>' + tagName + '</b> already exists', 'red');
        return false;
    }
    //Regenerate tags dropdown options 
    headerFooter.populateInputsDropdown();
    general.showToast('Tag <b>' + tagName + '</b> added', 'green');
    return true;
}



//Populate dropdown entries for inputs, such as Section and Tasks
headerFooter.populateInputsDropdown = async function populateInputsDropdown() {
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
};

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
                await headerFooter.handleAddNewTag();
                $('.task-input.tags.ui.search.dropdown').dropdown('restore defaults');
            }
            console.log('Tag value ' + value);
        }
    });

//Generate progress bar footer
headerFooter.generateProgressBar = async function generateProgressBar() {
    var result = await dataAccess.getWeightageOfTags();
    var targetWeightage = await general.getTargetWeightage();
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
};