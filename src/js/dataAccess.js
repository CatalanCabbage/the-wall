let dataAccess = {};
const {QueryTypes} = require('sequelize');
const app = require('electron').remote.app;
const path = require('path');
var fs = require('fs');

//Check if folder exists to store db file
var dbDir = path.join(app.getPath('appData'), 'the-wall', 'Local Storage');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, {recursive: true});
}
let dbPath = path.join(dbDir, 'database.sqlite');

console.log('Connected to DB yet?');
// Create database connection
const Sequelize = require('sequelize');
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
    storage: process.env.DB_PATH || dbPath,
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
//AppParams
const AppParam = sequelize.define('app_param', {
    key: {type: Sequelize.STRING, allowNull: false, unique: true},
    value: {type: Sequelize.STRING, allowNull: false, unique: false}
}, {
    updatedAt: 'updated_at',
    createdAt: 'created_at'
});

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
    color: {type: Sequelize.TEXT}
}, {
    updatedAt: 'updated_at',
    createdAt: 'created_at'
});

//Task to Tag relational mapping
const TaskTagRel = sequelize.define('task_tag_rel', {
    task_id: {type: Sequelize.INTEGER, allowNull: false, unique: 'compositeKey', references: {model: Task, key: 'id'}},
    tag_id: {type: Sequelize.INTEGER, allowNull: false, unique: 'compositeKey', references: {model: Tag, key: 'id'}},
}, {
    updatedAt: 'updated_at',
    createdAt: 'created_at'
});


sequelize.sync();

//DataAccess for AppParams start---------------------------------------------------------------------------------------------
dataAccess.addParam = async function addParam(param) {
    if (typeof param != 'object' || param == null) {
        console.log('addParam passed param is invalid');
        return false;
    }
    return await AppParam.upsert(
        {key: param.key, value: param.value},
        {fields: ['key', 'value']}
    )
        .then (() => {
            return true;
        }) 
        .catch (err => {
            if (err.toString().includes('SequelizeUniqueConstraintError')) {
                console.error('AppParam: Given key is not unique', err);
                return false;
            } else if (err.toString().includes('cannot be null')) {
                console.error('AppParam: Param missing', err);
                return false;
            } else {
                console.error(err);
                return false;
            }
        })

    ;
};

dataAccess.getParam = async function getParam(key) {
    if (typeof key !== 'string') {
        console.log('getParam key is not a string');
        return null;
    }
    var param = await sequelize.query('select * from app_params where key=?',
        {   
            replacements: [key],
            type: QueryTypes.SELECT}
    );
    if (param[0] != null) {
        return param[0].value;
    }
    return null;
};


dataAccess.getAllParams = async function getAllParams() {
    var params = await sequelize.query('select key, value from app_params',
        {type: QueryTypes.SELECT}
    );
    return params;
};
//DataAccess for AppParams ends----------------------------------------------------------------------------------------------

//DataAccess for Tags start---------------------------------------------------------------------------------------------
/**
 * Adds entry in Tags table
 * @return Promise
 * @param tagDetails Object containing params
 * Params: name, desc
 */
dataAccess.addTag = async function addTag(tagDetails) {
    if (typeof tagDetails != 'object' || tagDetails == null) {
        console.error('Sections: Param passed is invalid');
        return false;
    }

    return await Tag.create(
        {name: tagDetails.name, desc: tagDetails.desc || '', color: tagDetails.color},
        {fields: ['name', 'desc', 'color']} //Allows insertion of only these fields
    )
        .then((res) => {
            return res.dataValues;
        })
        .catch(err => {
            if (err.toString().includes('SequelizeUniqueConstraintError')) { //Tag name has been set as unique
                console.error('Tags: Given tag name is not unique', err);
                return 'SequelizeUniqueConstraintError';
            } else if (err.toString().includes('cannot be null')) {
                console.error('Tags: Param missing', err);
                return false;
            } else {
                console.error(err);
                return false;
            }
        });
};

/**
 * Gets all entries from Tags table
 * @return Promise
 */
dataAccess.getTags = async function getTags() {
    var queryResult = await sequelize.query('select id, name, desc, color from tags',
        {type: QueryTypes.SELECT}
    );
    var tags = {};
    queryResult.forEach((row) => {
        tags[row.id] = {name: row.name, desc: row.desc, color: row.color};
    });
    return tags;
};

dataAccess.getTagsForEachSection = async function getTagsForEachSection() {
    var query = 'select distinct sections.id as section_id, tags.id as tag_id, sections.name as section, tags.name as tag' +
                ' from sections' +
                ' left outer join tasks on sections.id=tasks.parent_section_id' +
                ' left outer join task_tag_rels on tasks.id=task_tag_rels.task_id' +
                ' left outer join tags on task_tag_rels.tag_id=tags.id';
    var queryResult = await sequelize.query(query, 
        {type: QueryTypes.SELECT}
    );
    var tagsForEachSection = {};
    queryResult.forEach((row) => {
        var sectionId = row.section_id;
        var tags = [];
        if(tagsForEachSection[sectionId] != null) {
            tags = tagsForEachSection[sectionId].tags;
        }
        if(row.tag != null) {
            tags.push({tag_id: row.tag_id, tag_name: row.tag});
        }
        tagsForEachSection[sectionId] = {section: row.section, tags: tags};
    });
    return tagsForEachSection;
};

