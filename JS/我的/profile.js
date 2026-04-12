var MineProfile = (function () {
    var AVATAR_KEY = 'user_avatar';
    var NAME_KEY = 'user_name';
    var SIGN_KEY = 'user_signature';

    function safeGet(key) {
        try {
            var value = localStorage.getItem(key);
            return value || '';
        } catch (e) {
            return '';
        }
    }

    function safeSet(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
        }
    }

    function getMomentsProfile() {
        var data = null;
        if (typeof window.initMomentsData === 'function') {
            data = window.initMomentsData();
        } else if (window.momentsData && typeof window.momentsData === 'object') {
            data = window.momentsData;
        }
        if (!data) {
            return { avatar: '', name: '' };
        }
        return {
            avatar: data.userAvatar || '',
            name: data.userName || ''
        };
    }

    function syncToMoments(profile) {
        if (!profile) return;
        if (typeof window.initMomentsData !== 'function') return;
        var data = window.initMomentsData();
        if (!data || typeof data !== 'object') return;
        if (profile.avatar) data.userAvatar = profile.avatar;
        if (profile.name) data.userName = profile.name;
        window.momentsData = data;
        if (typeof window.saveMomentsData === 'function') {
            window.saveMomentsData();
        }
    }

    function normalizeProfile() {
        var avatar = safeGet(AVATAR_KEY);
        var name = safeGet(NAME_KEY);
        var signature = safeGet(SIGN_KEY);
        var fromMoments = null;
        if (!avatar || !name) {
            fromMoments = getMomentsProfile();
        }
        if (!avatar && fromMoments && fromMoments.avatar) {
            avatar = fromMoments.avatar;
        }
        if (!name && fromMoments && fromMoments.name) {
            name = fromMoments.name;
        }
        if (!avatar) {
            if (typeof DEFAULT_MOMENTS_AVATAR !== 'undefined') {
                avatar = DEFAULT_MOMENTS_AVATAR;
            } else {
                avatar = 'assets/images/touxiang.jpg';
            }
        }
        if (!name) {
            if (typeof DEFAULT_MOMENTS_NAME !== 'undefined') {
                name = DEFAULT_MOMENTS_NAME;
            } else {
                name = '我';
            }
        }
        if (!signature) {
            signature = '';
        }
        safeSet(AVATAR_KEY, avatar);
        safeSet(NAME_KEY, name);
        safeSet(SIGN_KEY, signature);
        return {
            avatar: avatar,
            name: name,
            signature: signature
        };
    }

    function getProfile() {
        return normalizeProfile();
    }

    function setName(name) {
        var value = String(name || '').trim();
        if (!value) return;
        safeSet(NAME_KEY, value);
        var profile = normalizeProfile();
        profile.name = value;
        syncToMoments(profile);
        if (window.MineCore && typeof window.MineCore.refreshProfile === 'function') {
            window.MineCore.refreshProfile();
        }
    }

    function setSignature(signature) {
        var value = String(signature || '');
        safeSet(SIGN_KEY, value);
        if (window.MineCore && typeof window.MineCore.refreshProfile === 'function') {
            window.MineCore.refreshProfile();
        }
    }

    function setAvatar(avatar) {
        var value = String(avatar || '').trim();
        if (!value) return;
        safeSet(AVATAR_KEY, value);
        var profile = normalizeProfile();
        profile.avatar = value;
        syncToMoments(profile);
        if (window.MineCore && typeof window.MineCore.refreshProfile === 'function') {
            window.MineCore.refreshProfile();
        }
    }

    function applyToView() {
        var root = document.getElementById('mine-view');
        if (!root) return;
        var profile = normalizeProfile();
        var avatarEl = root.querySelector('[data-mine-role="avatar"]');
        var nameEl = root.querySelector('[data-mine-role="name"]');
        var signEl = root.querySelector('[data-mine-role="signature"]');
        if (avatarEl) {
            avatarEl.src = profile.avatar;
        }
        if (nameEl) {
            nameEl.textContent = profile.name || '';
        }
        if (signEl) {
            if (profile.signature) {
                signEl.textContent = profile.signature;
            } else {
                signEl.textContent = '点击设置个性签名';
            }
        }
    }

    function handleHeaderClick() {
        var current = normalizeProfile();
        var newName = prompt('修改昵称', current.name || '');
        if (newName != null) {
            newName = String(newName).trim();
            if (newName) {
                setName(newName);
            }
        }
        var newSign = prompt('修改个性签名', current.signature || '');
        if (newSign != null) {
            setSignature(newSign);
        }
        var newAvatar = prompt('更换头像图片链接', current.avatar || '');
        if (newAvatar != null) {
            newAvatar = String(newAvatar).trim();
            if (newAvatar) {
                setAvatar(newAvatar);
            }
        }
        applyToView();
    }

    function handleAvatarFromMoments(avatar) {
        if (!avatar) return;
        safeSet(AVATAR_KEY, avatar);
        if (window.MineCore && typeof window.MineCore.refreshProfile === 'function') {
            window.MineCore.refreshProfile();
        }
    }

    return {
        getProfile: getProfile,
        setName: setName,
        setSignature: setSignature,
        setAvatar: setAvatar,
        applyToView: applyToView,
        handleHeaderClick: handleHeaderClick,
        handleAvatarFromMoments: handleAvatarFromMoments
    };
})();

window.MineProfile = MineProfile;

