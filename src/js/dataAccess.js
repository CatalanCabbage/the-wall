let dataAccess = {};
const { QueryTypes } = require('sequelize');
console.log('Connected to DB yet?');

// Create database connection
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const sequelize = new Sequelize('database', 'username', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    operatorsAliases: 0,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    logging: 0,
    storage: './database.sqlite',
    fileMustExist: true
});

// Test connection
function isConnected() {
    return sequelize
        .authenticate()
        .then(() => {
            return true;
        })
        .catch(err => {
            console.error('Unable to connect to the database:', err);
            return false;
        });
}

dataAccess.isConnected = isConnected();

//Table definitions
//Sections
const Section = sequelize.define('section', {
    id: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
    parent_section_id: Sequelize.INTEGER,
    name: {type: Sequelize.STRING, allowNull: false, unique: true}
}, {
    updatedAt: 'updated_at',
    createdAt: 'created_at'
});

//Tasks
const Task = sequelize.define('task', {
    id: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
    name: {type: Sequelize.STRING, allowNull: false},
    desc: {type: Sequelize.STRING, allowNull: false},
    status: {type: Sequelize.STRING, allowNull: false},
    weightage: {type: Sequelize.INTEGER, allowNull: false},
    entry_time: {type: Sequelize.DATE},
    finish_time: {type: Sequelize.DATE},
    parent_section_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {model: Section, key: 'id'}
    }
}, {
    updatedAt: 'updated_at',
    createdAt: 'created_at'
});

//Tag
const Tag = sequelize.define('tag', {
    id: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
    name: {type: Sequelize.STRING, allowNull: false, unique: true},
    desc: {type: Sequelize.STRING, allowNull: false},
}, {
    updatedAt: 'updated_at',
    createdAt: 'created_at'
});

//Task to Tag relational mapping
const TaskTagRel = sequelize.define('task_tag_rel', {
    task_id: {type: Sequelize.INTEGER, allowNull: false, references: {model: Task, key: 'id'}},
    tag_id: {type: Sequelize.INTEGER, allowNull: false, references: {model: Tag, key: 'id'}},
}, {
    updatedAt: 'updated_at',
    createdAt: 'created_at'
});


sequelize.sync();

//DataAccess for Tags start---------------------------------------------------------------------------------------------
/**
 * Adds entry in Tags table
 * @return Promise
 * @param tagDetails Object containing params
 * Params: name, desc
 */
dataAccess.addTag = async function addTag(tagDetails) {
    if (typeof tagDetails != "object" || tagDetails == null) {
        console.error("Sections: Param passed is invalid");
        return false;
    }

    return await Tag.create(
        {name: tagDetails.name, desc: tagDetails.desc},
        {fields: ["name", "desc"]} //Allows insertion of only these fields
    )
        .then(() => {
            return true;
        })
        .catch(err => {
            if (err.toString().includes("SequelizeUniqueConstraintError")) { //Tag name has been set as unique
                console.error("Tags: Given tag name is not unique", err);
                return false;
            } else if (err.toString().includes("cannot be null")) {
                console.error("Tags: Param missing", err);
                return false;
            } else {
                console.error(err);
                return false;
            }
        });
};

/**
 * Gets entry from Tags table
 * @return Promise
 * @param tagId
 */
dataAccess.getTag = async function getTag(tagId) {
    return await Tag.findOne(
        {
            attributes: ["id", "name", "desc"],
            where: {id: tagId}
        })
        .then(tag => {
            return tag;
        })
        .catch(err => {
            console.error(err);
            return false;
        })
};

/**
 * Gets all entries from Tags table
 * @return Promise
 */
dataAccess.getTags = async function getTags() {
    return await Tag.findAll(
        {
            attributes: ["id", "name", "desc"]
        })
        .then(tags => {
            return tags;
        })
        .catch(err => {
            console.error(err);
            return false;
        })
};

/**
 * Deletes entry from Tags table
 * @return Promise
 * @param tagId
 */
dataAccess.deleteTag = async function deleteTag(tagId) {
    return await Tag
        .destroy({
            where: {id: tagId}
        })
        .then(() => {
            return true;
        })
        .catch(err => {
            console.error(err);
            return false;
        });
};
//DataAccess for Tags ends----------------------------------------------------------------------------------------------

