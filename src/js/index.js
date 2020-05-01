const remote = require('electron').remote;

const win = remote.getCurrentWindow();

// When document has loaded, initialise
document.onreadystatechange = (event) => {
    if (document.readyState == "complete") {
        handleWindowControls();
        initListeners();
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
addMainPanels();
async function addMainPanels() {
    var mainPanelsElem = $("#main-panels");
    var panelElements = "", name, id;

    var sections = await dataAccess.getWeightageOfSections();
    for (var key in sections) {
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
    mainPanelsElem.html(panelElements);
}
function initListeners() {
    document.getElementById('task-submit-btn').addEventListener('click', event => {
        console.log();
    })
}
async function addTask() {
    let taskNameInp = document.getElementById('task-input__name');
    let sectionNameInp = document.getElementById('task-input__section');
    let pointsInp = document.getElementById('task-input__points');
    let pointsPanel = document.getElementById('points-panel');
    console.log(sectionNameInp.value.toString().toLowerCase());
    let sectionObj = await dataAccess.getSection(sectionNameInp.value.toString().toLowerCase());
    if(sectionObj == null) {
        //If null, add the Section
        sectionObj = await dataAccess.addSection({name: sectionNameInp.value, parentSectionId: 0});
    }
    let sectionId = sectionObj.id;
    let taskInpObj = {
        name: taskNameInp.value,
        desc: "--", 
        status: "completed", 
        weightage: pointsInp.value, 
        parentSectionId: sectionId
    }
    taskObj = await dataAccess.addTask(taskInpObj);
    overallWeightage = await dataAccess.getOverallWeightage();
    console.log(overallWeightage);
    //pointsPanel.innerHTML = overallWeightage.completed;
    taskNameInp.value = '';
    sectionNameInp.value = '';
    pointsInp.value = '';
}