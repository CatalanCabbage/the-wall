let dataAccess = require("../src/js/dataAccess");
var assert = require("assert");

describe("DataAccess", function () {
    it("Should connect to the DB", async () => {
        return dataAccess.isConnected
            .then((isConnected) => {
                assert(isConnected);
            })
    });
    describe("Tags", function () {
        let currentDate = new Date();
        let randomTagName = Math.random().toString(); //Tag name to be inserted
        describe("#addTag()", function () {
            it("Should add a tag", function () {
                return dataAccess.getTag(randomTagName) //Check that Tag is not present initially
                    .then((tagDetails) => {
                        //console.log("1: " + currentDate.getSeconds() + ":" + currentDate.getMilliseconds() + "  " + JSON.stringify(tagDetails));
                        if (tagDetails != null) { //TODO: Check return value for result when not found
                            assert.fail("Tag already exists in DB before insertion");
                        }
                        return dataAccess.addTag(randomTagName, "Tag description") //Insert Tag
                            .then((isAdded) => {
                                console.log(typeof isAdded);
                                console.log(isAdded)
                                if (!isAdded) {
                                    assert.fail("Tag was not inserted into the DB");
                                }
                                return dataAccess.getTag(randomTagName) //Check if Tag is actually present after insertion
                                    .then((tagDetails) => {
                                        if (tagDetails != null) {
                                            assert.ok("Tag added to DB");
                                        } else {
                                            assert.fail("Tag not present in DB after calling #addTag()");
                                        }
                                    })
                            })
                    })
                    .catch((err) => {
                        assert.fail(err.toString());
                    })
            });
            it("Should not be added when not unique", function () {
                return dataAccess.getTag(randomTagName) //Check that Tag is present initially
                    .then((tagDetails) => {
                        //console.log("1: TagDetails" + currentDate.getSeconds() + ":" + currentDate.getMilliseconds() + "  " + JSON.stringify(tagDetails));
                        if (tagDetails == null) { //TODO: Check return value for result when not found
                            assert.fail("Tag does not exist in DB before insertion");
                        }
                        return dataAccess.addTag(randomTagName, "Tag description") //Insert Tag
                            .then((isAdded) => {
                                if (isAdded == false) {
                                    assert.ok("Tag not added");
                                }
                            })
                    })
                    .catch((err) => {
                        assert.fail(err.toString());
                    })
            });
        });
        describe("#deleteTag()", function () {
            it("Should delete a tag", function () {
                dataAccess.getTag(randomTagName) //Check that Tag is present initially
                    .then((tagDetails) => {
                        //console.log("2: TagDetails" + currentDate.getSeconds() + ":" + currentDate.getMilliseconds() + "  " + JSON.stringify(tagDetails));
                        if (tagDetails == null) { //TODO: Check return value for result when not found
                            assert.fail("Tag does not exist in DB initially");
                        }
                        return dataAccess.deleteTag(randomTagName) //Delete Tag
                            .then((isDeleted) => {
                                if (isDeleted == false) {
                                    assert.fail("Tag was not deleted from the DB");
                                }
                                return dataAccess.getTag(randomTagName) //Check if Tag is actually deleted from DB
                                    .then((tagDetails) => {
                                        if (tagDetails == null) {
                                            assert.ok("Tag deleted");
                                        } else {
                                            assert.fail("Tag is still present in DB after calling #deleteTag()");
                                        }
                                    })
                            })
                    })
                    .catch((err) => {
                        assert.fail(err.toString());
                    })
            });
        });
    })
});