//DataAccess for Sections starts----------------------------------------------------------------------------------------
/**
 * Adds entry in Sections table
 * @return Promise
 * @param sectionDetails Object containing params
 * Params: name, parentSectionId
 */
dataAccess.addSection = async function addSection(sectionDetails) {
    if (typeof sectionDetails != "object" || sectionDetails == null) {
        console.error("Sections: Param passed is invalid");
        return false;
    }

    return await Section.create(
        {name: sectionDetails.name, parent_section_id: sectionDetails.parentSectionId},
        {fields: ["name", "parent_section_id"]} //Allows insertion of only these fields
    )
        .then((res) => {
            return res.dataValues;
        })
        .catch(err => {
            if (err.toString().includes("cannot be null")) {
                console.error("Sections: Param missing", err);
                return false;
            } else {
                console.error(err);
                return false;
            }
        });
};

/**
 * Gets entry from Sections table
 * @return Promise
 * @param sectionName
 */
dataAccess.getSection = async function getSection(sectionName) {
    return await Section.findOne(
        {
            attributes: ["id", "name", "parent_section_id"],
            where: {name: sectionName}
        })
        .then(section => {
            if(section != null) {
                return section.dataValues;
            }
        })
        .catch(err => {
            console.error(err);
            return false;
        })
};

/**
 * Gets all entries from Sections table
 * @return Promise
 */
dataAccess.getSections = async function getSections() {
    var sectionsResult = await sequelize.query("select * from sections",
        { type: QueryTypes.SELECT }
    );
    return sectionsResult;
};


/**
 * Returns all distinct Section names as an array
 */
dataAccess.getSectionNames = async function getSectionNames() {
    var namesResult = await sequelize.query("select distinct name from sections",
        { type: QueryTypes.SELECT }
    );
    var names = [];
    namesResult.forEach(function(name){
        names.push(name.name);
    })
    return names;
}

/**
 * @returns Array of Obj of (name, total and completed weights for each Section id) AND total Sections.
 * Return format: [{SectionDetails}, int numberOfSections]
 * Where SectionDetails is in the format:
 * {id : {name : xyz, total : 123, completed : 12}}, id2 : {...} ...}
 */
dataAccess.getWeightageOfSections = async function getWeightageOfSections() {
    var totalWeightage = await sequelize.query("select distinct sections.id as id, sections.name as name, coalesce(sum(tasks.weightage), 0) as total from sections left outer join tasks on sections.id=tasks.parent_section_id group by sections.id order by total",
        { type: QueryTypes.SELECT }
    );
    var completedWeightage = await sequelize.query("select distinct sections.id as id, sections.name as name, sum(tasks.weightage) as completed from sections left outer join tasks on sections.id=tasks.parent_section_id where tasks.status is 'completed' group by sections.id order by completed",
            { type: QueryTypes.SELECT }
        );
    var weightage = {};
    var totalSections = 0;
    totalWeightage.forEach(function(totalWeightageObj){
        totalSections++;
        weightage[totalWeightageObj.id] = {"name" : totalWeightageObj.name, "total" : totalWeightageObj.total, "completed" : 0};
    })
    completedWeightage.forEach(function(completedWeightageObj){
        var tempObj = weightage[completedWeightageObj.id];
        tempObj["completed"] = completedWeightageObj.completed;
        weightage[completedWeightageObj.id] = tempObj;
    })
    return [weightage, totalSections];
};

/**
 * Gets total and completed weights
 * @return Promise
 */
dataAccess.getOverallWeightage = async function getOverallWeightage() {
    var totalWeightage = await sequelize.query("select sum(tasks.weightage) as total from tasks",
        { type: QueryTypes.SELECT }
    );
    var completedWeightage = await sequelize.query("select sum(tasks.weightage) as completed from tasks where tasks.status is 'completed'",
        { type: QueryTypes.SELECT }
    );
    if(totalWeightage == null || completedWeightage == null) {
        return null;
    }
    return {'total': totalWeightage['0']['total'], 'completed': completedWeightage['0']['completed']};
};

