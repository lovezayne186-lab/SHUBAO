(function () {
    'use strict';

    const STORAGE_KEY = 'qlkj_settings_v1';
    const defaultSettings = {
        xiuluoEnabled: false,
        autoRoleMoodDiaryEnabled: true,
        roleCommentOnUserDiaryEnabled: true
    };

    function loadSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return Object.assign({}, defaultSettings);
            const parsed = JSON.parse(raw);
            return Object.assign({}, defaultSettings, parsed || {});
        } catch (e) {
            return Object.assign({}, defaultSettings);
        }
    }

    function saveSettings(settings) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) { }
    }

    function getSetting(key) {
        return loadSettings()[key];
    }

    function setSetting(key, value) {
        const settings = loadSettings();
        settings[key] = value;
        saveSettings(settings);
        return settings[key];
    }

    function isXiuluoEnabled() {
        return getSetting('xiuluoEnabled') === true;
    }

    function isAutoRoleMoodDiaryEnabled() {
        return getSetting('autoRoleMoodDiaryEnabled') !== false;
    }

    function isRoleCommentOnUserDiaryEnabled() {
        return getSetting('roleCommentOnUserDiaryEnabled') !== false;
    }

    window.CoupleSpaceSettings = {
        STORAGE_KEY: STORAGE_KEY,
        loadSettings: loadSettings,
        saveSettings: saveSettings,
        getSetting: getSetting,
        setSetting: setSetting,
        isXiuluoEnabled: isXiuluoEnabled,
        isAutoRoleMoodDiaryEnabled: isAutoRoleMoodDiaryEnabled,
        isRoleCommentOnUserDiaryEnabled: isRoleCommentOnUserDiaryEnabled
    };
})();
