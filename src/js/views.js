var views = {};
module.exports = views;

//Without the ../ it looks inside node_modules
const dataAccess = require('./../js/dataAccess.js');
const general = require('./../js/general.js'); 

views.addCards = async function addCards() {
    var mainPanelsElem = $('#main-panels');
    var panelElements = '';
    var name;
    var sectionsResponse = await dataAccess.getWeightageOfSections();
    var sectionsWeightage = sectionsResponse.weightage;
    var numberOfSections = sectionsResponse.totalSections;
    //When very few Cards are present, they expand in height to take up the full container
    //Need to limit heights manually when very few are present 
    var limitCardHeight = '';
    if (numberOfSections <= 4) {
        limitCardHeight = 'card--small';
    }
    var tagsForEachSection = await dataAccess.getTagsForEachSection();
    var allTags = await dataAccess.getTags();
    for (var sectionId in sectionsWeightage) {
        var section = sectionsWeightage[sectionId];
        name = section.name;
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
        $('.about.popup').popup({
            preserve: true,
            hoverable: true
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
};




views.displayTheWall = async function displayTheWall() {
    console.time('wall');
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
    var colorsRendered = {red: 'rgb(220, 40, 41)', orange: 'rgb(242, 113, 29)', yellow: 'rgb(253, 189, 4)', olive: 'rgb(181, 205, 23)', 
        green: 'rgb(34, 186, 67)', teal: 'rgb(0, 181, 174)', blue: 'rgb(33, 133, 208)', violet: 'rgb(99, 53, 201)', purple: 'rgb(163, 50, 200)', pink: 'rgb(222, 59, 152)'};
    theWallGraphicTemplate = theWallGraphicTemplate.concat('<div style="display: flex; justify-content: center; width: 100%; height: auto; background: white;"><div style="margin: 20px 20px 20px 60px; display: grid; grid-template-columns: repeat(20, 25px); grid-template-rows: repeat(25, 15px);">');
    var tagName;
    console.timeLog('wall');
    console.log('starting for loop');
    console.log('total bricks:' + totalBricks);
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
        else {
            theWallGraphicTemplate = theWallGraphicTemplate.concat('class="popup wall tag unused"');
        }
        theWallGraphicTemplate = theWallGraphicTemplate.concat('style="background: ' + color + '; border: 1px solid #FFF; border-radius: 0px;"></div>');
    }
    console.timeLog('wall');
    console.log('starting right pane template');
    var rightPaneTemplate = '<div id="the-wall__right-pane">';
    var oldestTask = await dataAccess.getOldestTask();
    var oldestTaskDate = new Date(oldestTask.created_at);
    var currentDate = new Date();

    var weightageByTime = await getWeightageByTime();
    rightPaneTemplate = rightPaneTemplate.concat('<div class="right-pane__container">');
    rightPaneTemplate = rightPaneTemplate.concat('<div class="right-pane__stat__title">Weekly points</div>');
    rightPaneTemplate = rightPaneTemplate.concat('<div class="right-pane__stat">');
    //Show popup with week only if a week has elapsed
    if (oldestTaskDate.getFullYear() < currentDate.getFullYear() || oldestTaskDate.getMonth() < currentDate.getMonth() || oldestTaskDate.getDate() > (currentDate.getDate() - currentDate.getDay() + currentDate.getDay() === 0? -6 : 1)) {
        rightPaneTemplate = rightPaneTemplate.concat('<div class="stat popup" data-position="left center" data-html=\'<div class="ui tiny horizontal black label"><div class="ui tiny horizontal white label">' + weightageByTime.lastWeekWeightage + '</div>last week</div>\'>');
    }
    rightPaneTemplate = rightPaneTemplate.concat('<div class="ui tiny horizontal black label"><div class="ui tiny horizontal white label">' + weightageByTime.currentWeekWeightage + '</div>this week</div>');
    rightPaneTemplate = rightPaneTemplate.concat('</div>');
    //Close only if week popup was shown
    if (oldestTaskDate.getFullYear() < currentDate.getFullYear() || oldestTaskDate.getMonth() < currentDate.getMonth() || oldestTaskDate.getDate() > (currentDate.getDate() - currentDate.getDay() + currentDate.getDay() === 0? -6 : 1)) {
        rightPaneTemplate = rightPaneTemplate.concat('</div>');
    }

    rightPaneTemplate = rightPaneTemplate.concat('<div class="right-pane__stat__title">Monthly points</div>');
    rightPaneTemplate = rightPaneTemplate.concat('<div class="right-pane__stat">');
    //Show popup only if a month has elapsed
    if (oldestTaskDate.getFullYear() < currentDate.getFullYear() || oldestTaskDate.getMonth() < currentDate.getMonth()) {
        rightPaneTemplate = rightPaneTemplate.concat('<div class="stat popup" data-position="left center" data-html=\'<div class="ui tiny horizontal black label"><div class="ui tiny horizontal white label">' + weightageByTime.lastMonthWeightage + '</div>last month</div>\'>');
    }
    rightPaneTemplate = rightPaneTemplate.concat('<div class="ui tiny horizontal black label"><div class="ui tiny horizontal white label">' + weightageByTime.currentMonthWeightage + '</div>this month</div>');
    rightPaneTemplate = rightPaneTemplate.concat('</div>');
    //Close only if month popup was shown
    if (oldestTaskDate.getFullYear() < currentDate.getFullYear() || oldestTaskDate.getMonth() < currentDate.getMonth()) {
        rightPaneTemplate = rightPaneTemplate.concat('</div>');
    }
    rightPaneTemplate = rightPaneTemplate.concat('</div>');

    rightPaneTemplate = rightPaneTemplate.concat('<div class="right-pane__container">');
    rightPaneTemplate = rightPaneTemplate.concat('<div class="right-pane__stat__title">Highest Tag</div>');
    rightPaneTemplate = rightPaneTemplate.concat('<div class="right-pane__stat">');
    rightPaneTemplate = rightPaneTemplate.concat('<div class="stat popup" data-position="left center" data-html=\'<div class="ui tiny horizontal black label"><div class="ui tiny horizontal white label">' + normalizedTags.maxTag.weightage + '</div>points</div>\'>');
    rightPaneTemplate = rightPaneTemplate.concat('<div class="ui small horizontal ' + normalizedTags.maxTag.color + ' label">' + normalizedTags.maxTag.name + '</div>');
    rightPaneTemplate = rightPaneTemplate.concat('</div>');
    rightPaneTemplate = rightPaneTemplate.concat('</div>');

    var streakData = await getStreakData();
    var longestStreakPopupData = '<div class="ui tiny horizontal black label"><div class="ui tiny horizontal white label">' + streakData.maxStreakTasks.length + '</div>tasks</div>'; 
    longestStreakPopupData = longestStreakPopupData.concat('<div class="ui tiny horizontal black label"><div class="ui tiny horizontal white label">' + streakData.maxStreakPoints + '</div>points</div>');
    var currentStreakPopupData = '<div class="ui tiny horizontal black label"><div class="ui tiny horizontal white label">' + streakData.currentTasks.length + '</div>tasks</div>'; 
    currentStreakPopupData = currentStreakPopupData.concat('<div class="ui tiny horizontal black label"><div class="ui tiny horizontal white label">' + streakData.currentPoints + '</div>points</div>');

    rightPaneTemplate = rightPaneTemplate.concat('<div class="right-pane__stat__title">Longest Streak</div>');
    rightPaneTemplate = rightPaneTemplate.concat('<div class="right-pane__stat">');
    rightPaneTemplate = rightPaneTemplate.concat('<div class="popup stat" data-html=\'' + longestStreakPopupData + '\' data-position="right center" data-variation="tiny"><div class="ui tiny horizontal black label"><div class="ui tiny horizontal white label">' + streakData.maxStreak + '</div>days</div></div>');
    rightPaneTemplate = rightPaneTemplate.concat('</div>');
    rightPaneTemplate = rightPaneTemplate.concat('</div>');
    
    rightPaneTemplate = rightPaneTemplate.concat('<div class="right-pane__stat__title">Current Streak</div>');
    rightPaneTemplate = rightPaneTemplate.concat('<div class="right-pane__stat">');
    rightPaneTemplate = rightPaneTemplate.concat('<div class="popup stat" data-html=\'' + currentStreakPopupData + '\' data-position="right center" data-variation="tiny"><div class="ui tiny horizontal black label"><div class="ui tiny horizontal white label">' + streakData.currentStreak + '</div>days</div></div>');
    rightPaneTemplate = rightPaneTemplate.concat('</div>');
    rightPaneTemplate = rightPaneTemplate.concat('</div>');

    rightPaneTemplate = rightPaneTemplate.concat('</div>');

    theWallGraphicTemplate = theWallGraphicTemplate.concat('</div>');
    theWallGraphicTemplate = theWallGraphicTemplate.concat(rightPaneTemplate);
    theWallGraphicTemplate = theWallGraphicTemplate.concat('</div>');
    theWallGraphicTemplate = theWallGraphicTemplate.concat('');
    console.timeLog('wall');
    console.log('going to set to html');
    mainPanelsElem.html(theWallGraphicTemplate);
    console.timeLog('wall');
    console.log('completed set to html');
    //Set popups to all bricks
    $('.popup.wall.tag').popup({
        preserve: true
    });
    //Set popups to stats
    $('.popup.stat').popup();
    console.timeLog('wall');
    console.log('completed setting poups');
    //Dim all bricks of same ID on hover
    $('.popup.wall.tag').on('mouseover', (elem) => {
        var idClass = elem.target.classList[3];
        $('.popup.wall.tag.' + idClass).addClass('active-tags');
    });
    $('.popup.wall.tag').on('mouseout', (elem) => {
        var idClass = elem.target.classList[3];
        $('.popup.wall.tag.' + idClass).removeClass('active-tags');
    });
    console.timeEnd('wall');
};




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
 * 
 * Returns an object: {normalizedTags: <similarToInputObj>, totalUsedBricks: <n>}
 */
var totalBricks = 500;
async function processTags(tagsToWeightage) {
    var totalUsedBricks = 0;
    var weightagePerBrick = (await general.getTargetWeightage()) / totalBricks;

    var maxTag;
    for (var key in tagsToWeightage) {
        tagsToWeightage[key].weightage = Math.floor(tagsToWeightage[key].weightage/weightagePerBrick);
        totalUsedBricks = totalUsedBricks + tagsToWeightage[key].weightage;
        if (maxTag == null || maxTag.weightage < tagsToWeightage[key].weightage) {
            maxTag = {id: key, name: tagsToWeightage[key].name, 
                weightage: tagsToWeightage[key].weightage, color: tagsToWeightage[key].color};
        }
    }
    var result = {normalizedTags: tagsToWeightage, totalUsedBricks: totalUsedBricks, maxTag: maxTag};
    return result;
}