/**
 * Deletes entry from Sections table
 * @return Promise
 * @param sectionId
 */
dataAccess.deleteSection = async function deleteSection(sectionId) {
    return await Section.destroy({
        where: {id: sectionId}
    })
        .then(() => {
            return true;
        })
        .catch(err => {
            console.error(err);
            return false;
        });
};
//DataAccess for Sections ends------------------------------------------------------------------------------------------

//DataAccess for Tasks starts-------------------------------------------------------------------------------------------
/**
 * Adds entry in Task table
 * @return Promise
 * @param taskDetails Object containing params
 * Params: name, desc, status, weightage, parentSectionId
 */
dataAccess.addTask = async function addTask(taskDetails) {
    if (typeof taskDetails != "object" || taskDetails == null) {
        console.error("Task: Param passed is invalid");
        return false;
    }
    var parsedWeightage = parseInt(taskDetails.weightage);
    if (isNaN(parsedWeightage)) {
        console.error("Task: Weightage passed is NaN : " +  taskDetails.weightage);
        return false;
    }
    var currentTime = new Date();
    return await Task.create(
        {
            name: taskDetails.name,
            desc: taskDetails.desc,
            status: taskDetails.status,
            weightage: parsedWeightage,
            entry_time: currentTime,
            finish_time: currentTime,
            parent_section_id: taskDetails.parentSectionId
        },
        {fields: ["name", "desc", "status", "weightage", "entry_time", "finish_time", "parent_section_id"]} //Allows insertion of only these fields
    )
        .then((res) => {
            return res.dataValues;
        })
        .catch(err => {
            if (err.toString().includes("cannot be null")) {
                console.error("Task: Param missing", err);
                return false;
            } else {
                console.error(err);
                return false;
            }
        });
};

/**
 * Updates Task status in Task table; also updates finish_time with current time
 * @return Promise
 * @param taskDetails Object containing params
 * Params: id, status
 */
dataAccess.updateTaskStatus = async function updateTaskStatus(taskDetails) {
    if (typeof taskDetails != "object" || taskDetails == null) {
        console.error("Task: Param passed is invalid");
        return false;
    }
    var currentTime = new Date();
    return await Task.update(
        {
            status: taskDetails.status,
            finish_time: currentTime
        },
        {fields: ["status","finish_time"]}, //Allows insertion of only these fields
        {where: {id: taskDetails.id}}
    )
        .then(() => {
            return true;
        })
        .catch(err => {
            if (err.toString().includes("cannot be null")) {
                console.error("Task: Param missing", err);
                return false;
            } else {
                console.error(err);
                return false;
            }
        });
};

/**
 * Gets entry from Task table
 * @return Promise
 * @param taskId
 */
dataAccess.getTask = async function getTask(taskId) {
    return await TaskTagRel.findOne(
        {
            attributes: ["name", "desc", "status", "weightage", "entry_time", "finish_time", "parent_section_id"],
            where: {task_id: taskId}
        })
        .then(task => {
            return task;
        })
        .catch(err => {
            console.error(err);
            return false;
        })
};

/**
 * Gets all entries from Task table
 * @return Promise
 * @param taskId
 */
dataAccess.getTasks = async function getTasks() {
    return await Task.findAll(
        {
            attributes: ["name", "desc", "status", "weightage", "entry_time", "finish_time", "parent_section_id"]
        })
        .then(tasks => {
            return tasks;
        })
        .catch(err => {
            console.error(err);
            return false;
        })
};

/**
 * Returns all distinct Task names as an array
 */
dataAccess.getTaskNames = async function getTaskNames() {
    var namesResult = await sequelize.query("select distinct name from tasks",
        { type: QueryTypes.SELECT }
    );
    var names = [];
    namesResult.forEach(function(name){
        names.push(name.name);
    })
    return names;
}

/**
 * Gets entries from Task table corresponding to that parent_section_id
 * @return Promise
 * @param parentSectionId
 */
dataAccess.getTasksBySectionId = async function getTasksBySectionId(parentSectionId) {
    return await Task.findAll(
        {
            attributes: ["name", "desc", "status", "weightage", "entry_time", "finish_time", "parent_section_id"],
            where: {parent_section_id: parentSectionId}
        })
        .then(tasks => {
            return tasks;
        })
        .catch(err => {
            console.error(err);
            return false;
        })
};