dataAccess.getWeightageOfTags = async function getWeightageOfTags() {
    var query = 'select tags.id, tags.name, tags.color, coalesce(sum(tasks.weightage), 0) as weightage' + 
                ' from tags' +
                ' left outer join task_tag_rels on tags.id=task_tag_rels.tag_id' + 
                ' left outer join tasks on task_tag_rels.task_id=tasks.id' + 
                ' group by tags.id';
    var result = await sequelize.query(query,
        {type: QueryTypes.SELECT}
    );
    var tagsWeightage = {};
    var totalWeightage = 0;
    result.forEach(row => {
        totalWeightage = totalWeightage + row.weightage;
        tagsWeightage[row.id] = {name: row.name, color: row.color, weightage: row.weightage};
    });
    return {totalWeightage: totalWeightage, tagsWeightage: tagsWeightage};
};


/**
 * Returns all distinct Tag names as an array
 */
dataAccess.getTagNames = async function getTagNames() {
    var namesResult = await sequelize.query('select distinct name from tags',
        {type: QueryTypes.SELECT}
    );
    var names = [];
    namesResult.forEach(function(name) {
        names.push(name.name);
    });
    return names;
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
    if (typeof sectionDetails != 'object' || sectionDetails == null) {
        console.error('Sections: Param passed is invalid');
        return false;
    }

    return await Section.create(
        {name: sectionDetails.name, parent_section_id: sectionDetails.parentSectionId},
        {fields: ['name', 'parent_section_id']} //Allows insertion of only these fields
    )
        .then((res) => {
            return res.dataValues;
        })
        .catch(err => {
            if (err.toString().includes('cannot be null')) {
                console.error('Sections: Param missing', err);
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
            attributes: ['id', 'name', 'parent_section_id'],
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
        });
};

/**
 * Gets all entries from Sections table
 * @return Promise
 */
dataAccess.getSections = async function getSections() {
    var sectionsResult = await sequelize.query('select * from sections',
        {type: QueryTypes.SELECT}
    );
    return sectionsResult;
};


/**
 * Returns all distinct Section names as an array
 */
dataAccess.getSectionNames = async function getSectionNames() {
    var namesResult = await sequelize.query('select distinct name from sections',
        {type: QueryTypes.SELECT}
    );
    var names = [];
    namesResult.forEach(function(name) {
        names.push(name.name);
    });
    return names;
};

/**
 * @returns Array of Obj of (name, total and completed weights for each Section id) AND total Sections.
 * Return format: [{SectionDetails}, int numberOfSections]
 * Where SectionDetails is in the format:
 * {id : {name : xyz, total : 123, completed : 12}}, id2 : {...} ...}
 */
dataAccess.getWeightageOfSections = async function getWeightageOfSections() {
    var totalQuery = 'select distinct sections.id as id, sections.name as name, coalesce(sum(tasks.weightage), 0) as total' + 
                ' from sections' +
                ' left outer join tasks on sections.id=tasks.parent_section_id' + 
                ' group by sections.id order by total';
    var completedQuery = 'select distinct sections.id as id, sections.name as name, sum(tasks.weightage) as completed' +
                ' from sections' +
                ' left outer join tasks on sections.id=tasks.parent_section_id' +
                ' where tasks.status is \'completed\'' +
                ' group by sections.id' +
                ' order by completed';
    var totalWeightage = await sequelize.query(totalQuery,
        {type: QueryTypes.SELECT}
    );
    var completedWeightage = await sequelize.query(completedQuery,
        {type: QueryTypes.SELECT}
    );
    var weightage = {};
    var totalSections = 0;
    totalWeightage.forEach(function(totalWeightageObj) {
        totalSections++;
        weightage[totalWeightageObj.id] = {'name' : totalWeightageObj.name, 'total' : totalWeightageObj.total, 'completed' : 0};
    });
    completedWeightage.forEach(function(completedWeightageObj) {
        var tempObj = weightage[completedWeightageObj.id];
        tempObj['completed'] = completedWeightageObj.completed;
        weightage[completedWeightageObj.id] = tempObj;
    });
    return [weightage, totalSections];
};

/**
 * Gets total and completed weights
 * @return Promise
 */
dataAccess.getOverallWeightage = async function getOverallWeightage() {
    var totalWeightage = await sequelize.query('select sum(tasks.weightage) as total from tasks',
        {type: QueryTypes.SELECT}
    );
    var completedWeightage = await sequelize.query('select sum(tasks.weightage) as completed from tasks where tasks.status is \'completed\'',
        {type: QueryTypes.SELECT}
    );
    if(totalWeightage == null || completedWeightage == null) {
        return null;
    }
    return {'total': totalWeightage['0']['total'], 'completed': completedWeightage['0']['completed']};
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
    if (typeof taskDetails != 'object' || taskDetails == null) {
        console.error('Task: Param passed is invalid');
        return false;
    }
    var parsedWeightage = parseInt(taskDetails.weightage);
    if (isNaN(parsedWeightage)) {
        console.error('Task: Weightage passed is NaN : ' +  taskDetails.weightage);
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
        {fields: ['name', 'desc', 'status', 'weightage', 'entry_time', 'finish_time', 'parent_section_id']} //Allows insertion of only these fields
    )
        .then((res) => {
            return res.dataValues;
        })
        .catch(err => {
            if (err.toString().includes('cannot be null')) {
                console.error('Task: Param missing', err);
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
    if (typeof taskDetails != 'object' || taskDetails == null) {
        console.error('Task: Param passed is invalid');
        return false;
    }
    var currentTime = new Date();
    return await Task.update(
        {
            status: taskDetails.status,
            finish_time: currentTime
        },
        {fields: ['status','finish_time']}, //Allows insertion of only these fields
        {where: {id: taskDetails.id}}
    )
        .then(() => {
            return true;
        })
        .catch(err => {
            if (err.toString().includes('cannot be null')) {
                console.error('Task: Param missing', err);
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
    return await Task.findOne(
        {
            attributes: ['name', 'desc', 'status', 'weightage', 'entry_time', 'finish_time', 'parent_section_id'],
            where: {task_id: taskId}
        })
        .then(task => {
            return task;
        })
        .catch(err => {
            console.error(err);
            return false;
        });
};

/**
 * Gets all entries from Task table
 * @return Promise
 * @param taskId
 */
dataAccess.getTasks = async function getTasks() {
    var tasks = await sequelize.query('select * from tasks', 
        {type: QueryTypes.SELECT}
    );
    return tasks; 
};

/**
 * Returns all distinct Task names as an array
 */
dataAccess.getTaskNames = async function getTaskNames() {
    var namesResult = await sequelize.query('select distinct name from tasks',
        {type: QueryTypes.SELECT}
    );
    var names = [];
    namesResult.forEach(function(name) {
        names.push(name.name);
    });
    return names;
};

/**
 * Gets entries from Task table corresponding to that parent_section_id
 * @return Promise
 * @param parentSectionId
 */
dataAccess.getTasksBySectionId = async function getTasksBySectionId(parentSectionId) {
    return await Task.findAll(
        {
            attributes: ['name', 'desc', 'status', 'weightage', 'entry_time', 'finish_time', 'parent_section_id'],
            where: {parent_section_id: parentSectionId}
        })
        .then(tasks => {
            return tasks;
        })
        .catch(err => {
            console.error(err);
            return false;
        });
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
    if (typeof taskTagRelDetails != 'object' || taskTagRelDetails == null) {
        console.error('TaskTagRels: Param passed is invalid');
        return false;
    }

    return await TaskTagRel.create(
        {task_id: taskTagRelDetails.taskId, tag_id: taskTagRelDetails.tagId},
        {fields: ['task_id', 'tag_id']} //Allows insertion of only these fields
    )
        .then(() => {
            console.log(true);
            return true;
        })
        .catch(err => {
            if (err.toString().includes('cannot be null')) {
                console.error('TaskTagRel: Param missing', err);
                return false;
            } else if (err.toString().includes('ForeignKeyConstraintError')) {
                console.error('TaskTagRel: Foreign Key constraint failed', err);
                return false;
            } else {
                console.error(err);
                return false;
            }
        });
};

/**
 * Adds multiple entries in TaskTagRel table
 * @return Promise
 * @param taskTagRelDetails Array containing Objects containing params
 * taskTagRelDetails: [{task_id: x, tag_id: y}, ...]; note the snake case
 * Params: taskId, tagId
 */
dataAccess.addMultipleTaskTagRel = async function addMultipleTaskTagRel(taskTagRelDetails) {
    if (taskTagRelDetails == null || !Array.isArray(taskTagRelDetails)) {
        console.error('TaskTagRels: Param passed is invalid');
        return false;
    }

    return await TaskTagRel.bulkCreate(
        taskTagRelDetails,
        {fields: ['task_id', 'tag_id'], ignoreDuplicates: true}
    )
        .then((res) => {
            console.log(res);
            return true;
        })
        .catch(err => {
            if (err.toString().includes('cannot be null')) {
                console.error('TaskTagRel: Param missing', err);
                return false;
            } else if (err.toString().includes('ForeignKeyConstraintError')) {
                console.error('TaskTagRel: Foreign Key constraint failed', err);
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
            attributes: ['id', 'task_id', 'tag_id'],
            where: {task_id: taskId}
        })
        .then(section => {
            return section;
        })
        .catch(err => {
            console.error(err);
            return false;
        });
};

/**
 * Gets all entries from TaskTagRels
 * @return Promise
 * @param taskId
 */
dataAccess.getTaskTagRels = async function getTaskTagRels() {
    var taskTagRels = await sequelize.query('select task_id, tag_id from task_tag_rels',
        {QueryTypes: QueryTypes.SELECT}
    );
    return taskTagRels[0];
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

module.exports = dataAccess;