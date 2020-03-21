const remote = require('electron').remote;

const win = remote.getCurrentWindow();

// When document has loaded, initialise
document.onreadystatechange = (event) => {
    if (document.readyState == "complete") {
        handleWindowControls();
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
        var panelTemplate = '<div data-role="panel" data-title-caption="testTitle" class="panel" id="panel' + id + '">'
                + name
                + '</div>';
        panelElements = panelElements + panelTemplate;
    });
    mainPanelsElem.html(panelElements);
}
addMainPanels();