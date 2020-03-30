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
        var panelTemplate = '<div data-role="panel" data-title-caption="'+ name +'" class="panel main-panel" data-width="280" data-height="250" id="section' + id + '">'
                + '<div id="donut3" data-role="donut" data-value="35" data-hole=".6" data-stroke="#f5f5f5" data-fill="#9C27B0" data-animate="10" data-size="80"></div>'
                + '</div>';
        panelElements = panelElements + panelTemplate;
    });
    mainPanelsElem.html(panelElements);
    setMainPanelsEvents();
}
addMainPanels();

function setMainPanelsEvents() {
    console.log("setMainPanelsEvents");
    console.log("setMainPanelsEvents", $(".main-panel"));
    $(".main-panel").on("click", function() {
       console.log("ad");
    });
}