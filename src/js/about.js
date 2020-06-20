var about = {};

about.showAboutModal = function showAboutModal() {
    $('.about.ui.modal').modal('show');
    $('.about.popup').popup({
        preserve: true,
        hoverable: true
    });
};

module.exports = about;