var views = {};
module.exports = views;

//Without the ../ it looks inside node_modules
const dataAccess = require('./../js/dataAccess.js');
const general = require('./../js/general.js'); 
const about = require('./about.js');

var mainPanelsElem = $('#main-panels');

//Used in order to match Fomantic UI's colors
var colorsRendered = {red: 'rgb(220, 40, 41)', orange: 'rgb(242, 113, 29)', yellow: 'rgb(253, 189, 4)', olive: 'rgb(181, 205, 23)', 
    green: 'rgb(34, 186, 67)', teal: 'rgb(0, 181, 174)', blue: 'rgb(33, 133, 208)', violet: 'rgb(99, 53, 201)', purple: 'rgb(163, 50, 200)', pink: 'rgb(222, 59, 152)'};

views.renderCardView = async function renderCardView() {
    var panelElements = '';
    var sectionsResponse = await dataAccess.getWeightageOfSections();
    var numberOfSections = sectionsResponse.totalSections;
    //When very few Cards are present, they expand in height to take up the full container
    //Limit card heights when very few are present 
    var limitCardHeight = '';
    if (numberOfSections <= 4) {
        limitCardHeight = 'card--small';
    }

    var sectionsWeightage = sectionsResponse.weightage;
    var tagsForEachSection = await dataAccess.getTagsForEachSection();
    //Create a card for each section
    for (var sectionId in sectionsWeightage) {
        var section = sectionsWeightage[sectionId];
        var name = section.name;
        var completedWeigtage = section.completed;
        var tagsTemplate = await getTagsTemplateForSection(sectionId, tagsForEachSection);
        
        //Complete Template for a card: Weightage, tags and section name
        var panelTemplate = '<div class="main panel ' + limitCardHeight + ' card" id="section' + sectionId + '">' +
        '<div class="panel ui statistic">' +
        '<div class="panel value">' + completedWeigtage + '</div>' +
        '<div class="panel label">' + tagsTemplate + '</div>' +
        '</div>' +
        '<div class="panel content">' + name + '</div>' +
        '</div>';
        panelElements = panelElements + panelTemplate;
    }
    
    mainPanelsElem.html(panelElements);
    setCardViewColumns(numberOfSections);

    //Init popups that show extra tags
    $('.ui.extra-tag').popup({
        transition: 'vertical flip',
        preserve: true,
        boundary: '#main-panels'
    });
};

//Set number of columns depending on number of sections
function setCardViewColumns(numberOfSections) {
    if (numberOfSections == 0) {
        //Show splash screen, initially when no task has been added
        showInitialContent();
    } else if (numberOfSections == 1) {
        mainPanelsElem.addClass('one');
    } else if (numberOfSections >= 2 && numberOfSections <= 4) {
        mainPanelsElem.removeClass('one');
        mainPanelsElem.addClass('two');
    } else {
        mainPanelsElem.removeClass('two');
        mainPanelsElem.addClass('three');
    }
}

//To be displayed when no Task has been added
function showInitialContent() {
    var intialScreenTemplate = $('#initial-content').html();
    mainPanelsElem.html(intialScreenTemplate);
    $('.ui.about.button').click(function() {
        about.showAboutModal();
    });
}

//For each Section card, returns the HTML template to show Tags
async function getTagsTemplateForSection (sectionId, tagsForEachSection) {
    var numOfTags = 0;
    var numOfTagsToBeShown = 3;
    var extraTags = '';
    var tagsTemplate = '';
    var tags = tagsForEachSection[sectionId].tags;
    tags.forEach((tag) => {
        numOfTags++;
        var tagColor = tag.tag_color || '';
        //Hide extra tags if number of tags is more than tags to be shown
        if (numOfTags <= numOfTagsToBeShown) {
            tagsTemplate += '<div class="ui tags horizontal label ' + tagColor + '">' + tag.tag_name + '</div>';
        } else {
            extraTags += '<div class="ui tags horizontal label ' + tagColor + '">' + tag.tag_name + '</div>';
        }
    });
    if (numOfTags > numOfTagsToBeShown) {
        //Show extra tags as popup
        var extraTagsCount = numOfTags - numOfTagsToBeShown;
        tagsTemplate += '<div class="ui extra-tag horizontal label" ' 
            + 'data-html=\'<div class="extra-tag__popup">' + extraTags + '</div>' 
            + '\' data-position="bottom center" data-variation="tiny basic">+' + extraTagsCount + '</div>';
    }
    return tagsTemplate;
}


