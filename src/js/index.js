const remote = require('electron').remote;

const win = remote.getCurrentWindow();

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
    var numberOfSections = 0;
    var sections = await dataAccess.getWeightageOfSections();
    for (var key in sections) {
        numberOfSections++;
        var section = sections[key];
        id = key;
        name = section.name;
        total = section.total;
        completed = section.completed;
        var panelTemplate = '<div class="card" id="section' + id + '">'
                + '<div class="ui statistic"><div class="value">' + completed + '</div><div class="label">' + total + '</div></div>'
                + '<div class="content">' + name + '</div>'
                + '</div>';
        panelElements = panelElements + panelTemplate;
    };
    //Set number of columns depending on number of sections
    if (numberOfSections == 0) {
        //Show splash screen, getting started
    } else if (numberOfSections == 1) {
        mainPanelsElem.toggleClass('one');
    } else if (numberOfSections >= 2 && numberOfSections <= 4) {
        mainPanelsElem.toggleClass('two');
    } else {
        mainPanelsElem.toggleClass('three');
    }
    mainPanelsElem.html(panelElements);
}
function initEvents() {
    //Handling for 'Submit'
    document.getElementById('task-submit-btn').addEventListener('click', event => {
        addTask();
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
    $('main')
      .toast({
        message: 'Task ' + taskNameInp.value + ' added with ' + points + ' points!',
        position: 'bottom right',
        displayTime: 3000,
        class : 'green'
      })
    ;
}

function isValidInput() {
    var valid = true;
    let taskNameInp = document.getElementById('task-input__task');
    let sectionNameInp = document.getElementById('task-input__section');
    let pointsInp = document.getElementById('task-input__points');
    //Check empty
    if (taskNameInp.value.trim() == '') {
        console.log('Task is empty');
        valid = false;
    }
    if (sectionNameInp.value.trim() == '') {
        console.log('Section is empty');
        valid = false;
    }
    if (pointsInp.value.trim() == '') {
        console.log('Points is empty');
        valid = false;
    }
    if (!valid) {
        $('main')
        .toast({
          message: 'Fill in all the fields',
          position: 'bottom right',
          displayTime: 3000,
          class : 'red'
        });
        return false;
    }

    //Validate points
    var parsedPoints = parseInt(pointsInp.value);
    if (isNaN(parsedPoints)) {
        $('main')
        .toast({
            message: 'Points should be a number',
            position: 'bottom right',
            displayTime: 3000,
            class : 'red'
        });
        return false;
    }
    if (parsedPoints < 1) {
        $('main')
        .toast({
            message: 'Give yourself at least 1 point!',
            position: 'bottom right',
            displayTime: 2000,
            class : 'red'
        });
        return false;
    }

    return true;
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