/**
 * Deletes entry from Tasks table
 * @return Promise
 * @param taskId
 */
dataAccess.deleteTask = async function deleteTask(taskId) {
    return await Task.destroy({
        where: {id: taskId}
    })
        .then(() => {
            return true;
        })
        .catch(err => {
            console.error(err);
            return false;
        });
};
//DataAccess for Tasks ends---------------------------------------------------------------------------------------------

//DataAccess for TaskTagRel starts--------------------------------------------------------------------------------------
/**
 * Adds entry in TaskTagRel table
 * @return Promise
 * @param taskTagRelDetails Object containing params
 * Params: taskId, tagId
 */
dataAccess.addTaskTagRel = async function addTaskTagRel(taskTagRelDetails) {
    if (typeof taskTagRelDetails != "object" || taskTagRelDetails == null) {
        console.error("TaskTagRels: Param passed is invalid");
        return false;
    }

    return await TaskTagRel.create(
        {task_id: taskTagRelDetails.taskId, tag_id: taskTagRelDetails.tagId},
        {fields: ["task_id", "tag_id"]} //Allows insertion of only these fields
    )
        .then(() => {
            return true;
        })
        .catch(err => {
            if (err.toString().includes("cannot be null")) {
                console.error("TaskTagRel: Param missing", err);
                return false;
            } else if (err.toString().includes("ForeignKeyConstraintError")) {
                console.error("TaskTagRel: Foreign Key constraint failed", err);
                return false;
            } else {
                console.error(err);
                return false;
            }
        });
};

/**
 * Gets entry from TaskTagRel table
 * @return Promise
 * @param taskId
 */
dataAccess.getTaskTagRel = async function getTaskTagRel(taskId) {
    return await TaskTagRel.findOne(
        {
            attributes: ["id", "task_id", "tag_id"],
            where: {task_id: taskId}
        })
        .then(section => {
            return section;
        })
        .catch(err => {
            console.error(err);
            return false;
        })
};

/**
 * Gets entry from TaskTagRels
 * @return Promise
 * @param taskId
 */
dataAccess.getTaskTagRels = async function getTaskTagRels() {
    return await TaskTagRel.findAll(
        {
            attributes: ["id", "task_id", "tag_id"],
            where: {task_id: taskId}
        })
        .then(taskTagRels => {
            return taskTagRels;
        })
        .catch(err => {
            console.error(err);
            return false;
        })
};

/**
 * Deletes entry from TaskTagRel table
 * @return Promise
 * @param TaskTagRelId
 */
dataAccess.deleteTaskTagRel = async function deleteTaskTagRel(TaskTagRelId) {
    return await TaskTagRel.destroy({
        where: {id: TaskTagRelId}
    })
        .then(() => {
            return true;
        })
        .catch(err => {
            console.error(err);
            return false;
        });
};
//DataAccess for TaskTagRel ends----------------------------------------------------------------------------------------


/*
 Example snippets:
 Tags:
     Add:
    tagDetails = {name: "testName", desc: "testDescription"};
    dataAccess.addTag(tagDetails).then((result) => {
        console.log(result);
    })

 Sections:
    Add:
    sectionDetails = {name: "testName", parentSectionId: 1};
    dataAccess.addSection(sectionDetails).then((result) => {
        console.log(result);
    })

 Tasks:
     Add:
     taskDetails = {name: "testName", desc:"testDesc", status: "Completed", weightage: 10, parentSectionId: 1};
     dataAccess.addTask(taskDetails).then((result) => {
        console.log(result);
    })
    Update:
         taskDetails = {status: "Completed", id:1};
         async function updateStatus(){
             var data = await dataAccess.updateTaskStatus(taskDetails)
             console.log(data);
         }

 TaskTagRel:
     Add:
     taskTagRelDetails = {taskId: 1, tagId: 1};
     dataAccess.addTaskTagRel(taskTagRelDetails).then((result) => {
        console.log(result);
    })


 */
console.log("Db file ends");

module.exports = dataAccess;