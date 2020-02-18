let dataAccess = {};

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
    storage: './database.sqlite'
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
    name: {type: Sequelize.STRING, allowNull: false}
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
});

//Tag
const Tag = sequelize.define('tag', {
    id: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
    name: {type: Sequelize.STRING, allowNull: false, unique: true},
    desc: {type: Sequelize.STRING, allowNull: false},
});

//Task to Tag relational mapping
const TaskTagRel = sequelize.define('task_tag_rel', {
    task_id: {type: Sequelize.INTEGER, allowNull: false, references: {model: Task, key: 'id'}},
    tag_id: {type: Sequelize.INTEGER, allowNull: false, references: {model: Tag, key: 'id'}},
});


sequelize.sync();

//DataAccess for Tags start---------------------------------------------------------------------------------------------
/**
 * Adds entry in Tags table
 * @return Promise
 * @param tagDetails Object containing params
 * Params: name, desc
 */
dataAccess.addTag = function addTag(tagDetails) {
    if (typeof tagDetails != "object" || tagDetails == null) {
        console.error("Sections: Param passed is invalid");
        return false;
    }

    return Tag.create(
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
dataAccess.getTag = function getTag(tagId) {
    return Tag.findOne(
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
dataAccess.getTags = function getTags() {
    return Tag.findAll(
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
dataAccess.deleteTag = function deleteTag(tagId) {
    return Tag
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
dataAccess.addSection = function addSection(sectionDetails) {
    if (typeof sectionDetails != "object" || sectionDetails == null) {
        console.error("Sections: Param passed is invalid");
        return false;
    }

    return Section.create(
        {name: sectionDetails.name, parent_section_id: sectionDetails.parentSectionId},
        {fields: ["name", "parent_section_id"]} //Allows insertion of only these fields
    )
        .then(() => {
            return true;
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
 * @param sectionId
 */
dataAccess.getSection = function getSection(sectionId) {
    return Section.findOne(
        {
            attributes: ["id", "name", "parent_section_id"],
            where: {id: sectionId}
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
 * Gets all entries from Sections table
 * @return Promise
 */
dataAccess.getSections = function getSections() {
    return Section.findAll(
        {
            attributes: ["id", "name", "parent_section_id"]
        })
        .then(sections => {
            return sections;
        })
        .catch(err => {
            console.error(err);
            return false;
        })
};

/**
 * Deletes entry from Sections table
 * @return Promise
 * @param sectionId
 */
dataAccess.deleteSection = function deleteSection(sectionId) {
    return Section.destroy({
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
 * Params: name, desc, status, weightage, entryTime, finishTime, parentSectionId
 */
dataAccess.addTask = function addTask(taskDetails) {
    if (typeof taskDetails != "object" || taskDetails == null) {
        console.error("Task: Param passed is invalid");
        return false;
    }

    return Task.create(
        {name: taskDetails.name, desc: taskDetails.desc, status: taskDetails.status, weightage: taskDetails.weightage,
            entry_time: taskDetails.entryTime, finish_time: taskDetails.finishTime, parent_section_id: taskDetails.parentSectionId},
        {fields: ["name", "desc", "status", "weightage", "entry_time", "finish_time", "parent_section_id"]} //Allows insertion of only these fields
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
dataAccess.getTask = function getTask(taskId) {
    return TaskTagRel.findOne(
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
dataAccess.getTasks = function getTasks() {
    return TaskTagRel.findAll(
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
 * Gets entries from Task table corresponding to that parent_section_id
 * @return Promise
 * @param parentSectionId
 */
dataAccess.getTasksBySectionId = function getTasksBySectionId(parentSectionId) {
    return TaskTagRel.findAll(
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
dataAccess.deleteTask = function deleteTask(taskId) {
    return Task.destroy({
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
dataAccess.addTaskTagRel = function addTaskTagRel(taskTagRelDetails) {
    if (typeof taskTagRelDetails != "object" || taskTagRelDetails == null) {
        console.error("TaskTagRels: Param passed is invalid");
        return false;
    }

    return TaskTagRel.create(
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
dataAccess.getTaskTagRel = function getTaskTagRel(taskId) {
    return TaskTagRel.findOne(
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
dataAccess.getTaskTagRels = function getTaskTagRels() {
    return TaskTagRel.findAll(
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
dataAccess.deleteTaskTagRel = function deleteTaskTagRel(TaskTagRelId) {
    return TaskTagRel.destroy({
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
     taskDetails = {name: "testName", desc:"testDesc", status: "Completed", weightage: 10,
        entryTime:"2007-01-01 10:00:00", finishTime:"2007-01-01 10:10:00", parentSectionId: 1};
     dataAccess.addTask(taskDetails).then((result) => {
        console.log(result);
    })

 TaskTagRel:
     Add:
     taskTagRelDetails = {taskId: 1, tagId: 1};
     dataAccess.addTaskTagRel(taskTagRelDetails).then((result) => {
        console.log(result);
    })


 */
console.log("Db file ends");

module.exports = dataAccess;