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
async function addMainPanels() {
    var mainPanelsElem = $("#main-panels");
    var panelElements = "", name, id;

    var sections = await dataAccess.getSections();
    sections.forEach(function(section) {
        id = section.dataValues.id;
        name = section.dataValues.name;
        var panelTemplate = '<div data-role="panel" data-title-caption="'+ name +'" class="panel main-panel" data-width="280" data-height="250" id="section' + id + '">'
                + '<div id="donut3" data-role="donut" data-value="35" data-hole=".6" data-stroke="#f5f5f5" data-fill="#9C27B0" data-animate="10" data-size="80"></div>'
                + '</div>';
        panelElements = panelElements + panelTemplate;
    });
    mainPanelsElem.html(panelElements);
    setMainPanelsEvents();
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
    pointsPanel.innerHTML = overallWeightage.completed;
    taskNameInp.value = '';
    sectionNameInp.value = '';
    pointsInp.value = '';
}