views.renderWallView = async function renderWallView() {
    var mainPanelsElem = $('#the-wall');
    var theWallGraphicTemplate = '';
    var result = await dataAccess.getWeightageOfTags();
    var rawTagsObj = result.tagsWeightage;
    var normalizedTags = await processTags(rawTagsObj);
    var tagsObj = normalizedTags.normalizedTags;
    var unusedBricks = totalBricks - normalizedTags.totalUsedBricks;
    var keys = Object.keys(tagsObj);
    var numOfKeys = keys.length;
    var keyIndex = 0;
    theWallGraphicTemplate += '<div id="wall-view">' 
        + '<div id="wall-view__graphic">';
    var tagName;
    for(var i = 0; i < totalBricks; i++) {
        var color;
        if(i < unusedBricks) {
            color = '';
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
        theWallGraphicTemplate += '<div ';
        //If there's no tag name, no popup will be shown
        if(tagName == null) {
            theWallGraphicTemplate += 'class="popup wall brick unused" style="background: ' + color + ';"></div>';
        }
        else {
            //tagColor and tagName are used in popups
            theWallGraphicTemplate += 'tagColor="' + color + '" tagName="' + tagName + '" class="popup wall brick id' + keys[keyIndex] + '" style="background: ' + color + ';"></div>';
        }
    }
    var rightPaneTemplate = await getWallRightPaneTemplate(normalizedTags);
    
    theWallGraphicTemplate += '</div>';
    theWallGraphicTemplate += rightPaneTemplate;
    theWallGraphicTemplate += '</div>';
    theWallGraphicTemplate += ''; 
    mainPanelsElem.html(theWallGraphicTemplate);    
    //Set popups to stats
    $('.popup.stat').popup();    
    //Dim all bricks of same ID on hover
    $('.popup.wall.brick').on('mouseover', (elem) => {
        //Get 'id' class of that brick, in order to select all bricks with same id 
        var idClass;
        var classList = elem.target.classList;
        for(var classValue of classList) {
            if(classValue.startsWith('id')) {
                idClass = classValue;
                break;
            }
        }
        if(idClass != null) {
            var tagName = elem.target.attributes.tagName.value;
            var tagColor = elem.target.attributes.tagColor.value;
            console.log(tagColor);
            $('#right-pane__active-tag').html('<div class="ui tags horizontal label" style="background: ' + tagColor + '; color: white; opacity: 0.8">' + tagName + '</div>');
        }
        $('.popup.wall.brick.' + idClass).addClass('active-tags');
    });
    $('.popup.wall.brick').on('mouseout', (elem) => {
        //Get 'id' class of that brick, in order to select all bricks with same id 
        var idClass;
        var classList = elem.target.classList;
        for(var classValue of classList) {
            if(classValue.startsWith('id')) {
                idClass = classValue;
                break;
            }
        }
        $('#right-pane__active-tag').html('');
        $('.popup.wall.brick.' + idClass).removeClass('active-tags');
    });
};

async function getWallRightPaneTemplate(normalizedTags) {
    var rightPaneTemplate = '<div id="the-wall__right-pane">';
    var oldestTask = await dataAccess.getOldestTask();
    if (oldestTask == null) {
        return;
    }
    var oldestTaskDate = new Date(oldestTask.created_at);
    var currentDate = new Date();

    var oneMonthElapsed = oldestTaskDate.getFullYear() < currentDate.getFullYear() || oldestTaskDate.getMonth() < currentDate.getMonth();
    var oneWeekElapsed = oneMonthElapsed || oldestTaskDate.getDate() > (currentDate.getDate() - currentDate.getDay() + currentDate.getDay() === 0? -6 : 1);

    var weightageByTime = await getWeightageByTime();
    //Pane container with Weekly and Monthly points
    rightPaneTemplate += '<div class="right-pane__container">';
    //Weekly points
    rightPaneTemplate += '<div class="right-pane__stat-title">Weekly points</div>';
    rightPaneTemplate += '<div class="right-pane__stat">';
    if (oneWeekElapsed) {
        //Show last week as a popup if present
        rightPaneTemplate += '<div class="stat popup" data-position="left center" ' 
            + 'data-html=\'<div class="ui tiny horizontal black label">' 
            + '<div class="ui tiny horizontal white label">' + weightageByTime.lastWeekWeightage + '</div>' 
            + 'last week</div>\'>';
    }
    rightPaneTemplate += '<div class="ui tiny horizontal black label">' 
        + '<div class="ui tiny horizontal white label">' + weightageByTime.currentWeekWeightage + '</div>' 
        + 'this week</div>'
        + '</div>';
    if (oneWeekElapsed) {
        rightPaneTemplate += '</div>';
    }

    //Monthly points
    rightPaneTemplate += '<div class="right-pane__stat-title">Monthly points</div>';
    rightPaneTemplate += '<div class="right-pane__stat">';
    if (oneMonthElapsed) {
        //Show last month as a popup if present
        rightPaneTemplate += '<div class="stat popup" data-position="left center"' 
            + 'data-html=\'<div class="ui tiny horizontal black label">' 
            + '<div class="ui tiny horizontal white label">' + weightageByTime.lastMonthWeightage + '</div>' 
            + 'last month</div>\'>';
    }
    rightPaneTemplate += '<div class="ui tiny horizontal black label">' 
        + '<div class="ui tiny horizontal white label">' + weightageByTime.currentMonthWeightage + '</div>' 
        + 'this month</div>';
    rightPaneTemplate += '</div>';
    if (oneMonthElapsed) {
        rightPaneTemplate += '</div>';
    }
    rightPaneTemplate += '</div>';

    //Pane container with Highest Tag
    rightPaneTemplate += '<div class="right-pane__container">';
    rightPaneTemplate += '<div class="right-pane__stat-title">Highest Skill</div>';
    rightPaneTemplate += '<div class="right-pane__stat">';
    rightPaneTemplate += '<div class="stat popup" data-position="left center"' 
        + ' data-html=\'<div class="ui tiny horizontal black label">' 
        + '<div class="ui tiny horizontal white label">' + normalizedTags.maxTag.weightage + '</div>' 
        + 'points</div>\'>';
    rightPaneTemplate += '<div class="ui medium horizontal ' + normalizedTags.maxTag.color + ' label">' + normalizedTags.maxTag.name + '</div>';
    rightPaneTemplate += '</div>';
    rightPaneTemplate += '</div>';
    rightPaneTemplate += '</div>';

    //Pane container with Longest Streaks
    rightPaneTemplate += '<div class="right-pane__container">';
    var streakData = await getStreakData();
    //Longest Streak
    var longestStreakPopupData = '<div class="ui tiny horizontal black label">' 
        + '<div class="ui tiny horizontal white label">' + streakData.maxStreakTasks.length + '</div>' 
        + 'tasks</div>'; 
    longestStreakPopupData += '<div class="ui tiny horizontal black label">' 
        + '<div class="ui tiny horizontal white label">' + streakData.maxStreakPoints + '</div>' 
        + 'points</div>';
    
    rightPaneTemplate += '<div class="right-pane__stat-title">Longest Streak</div>';
    rightPaneTemplate += '<div class="right-pane__stat">';
    rightPaneTemplate += '<div class="popup stat" data-html=\'' + longestStreakPopupData + '\' data-position="right center" data-variation="tiny">' 
        + '<div class="ui tiny horizontal black label"><div class="ui tiny horizontal white label">' + streakData.maxStreak + '</div>' 
        + 'days</div></div>';
    rightPaneTemplate += '</div>';
    
    //Current Streak
    var currentStreakPopupData = '<div class="ui tiny horizontal black label"><div class="ui tiny horizontal white label">' + streakData.currentTasks.length + '</div>tasks</div>'; 
    currentStreakPopupData += '<div class="ui tiny horizontal black label"><div class="ui tiny horizontal white label">' + streakData.currentPoints + '</div>points</div>';

    rightPaneTemplate += '<div class="right-pane__stat-title">Current Streak</div>';
    rightPaneTemplate += '<div class="right-pane__stat">';
    rightPaneTemplate += '<div class="popup stat" data-html=\'' + currentStreakPopupData + '\' data-position="right center" data-variation="tiny">' 
        + '<div class="ui tiny horizontal black label"><div class="ui tiny horizontal white label">' + streakData.currentStreak + '</div>' 
        + 'days</div></div>';
    rightPaneTemplate += '</div>';
    rightPaneTemplate += '</div>';

    //Show current tag
    rightPaneTemplate += '<div id="right-pane__active-tag" class="right-pane__container">';
    rightPaneTemplate += '</div>';

    rightPaneTemplate += '</div>';
    return rightPaneTemplate;

}


async function getStreakData() {
    var tasks = await dataAccess.getTasks();
    var currentStreak = 1;
    var currentTasks = [];
    var currentPoints = 0;
    var maxStreak = 0;
    var maxStreakTasks = [];
    var maxStreakPoints = 0;
    var currentDate = new Date(0);
    var nextDate = new Date(0);
    nextDate = new Date(nextDate.setDate(currentDate.getDate() + 1));
    var taskDate;
    //Assumes data is ordered by created_at ascending
    tasks.forEach((task)=> {
        taskDate = new Date(task.created_at);
        if (taskDate.getFullYear() > currentDate.getFullYear() || taskDate.getMonth() > currentDate.getMonth() || taskDate.getDate() > currentDate.getDate()) {
            //If taskDate is more than current but the same as nextDate, increase streak and update current and next date.
            if (taskDate.getFullYear() == nextDate.getFullYear() && taskDate.getMonth() == nextDate.getMonth() && taskDate.getDate() == nextDate.getDate()) {
                currentStreak++;
                currentTasks.push(task);
                currentPoints = currentPoints + task.weightage;
            } else {
                //If taskDate isn't the nextDate, then there's a blank day and streak has been broken; reset all info
                if (maxStreak < currentStreak) {
                    maxStreak = currentStreak; 
                    maxStreakPoints = currentPoints; 
                    maxStreakTasks = currentTasks;
                }
                currentStreak = 1;
                currentPoints = 0;
                currentTasks = [];
            }
            currentDate = taskDate;
            nextDate = new Date(currentDate);
            nextDate = new Date(nextDate.setDate(nextDate.getDate() + 1));
        } else {
            //If taskDate is same as current date, no need to update streak; just add points.
            currentTasks.push(task);
            currentPoints = currentPoints + task.weightage;
        }
    });
    var streakData = {maxStreak: maxStreak, maxStreakPoints: maxStreakPoints, maxStreakTasks: maxStreakTasks,
        currentStreak: currentStreak, currentPoints: currentPoints, currentTasks: currentTasks};
    return streakData;
}

async function getWeightageByTime() {
    var weightageByTime = {};
    var date = new Date();
    //Last Monday till today, this week
    var daysToLastMonday = - date.getDay() + date.getDay() === 0? -6 : 1;
    var currentWeekWeightage = await dataAccess.getWeightageByDays(daysToLastMonday);
    var lastWeekWeightage = await dataAccess.getWeightageByDays([daysToLastMonday - 7, daysToLastMonday]);
    
    var currentMonthWeightage = await dataAccess.getWeightageByMonths(-1);
    var lastMonthWeightage = await dataAccess.getWeightageByMonths([-2, -1]);
    
    
    weightageByTime = {currentWeekWeightage: currentWeekWeightage, lastWeekWeightage: lastWeekWeightage,
        currentMonthWeightage: currentMonthWeightage, lastMonthWeightage: lastMonthWeightage};
    return weightageByTime;
}



/*
 * Takes an object with tags to weightage mapping;
 * Normalizes(scales) weights to match number of bricks to be rendered in the Wall view.
 * Eg: If total bricks is 100, but target weightage is 200, it means that 2 points == 1 brick
 * Similarly, a tag with 10 weightage should become 5 weightage, etc.
 * 
 * totalUsedBricks is the total number of bricks mapped to tags after normalization.
 * maxTag is the tag with most weightage WITHOUT normalization
 */
var totalBricks = 500;
async function processTags(tagsToWeightage) {
    var totalUsedBricks = 0;
    var weightagePerBrick = (await general.getTargetWeightage()) / totalBricks;
    var maxTag;
    for (var key in tagsToWeightage) {
        if (maxTag == null || tagsToWeightage[key].weightage > maxTag.weightage) {
            maxTag = {id: key, name: tagsToWeightage[key].name, 
                weightage: tagsToWeightage[key].weightage, color: tagsToWeightage[key].color};
        }
        tagsToWeightage[key].weightage = Math.floor(tagsToWeightage[key].weightage/weightagePerBrick);
        totalUsedBricks = totalUsedBricks + tagsToWeightage[key].weightage;
    }
    var result = {normalizedTags: tagsToWeightage, totalUsedBricks: totalUsedBricks, maxTag: maxTag};
    return result;
}
