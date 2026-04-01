// 使用第三方聚合接口 (示例地址，需具备容错处理)
const API_GET_URL = "https://api.liumingye.cn/m/api/link?id=";
const API_METING_PLAYLIST = "https://api.injahow.com/meting/?type=playlist&id=";
const API_METING_PLAYLIST_FALLBACK = "https://api.i-meto.com/meting/api?server=netease&type=playlist&id=";
const ITUNES_SEARCH = "https://itunes.apple.com/search?media=music&limit=30&term=";

const SEARCH_SOURCES = [
  { type: "kw", name: "酷我" },
  { type: "kg", name: "酷狗" },
  { type: "tx", name: "QQ" },
  { type: "wy", name: "网易" },
];

(function () {
  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function clampInt(n, min, max) {
    var v = Math.round(n);
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }

  var DEFAULT_COVER = "../assets/images/beijing.jpg";

  var musicApp = qs("#musicApp");
  var topSearch = qs("#topSearch");
  var searchSource = qs("#searchSource");
  var searchInput = qs("#searchInput");
  var searchClear = qs("#searchClear");
  var searchCancel = qs("#searchCancel");
  var playlistImportBtn = qs("#playlistImportBtn");
  var recommendView = qs("#recommend-view");
  var searchView = qs("#search-view");
  var searchList = qs("#searchList");
  var searchHint = qs("#searchHint");

  var miniPlayer = qs("#miniPlayer");
  var miniOpen = qs("#miniOpen");
  var miniCover = qs("#miniCover");
  var miniTitle = qs("#miniTitle");
  var miniArtist = qs("#miniArtist");
  var miniPlayBtn = qs("#miniPlayBtn");

  var toastEl = qs("#toast");

  var playerSheet = qs("#playerSheet");
  if (!playerSheet) return;

  var waveEl = qs("#wave");
  var playBtn = qs("#playBtn");
  var shuffleBtn = qs("#shuffleBtn");
  var prevBtn = qs("#prevBtn");
  var nextBtn = qs("#nextBtn");
  var repeatBtn = qs("#repeatBtn");
  var closeBtn = qs("#closePlayer");
  var moreBtn = qs("#moreBtn");

  var favBtn = qs("#favBtn");
  var chatBtn = qs("#chatBtn");
  var inviteBtn = qs("#inviteBtn");
  var inviteModal = qs("#inviteModal");
  var inviteBackdrop = qs("#inviteBackdrop");
  var inviteClose = qs("#inviteClose");
  var inviteList = qs("#inviteList");
  var togetherMenuModal = qs("#togetherMenuModal");
  var togetherMenuBackdrop = qs("#togetherMenuBackdrop");
  var togetherMenuChatBtn = qs("#togetherMenuChat");
  var togetherMenuExitBtn = qs("#togetherMenuExit");
  var togetherExitModal = qs("#togetherExitModal");
  var togetherExitBackdrop = qs("#togetherExitBackdrop");
  var togetherExitAvatarLeft = qs("#togetherExitAvatarLeft");
  var togetherExitAvatarRight = qs("#togetherExitAvatarRight");
  var togetherExitSongCount = qs("#togetherExitSongCount");
  var togetherExitDurationMin = qs("#togetherExitDurationMin");
  var togetherExitShareBtn = qs("#togetherExitShare");
  var togetherExitCloseBtn = qs("#togetherExitClose");
  var queueModal = qs("#queueModal");
  var queueBackdrop = qs("#queueBackdrop");
  var queueClose = qs("#queueClose");
  var queueList = qs("#queueList");
  var togetherRow = qs("#togetherRow");
  var togetherDurationLabel = qs("#togetherDurationLabel");
  var chatDrawer = qs("#chatDrawer");
  var chatDrawerBackdrop = qs("#chatDrawerBackdrop");
  var chatDrawerClose = qs("#chatDrawerClose");
  var chatDrawerTitle = qs("#chatDrawerTitle");
  var chatDrawerBody = qs("#chatList") || qs("#chatDrawerBody");
  var chatDrawerTyping = qs("#chatDrawerTyping");
  var chatDrawerInput = qs("#chatDrawerInput");
  var chatDrawerSend = qs("#chatDrawerSend");
  var currentTimeEl = qs("#currentTime");
  var durationTimeEl = qs("#durationTime");

  var coverImg = qs("#coverImg");
  var coverCard = qs("#coverCard");
  var trackTitle = qs("#trackTitle");
  var trackArtist = qs("#trackArtist");
  var npTrackTitle = qs("#npTrackTitle");
  var npTrackArtist = qs("#npTrackArtist");
  var lyricsView = qs("#lyricsView");
  var lyricListEl = qs("#lyricList");

  var tabs = qsa(".tab");
  var homePlaylist = qs("#homePlaylist");
  var homePage = qs("#homePage");
  var profilePage = qs("#profilePage");
  var profileRoot = qs("#profileRoot");
  var homeHeader = qs(".home-header");
  var homeSelectCancel = qs("#homeSelectCancel");
  var homeDeleteBtn = qs("#homeDeleteBtn");

  var audioEl = null;
  try {
    if (window.parent && window.parent !== window && window.parent.__globalAudioEl) {
      audioEl = window.parent.__globalAudioEl;
    }
  } catch (e) {}
  if (!audioEl) audioEl = qs("#audioEl");

  function getGlobalPlayer() {
    try {
      if (window.parent && window.parent !== window && window.parent.GlobalMusicPlayer) {
        return window.parent.GlobalMusicPlayer;
      }
    } catch (e) {}
    return null;
  }

  function readTogetherSession() {
    try {
      if (!window.localStorage) return null;
      var raw = localStorage.getItem("listen_together_session") || "";
      if (!raw) return null;
      var data = safeJsonParse(raw);
      if (!data || typeof data !== "object") return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function syncFromGlobalPlayer() {
    var gp = getGlobalPlayer();
    if (!gp || typeof gp.getState !== "function") return;
    var s = null;
    try {
      s = gp.getState();
    } catch (e) {
      s = null;
    }
    var t = s && s.track ? s.track : null;
    if (t && (t.cover || t.title || t.artist)) {
      applyTrackInfo({
        title: t.title || "",
        artist: t.artist || "",
        cover: t.cover || DEFAULT_COVER,
        url: t.url || "",
        id: t.id || "",
        sourceType: t.sourceType || t.source || "",
      });
    }
    if (typeof s === "object" && s) {
      state.isPlaying = !!s.isPlaying;
      setPlayIcon(!!s.isPlaying);
      updateTimeLabels();
      updateWaveFromAudio();
    }
  }

  function syncTogetherFromStorage() {
    var session = readTogetherSession();
    if (session) applyTogetherSession(session);
    else {
      playerSheet.classList.remove("is-together");
      state.togetherRoleId = "";
      state.togetherLastCountedKey = "";
    }
  }

  var FAV_KEY = "music_favs_v1";

  function loadFavs() {
    try {
      var raw = window.localStorage ? localStorage.getItem(FAV_KEY) : "";
      if (!raw) return {};
      var data = safeJsonParse(raw);
      if (!data || typeof data !== "object") return {};
      return data;
    } catch (e) {
      return {};
    }
  }

  function saveFavs(map) {
    try {
      if (!window.localStorage) return;
      localStorage.setItem(FAV_KEY, JSON.stringify(map || {}));
    } catch (e) {}
  }

  function isFav(key) {
    if (!key) return false;
    var m = loadFavs();
    return !!m[String(key)];
  }

  function normalizeLibrarySong(song) {
    if (!song || typeof song !== "object") return null;
    var title = song.title ? String(song.title) : "";
    if (!title) return null;
    var id = song.id ? String(song.id) : "";
    var source = song.source || song.sourceType ? String(song.source || song.sourceType) : "";
    var sourceType = song.sourceType || song.source ? String(song.sourceType || song.source) : "";
    var cover = song.cover ? String(song.cover) : DEFAULT_COVER;
    var artist = song.artist ? String(song.artist) : "未知歌手";
    var url = song.url || song.src ? String(song.url || song.src) : "";
    if (!id && !url) return null;
    return {
      id: id,
      title: title,
      artist: artist,
      cover: cover,
      url: "",
      source: source,
      sourceType: sourceType,
      disabled: false,
    };
  }

  function addSongToLibrary(song, silent) {
    var normalized = normalizeLibrarySong(song);
    if (!normalized) return { song: null, added: false };
    var idx = findLibrarySongIndex(normalized);
    if (idx >= 0) return { song: state.library[idx], added: false };
    state.library = (state.library || []).concat([normalized]);
    saveLibrary();
    rebuildQueue();
    if (!silent) renderHomePlaylist();
    return { song: normalized, added: true };
  }

  function toggleFavForSong(song) {
    if (!song) return false;
    var res = addSongToLibrary(song, true);
    var target = res.song || song;
    var key = trackKey(target);
    if (!key) return false;
    var m = loadFavs();
    var active = !!m[String(key)];
    if (active) delete m[String(key)];
    else m[String(key)] = 1;
    saveFavs(m);
    updateFavButton();
    if (profilePage && !profilePage.hidden) renderProfileView();
    return !active;
  }

  function toggleFav() {
    var current = ensureCurrentTrackInfo();
    if (!current) {
      showToast("暂无歌曲");
      return;
    }
    toggleFavForSong(current);
  }

  function updateFavButton() {
    if (!favBtn) return;
    var current = state.queue[state.currentIndex];
    var key = trackKey(current);
    var active = !!(key && isFav(key));
    var icon = qs("i", favBtn);
    if (icon) icon.className = active ? "bx bxs-heart" : "bx bx-heart";
    favBtn.setAttribute("aria-pressed", active ? "true" : "false");
  }

  function setInviteOpen(open) {
    if (!inviteModal) return;
    inviteModal.classList.toggle("is-active", !!open);
    inviteModal.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function setQueueOpen(open) {
    if (!queueModal) return;
    queueModal.classList.toggle("is-active", !!open);
    queueModal.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function setTogetherMenuOpen(open) {
    if (!togetherMenuModal) return;
    togetherMenuModal.classList.toggle("is-active", !!open);
    togetherMenuModal.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function setTogetherExitOpen(open) {
    if (!togetherExitModal) return;
    togetherExitModal.classList.toggle("is-active", !!open);
    togetherExitModal.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function renderQueue() {
    if (!queueList) return;
    queueList.innerHTML = "";
    if (!state.queue || !state.queue.length) {
      var empty = document.createElement("div");
      empty.className = "home-empty";
      empty.textContent = "暂无歌曲";
      queueList.appendChild(empty);
      return;
    }

    state.queue.forEach(function (song, idx) {
      var item = document.createElement("button");
      item.type = "button";
      item.className = "queue-item";
      item.dataset.index = String(idx);
      if (idx === state.currentIndex) item.classList.add("is-active");

      var meta = document.createElement("div");
      meta.className = "queue-item-meta";

      var t = document.createElement("div");
      t.className = "queue-item-title";
      t.textContent = song && song.title ? String(song.title) : "未知歌曲";

      var a = document.createElement("div");
      a.className = "queue-item-artist";
      a.textContent = song && song.artist ? String(song.artist) : "未知歌手";

      meta.appendChild(t);
      meta.appendChild(a);
      item.appendChild(meta);

      item.addEventListener("click", function () {
        playQueueIndex(idx);
        setQueueOpen(false);
      });

      queueList.appendChild(item);
    });
  }

  function openQueue() {
    renderQueue();
    setQueueOpen(true);
  }

  function getCharProfiles() {
    try {
      if (window.parent && window.parent !== window && window.parent.charProfiles) {
        return window.parent.charProfiles;
      }
    } catch (e) {}
    try {
      var raw = localStorage.getItem("wechat_charProfiles");
      var parsed = safeJsonParse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (e) {}
    return {};
  }

  function renderInviteList() {
    if (!inviteList) return;
    inviteList.innerHTML = "";
    var profiles = getCharProfiles();
    var ids = Object.keys(profiles || {});
    if (!ids.length) {
      var empty = document.createElement("div");
      empty.className = "home-empty";
      empty.textContent = "暂无角色";
      inviteList.appendChild(empty);
      return;
    }

    ids.forEach(function (id) {
      var p = profiles[id] || {};
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "invite-item";
      btn.dataset.id = String(id);

      var av = document.createElement("div");
      av.className = "invite-avatar";
      var img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      img.src = p.avatar || "assets/chushitouxiang.jpg";
      av.appendChild(img);

      var meta = document.createElement("div");
      meta.className = "invite-meta";
      var name = document.createElement("div");
      name.className = "invite-name";
      name.textContent = p.nickName || p.name || String(id);
      var sub = document.createElement("div");
      sub.className = "invite-sub";
      sub.textContent = "发送一起听邀请";
      meta.appendChild(name);
      meta.appendChild(sub);

      btn.appendChild(av);
      btn.appendChild(meta);

      btn.addEventListener("click", function () {
        sendTogetherInvite(String(id));
        setInviteOpen(false);
      });

      inviteList.appendChild(btn);
    });
  }

  function normalizeAssetUrl(url) {
    var s = url ? String(url) : "";
    if (!s) return "";
    if (s.indexOf("../") === 0) return s.slice(3);
    return s;
  }

  function sendTogetherInvite(roleId) {
    var current = ensureCurrentTrackInfo();
    var title = current && current.title ? String(current.title) : "未知歌曲";
    var artist = current && current.artist ? String(current.artist) : "未知歌手";
    var url = audioEl && audioEl.src ? String(audioEl.src) : "";
    var cover = current && current.cover ? String(current.cover) : "";
    var myProfile = null;
    try {
      myProfile = loadProfile();
    } catch (e0) {
      myProfile = null;
    }
    var payload = {
      roleId: String(roleId || ""),
      track: { title: title, artist: artist, cover: normalizeAssetUrl(cover), url: url, key: trackKey(current) },
      userName: myProfile && myProfile.name ? String(myProfile.name) : "",
      userAvatar: myProfile && myProfile.avatar ? normalizeAssetUrl(myProfile.avatar) : "",
      at: Date.now(),
    };
    try {
      if (window.parent && window.parent !== window) {
        window.parent.localStorage.setItem("listen_together_invite", JSON.stringify(payload));
      } else {
        localStorage.setItem("listen_together_invite", JSON.stringify(payload));
      }
    } catch (e) {}

    try {
      if (window.parent && window.parent !== window) {
        var parentWin = window.parent;
        if (typeof parentWin.sendInvite === "function") {
          try {
            parentWin.sendInvite(payload);
          } catch (e0) {}
        } else {
          if (!parentWin.chatData || typeof parentWin.chatData !== "object") {
            try {
              parentWin.chatData = JSON.parse(parentWin.localStorage.getItem("wechat_chatData") || "{}");
            } catch (e2) {
              parentWin.chatData = {};
            }
          }
          if (!Array.isArray(parentWin.chatData[roleId])) parentWin.chatData[roleId] = [];
          var userAvatar = payload && payload.userAvatar ? String(payload.userAvatar) : "";
          var userName = payload && payload.userName ? String(payload.userName) : "";
          parentWin.chatData[roleId].push({
            role: "me",
            type: "listen_invite",
            timestamp: Date.now(),
            status: "sent",
            inviteId: "lt_" + Date.now() + "_" + Math.random().toString(16).slice(2),
            inviteStatus: "pending",
            userName: userName || "我",
            userAvatar: userAvatar || "assets/chushitouxiang.jpg",
            track: payload.track || null,
          });
          try {
            parentWin.localStorage.setItem("wechat_chatData", JSON.stringify(parentWin.chatData));
          } catch (e4) {}
          if (typeof parentWin.saveData === "function") {
            try {
              parentWin.saveData();
            } catch (e5) {}
          }
        }
        if (typeof parentWin.enterChatRoom === "function") {
          parentWin.enterChatRoom(roleId);
        } else if (typeof parentWin.openChatApp === "function") {
          parentWin.openChatApp();
        }
        showToast("已发送邀请");
        return;
      }
    } catch (e) {}

    showToast("邀请已生成");
  }

  var modeList = [
    { key: "loop", icon: "bx-refresh", label: "列表循环" },
    { key: "single", icon: "bx-repeat", label: "单曲循环" },
    { key: "shuffle", icon: "bx-shuffle", label: "随机播放" },
  ];

  var STORAGE_KEY = "music_library_v1";
  function getSearchType() {
    var t = "";
    try {
      t = searchSource ? String(searchSource.value || "").trim() : "";
    } catch (e) {}
    return t || "kw";
  }

  var state = {
    queue: [],
    library: [],
    queueMode: "library",
    currentIndex: 0,
    isPlaying: false,
    homeSelecting: false,
    homeSelectedKeys: null,
    homeIgnoreClick: false,
    modeIndex: 0,
    barCount: 0,
    progressCount: 0,
    bars: [],
    toastTimer: null,
    playCtx: null,
    lyricsKey: "",
    lyricsLines: [],
    lyricsEls: [],
    lyricsActiveIndex: -1,
    lyricFetchTimer: null,
    lyricCache: {},
    listenSeconds: 0,
    listenStartedAt: 0,
    previewFixMap: {},
    togetherRoleId: "",
    togetherLastCountedKey: "",
  };

  function safeJsonParse(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  var PROFILE_KEY = "music_profile_v1";
  var LISTEN_SECONDS_KEY = "music_listen_seconds_v1";
  var TOGETHER_STATS_KEY = "listen_together_stats_v1";

  state.homeSelectedKeys = new Set();

  function loadListenSeconds() {
    try {
      if (!window.localStorage) return 0;
      var raw = localStorage.getItem(LISTEN_SECONDS_KEY) || "";
      var v = Number(raw || 0);
      if (!isFinite(v) || v < 0) v = 0;
      return Math.floor(v);
    } catch (e) {
      return 0;
    }
  }

  state.listenSeconds = loadListenSeconds();

  function saveListenSeconds(sec) {
    try {
      if (!window.localStorage) return;
      var v = Number(sec || 0);
      if (!isFinite(v) || v < 0) v = 0;
      localStorage.setItem(LISTEN_SECONDS_KEY, String(Math.floor(v)));
    } catch (e) {}
  }

  function loadTogetherStatsMap() {
    try {
      if (!window.localStorage) return {};
      var raw = localStorage.getItem(TOGETHER_STATS_KEY) || "";
      var data = raw ? safeJsonParse(raw) : null;
      if (!data || typeof data !== "object") return {};
      return data;
    } catch (e) {
      return {};
    }
  }

  function saveTogetherStatsMap(map) {
    try {
      if (!window.localStorage) return;
      localStorage.setItem(TOGETHER_STATS_KEY, JSON.stringify(map || {}));
    } catch (e) {}
  }

  function resolveTogetherRoleId(session) {
    if (!session || typeof session !== "object") return "";
    var id = session.roleId || session.characterId || session.character || session.aiId || session.id;
    return id ? String(id) : "";
  }

  function ensureTogetherRoleId() {
    var session = readTogetherSession();
    var id = resolveTogetherRoleId(session);
    state.togetherRoleId = id;
    return id;
  }

  function addTogetherListenSeconds(sec) {
    var roleId = state.togetherRoleId || ensureTogetherRoleId();
    if (!roleId) return;
    var s = Number(sec || 0);
    if (!isFinite(s) || s <= 0) return;
    var map = loadTogetherStatsMap();
    var cur = map[roleId] && typeof map[roleId] === "object" ? map[roleId] : {};
    var prev = Number(cur.listenSeconds || 0);
    if (!isFinite(prev) || prev < 0) prev = 0;
    cur.listenSeconds = Math.floor(prev + s);
    if (!("songs" in cur)) cur.songs = 0;
    map[roleId] = cur;
    saveTogetherStatsMap(map);
  }

  function bumpTogetherSongCount() {
    var roleId = state.togetherRoleId || ensureTogetherRoleId();
    if (!roleId) return;
    var map = loadTogetherStatsMap();
    var cur = map[roleId] && typeof map[roleId] === "object" ? map[roleId] : {};
    var prev = Number(cur.songs || 0);
    if (!isFinite(prev) || prev < 0) prev = 0;
    cur.songs = Math.floor(prev + 1);
    if (!("listenSeconds" in cur)) cur.listenSeconds = 0;
    map[roleId] = cur;
    saveTogetherStatsMap(map);
  }

  function addListenDeltaMs(deltaMs) {
    var d = Number(deltaMs || 0);
    if (!isFinite(d) || d <= 0) return;
    var sec = Math.floor(d / 1000);
    if (!sec) return;
    state.listenSeconds = (state.listenSeconds || 0) + sec;
    saveListenSeconds(state.listenSeconds);
    addTogetherListenSeconds(sec);
  }

  function flushListenTime() {
    if (!state.listenStartedAt) return;
    addListenDeltaMs(Date.now() - state.listenStartedAt);
    state.listenStartedAt = 0;
  }

  function formatListenDuration(sec) {
    var s = Number(sec || 0);
    if (!isFinite(s) || s < 0) s = 0;
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    if (h <= 0) return m + "m";
    if (m <= 0) return h + "h";
    return h + "h " + m + "m";
  }

  function formatHoursMinutesCN(sec) {
    var s = Number(sec || 0);
    if (!isFinite(s) || s < 0) s = 0;
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    return h + "小时" + m + "分钟";
  }

  function getChatCountForRole(roleId) {
    var id = String(roleId || "");
    if (!id) return 0;
    try {
      if (window.parent && window.parent !== window) {
        var pw = window.parent;
        var cd = pw.chatData;
        if (!cd || typeof cd !== "object") {
          try {
            cd = safeJsonParse(pw.localStorage.getItem("wechat_chatData") || "{}");
          } catch (e0) {
            cd = null;
          }
        }
        var list = cd && cd[id];
        if (Array.isArray(list)) return list.length;
      }
    } catch (e) {}
    try {
      var local = safeJsonParse(localStorage.getItem("wechat_chatData") || "{}");
      var list2 = local && local[id];
      if (Array.isArray(list2)) return list2.length;
    } catch (e2) {}
    return 0;
  }

  function buildTogetherExitSummaryText(roleId) {
    var id = String(roleId || "");
    var map = loadTogetherStatsMap();
    var cur = map[id] && typeof map[id] === "object" ? map[id] : {};
    var sec = Number(cur.listenSeconds || 0);
    if (!isFinite(sec) || sec < 0) sec = 0;
    var songs = Number(cur.songs || 0);
    if (!isFinite(songs) || songs < 0) songs = 0;
    return "本次一起听歌" + Math.floor(songs) + "首，本次相互陪伴" + formatHoursMinutesCN(sec);
  }

  function sendTextToRole(roleId, text) {
    var id = String(roleId || "");
    var content = String(text || "").trim();
    if (!id || !content) return false;
    try {
      if (window.parent && window.parent !== window) {
        var parentWin = window.parent;
        if (!parentWin.chatData || typeof parentWin.chatData !== "object") {
          try {
            parentWin.chatData = JSON.parse(parentWin.localStorage.getItem("wechat_chatData") || "{}");
          } catch (e1) {
            parentWin.chatData = {};
          }
        }
        if (!Array.isArray(parentWin.chatData[id])) parentWin.chatData[id] = [];
        parentWin.chatData[id].push({
          role: "me",
          content: content,
          type: "text",
          timestamp: Date.now(),
          status: "sent",
        });
        try {
          parentWin.localStorage.setItem("wechat_chatData", JSON.stringify(parentWin.chatData));
        } catch (e2) {}
        if (typeof parentWin.saveData === "function") {
          try {
            parentWin.saveData();
          } catch (e3) {}
        }
        return true;
      }
    } catch (e) {}
    try {
      var local = safeJsonParse(localStorage.getItem("wechat_chatData") || "{}");
      if (!local || typeof local !== "object") local = {};
      if (!Array.isArray(local[id])) local[id] = [];
      local[id].push({ role: "me", content: content, type: "text", timestamp: Date.now(), status: "sent" });
      localStorage.setItem("wechat_chatData", JSON.stringify(local));
      return true;
    } catch (e4) {}
    return false;
  }

  function loadProfile() {
    var p = null;
    try {
      if (!window.localStorage) p = null;
      else {
        var raw = localStorage.getItem(PROFILE_KEY) || "";
        p = raw ? safeJsonParse(raw) : null;
      }
    } catch (e) {
      p = null;
    }
    if (!p || typeof p !== "object") p = {};
    if (!Array.isArray(p.gallery)) p.gallery = [];
    return {
      name: p.name ? String(p.name) : "未命名用户",
      sign: p.sign ? String(p.sign) : "点击设置个性签名",
      avatar: p.avatar ? String(p.avatar) : DEFAULT_COVER,
      gallery: [p.gallery[0], p.gallery[1], p.gallery[2], p.gallery[3]].map(function (x) {
        return x ? String(x) : "";
      }),
      follow: Number.isFinite(Number(p.follow)) ? Math.max(0, Math.floor(Number(p.follow))) : 0,
      fans: Number.isFinite(Number(p.fans)) ? Math.max(0, Math.floor(Number(p.fans))) : 0,
    };
  }

  function saveProfile(p) {
    try {
      if (!window.localStorage) return;
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p || {}));
    } catch (e) {}
  }

  function loadLibrary() {
    try {
      var raw = window.localStorage ? localStorage.getItem(STORAGE_KEY) : "";
      if (!raw) return [];
      var data = safeJsonParse(raw);
      if (!Array.isArray(data)) return [];
      return data
        .map(function (x) {
          if (!x || typeof x !== "object") return null;
          var title = x.title ? String(x.title) : "";
          var id = x.id ? String(x.id) : "";
          var url = x.url ? String(x.url) : "";
          if (!title) return null;
          if (!id && !url) return null;
          return {
            id: id,
            title: title,
            artist: x.artist ? String(x.artist) : "未知歌手",
            cover: x.cover ? String(x.cover) : DEFAULT_COVER,
            url: url,
            source: x.source || x.sourceType ? String(x.source || x.sourceType) : "",
            sourceType: x.sourceType || x.source ? String(x.sourceType || x.source) : "",
            disabled: !!x.disabled,
          };
        })
        .filter(function (x) {
          return !!x;
        });
    } catch (e) {
      return [];
    }
  }

  function saveLibrary() {
    try {
      if (!window.localStorage) return;
      var payload = (state.library || []).map(function (s) {
        return {
          id: s && s.id ? String(s.id) : "",
          title: s && s.title ? String(s.title) : "",
          artist: s && s.artist ? String(s.artist) : "",
          cover: s && s.cover ? String(s.cover) : "",
          url: s && s.url ? String(s.url) : "",
          source: s && (s.source || s.sourceType) ? String(s.source || s.sourceType) : "",
          sourceType: s && (s.sourceType || s.source) ? String(s.sourceType || s.source) : "",
          disabled: !!(s && s.disabled),
        };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {}
  }

  function getActiveLibrary() {
    return (state.library || [])
      .filter(function (s) {
        if (!s) return false;
        if (s.disabled) return false;
        if (s.url || s.src) return true;
        return !!s.id;
      });
  }

  function syncLibraryQueue() {
    if (state.queueMode !== "library") return;
    state.queue = getActiveLibrary().slice();
    if (state.currentIndex >= state.queue.length) state.currentIndex = 0;
  }

  function rebuildQueue() {
    syncLibraryQueue();
  }

  function ensureLatestServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    var key = "__music_sw_reloaded__";
    navigator.serviceWorker
      .getRegistrations()
      .then(function (regs) {
        if (!regs || !regs.length) return null;
        return Promise.all(
          regs.map(function (reg) {
            if (!reg) return null;
            return reg
              .update()
              .catch(function () {})
              .then(function () {
                return reg;
              });
          })
        );
      })
      .then(function (regs) {
        if (!regs || !regs.length) return;
        regs.forEach(function (reg) {
          if (!reg) return;
          if (reg.waiting) {
            try {
              reg.waiting.postMessage({ type: "SKIP_WAITING" });
            } catch (e) {}
          }
        });
      })
      .catch(function () {});

    navigator.serviceWorker.addEventListener("controllerchange", function () {
      try {
        if (window.sessionStorage && sessionStorage.getItem(key) === "1") return;
        if (window.sessionStorage) sessionStorage.setItem(key, "1");
      } catch (e) {}
      window.location.reload();
    });
  }

  function renderHomePlaylist() {
    if (!homePlaylist) return;
    var list = getActiveLibrary();
    homePlaylist.innerHTML = "";

    if (!list.length) {
      var empty = document.createElement("div");
      empty.className = "home-empty";
      empty.textContent = "暂无歌曲";
      homePlaylist.appendChild(empty);
      return;
    }

    list.forEach(function (song, index) {
      var btn = document.createElement("button");
      btn.className = "playlist-item";
      btn.type = "button";
      btn.dataset.index = String(index);
      var key = trackKey(song);
      if (key) btn.dataset.key = key;
      if (state.homeSelectedKeys && key && state.homeSelectedKeys.has(key)) btn.classList.add("is-selected");

      var cover = document.createElement("div");
      cover.className = "playlist-cover";
      var coverUrl = song && song.cover ? String(song.cover) : "";
      if (coverUrl) {
        cover.style.backgroundImage = 'url("' + coverUrl.replace(/"/g, "") + '")';
        cover.style.backgroundSize = "cover";
        cover.style.backgroundPosition = "center";
      } else {
        if (index % 3 === 1) cover.classList.add("alt");
        if (index % 3 === 2) cover.classList.add("alt2");
      }

      var meta = document.createElement("div");
      meta.className = "playlist-meta";
      var name = document.createElement("div");
      name.className = "playlist-name";
      name.textContent = (song && song.title) || "未知歌曲";
      var desc = document.createElement("div");
      desc.className = "playlist-desc";
      desc.textContent = (song && song.artist) || "未知歌手";
      meta.appendChild(name);
      meta.appendChild(desc);

      var sel = document.createElement("div");
      sel.className = "playlist-select";
      var selIcon = document.createElement("i");
      selIcon.className = "bx bx-check";
      sel.appendChild(selIcon);

      btn.appendChild(cover);
      btn.appendChild(meta);
      btn.appendChild(sel);
      homePlaylist.appendChild(btn);
    });
  }

  function updateHomeSelectUi() {
    if (homeHeader) homeHeader.classList.toggle("is-selecting", !!state.homeSelecting);
    if (homePlaylist) homePlaylist.classList.toggle("is-selecting", !!state.homeSelecting);
  }

  function exitHomeSelectMode() {
    state.homeSelecting = false;
    if (state.homeSelectedKeys) state.homeSelectedKeys.clear();
    updateHomeSelectUi();
    renderHomePlaylist();
  }

  function enterHomeSelectMode() {
    state.homeSelecting = true;
    updateHomeSelectUi();
  }

  function toggleHomeSelectedByKey(key) {
    if (!key) return;
    if (!state.homeSelectedKeys) state.homeSelectedKeys = new Set();
    if (!state.homeSelecting) enterHomeSelectMode();
    if (state.homeSelectedKeys.has(key)) state.homeSelectedKeys.delete(key);
    else state.homeSelectedKeys.add(key);
    if (!state.homeSelectedKeys.size) {
      exitHomeSelectMode();
      return;
    }
    renderHomePlaylist();
    updateHomeSelectUi();
  }

  function removeLibrarySongsByKeys(keys) {
    if (!keys || !keys.size) return 0;
    var before = (state.library || []).length;
    state.library = (state.library || []).filter(function (s) {
      var k = trackKey(s);
      return !k || !keys.has(k);
    });
    var removed = before - state.library.length;
    if (removed < 0) removed = 0;

    var favMap = loadFavs();
    Object.keys(favMap || {}).forEach(function (k) {
      if (keys.has(String(k))) delete favMap[k];
    });
    saveFavs(favMap);

    saveLibrary();
    rebuildQueue();
    return removed;
  }

  function deleteHomeSelectedSongs() {
    if (!state.homeSelectedKeys || !state.homeSelectedKeys.size) return;
    var keys = new Set(Array.from(state.homeSelectedKeys));
    var current = state.queue[state.currentIndex];
    var currentKey = trackKey(current);
    var removed = removeLibrarySongsByKeys(keys);
    if (removed) {
      if (currentKey && keys.has(currentKey)) {
        try {
          if (audioEl) audioEl.pause();
        } catch (e) {}
        state.isPlaying = false;
        setPlayIcon(false);
      }
      showToast("已删除 " + removed + " 首歌曲");
    }
    exitHomeSelectMode();
    if (profilePage && !profilePage.hidden) renderProfileView();
  }

  var PROFILE_GALLERY_PLACEHOLDERS = [
    "../assets/images/beijing.jpg",
    "../assets/images/touxiang.jpg",
    "../assets/images/chatphoto.jpg",
    "../assets/images/beijing.jpg",
  ];

  var profileGallerySlot = -1;

  function renderProfileFavList(list) {
    var root = qs("#profileFavList");
    if (!root) return;
    root.innerHTML = "";
    if (!list || !list.length) {
      var empty = document.createElement("div");
      empty.className = "profile-empty";
      empty.textContent = "暂无收藏";
      root.appendChild(empty);
      return;
    }

    list.forEach(function (song, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "profile-fav-item";
      btn.dataset.index = String(idx);

      var cover = document.createElement("div");
      cover.className = "profile-fav-cover";
      var img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      img.src = (song && song.cover) || DEFAULT_COVER;
      cover.appendChild(img);

      var meta = document.createElement("div");
      meta.className = "profile-fav-meta";
      var title = document.createElement("div");
      title.className = "profile-fav-title";
      title.textContent = (song && song.title) || "未知歌曲";
      var artist = document.createElement("div");
      artist.className = "profile-fav-artist";
      artist.textContent = (song && song.artist) || "未知歌手";
      meta.appendChild(title);
      meta.appendChild(artist);

      btn.appendChild(cover);
      btn.appendChild(meta);

      btn.addEventListener("click", function () {
        state.queueMode = "profile_favs";
        state.queue = list.slice();
        state.currentIndex = idx;
        playSong(song);
      });

      root.appendChild(btn);
    });
  }

  function renderProfileView() {
    if (!profilePage || !profileRoot) return;

    var p = loadProfile();

    var avatarImg = qs("#profileAvatarImg");
    if (avatarImg) avatarImg.src = p.avatar || DEFAULT_COVER;

    var nameBtn = qs("#profileNameBtn");
    if (nameBtn) nameBtn.textContent = p.name || "未命名用户";

    var signBtn = qs("#profileSignBtn");
    if (signBtn) signBtn.textContent = p.sign || "点击设置个性签名";

    var followNum = qs("#profileFollowNum");
    if (followNum) followNum.textContent = String(p.follow || 0);

    var fansNum = qs("#profileFansNum");
    if (fansNum) fansNum.textContent = String(p.fans || 0);

    var listenNum = qs("#profileListenNum");
    if (listenNum) listenNum.textContent = formatListenDuration(state.listenSeconds || 0);

    var photos = qsa(".profile-photo", profileRoot);
    photos.forEach(function (btn, idx) {
      var img = qs("img", btn);
      if (!img) return;
      var src = p.gallery[idx] || PROFILE_GALLERY_PLACEHOLDERS[idx] || DEFAULT_COVER;
      img.src = src;
    });

    var favMap = loadFavs();
    var favSongs = (state.library || []).filter(function (s) {
      var k = trackKey(s);
      return !!(k && favMap && favMap[String(k)]);
    });
    renderProfileFavList(favSongs);
  }

  var profileBound = false;

  function readImageAsDataUrl(file, done) {
    try {
      var reader = new FileReader();
      reader.onload = function () {
        done(reader.result ? String(reader.result) : "");
      };
      reader.onerror = function () {
        done("");
      };
      reader.readAsDataURL(file);
    } catch (e) {
      done("");
    }
  }

  function setupProfileInteractions() {
    if (profileBound) return;
    if (!profileRoot) return;
    profileBound = true;

    var avatarBtn = qs("#profileAvatarBtn");
    var avatarInput = qs("#profileAvatarInput");
    var nameBtn = qs("#profileNameBtn");
    var signBtn = qs("#profileSignBtn");
    var galleryInput = qs("#profileGalleryInput");

    if (avatarBtn && avatarInput) {
      avatarBtn.addEventListener("click", function () {
        try {
          avatarInput.click();
        } catch (e) {}
      });

      avatarInput.addEventListener("change", function () {
        var file = avatarInput.files && avatarInput.files[0] ? avatarInput.files[0] : null;
        if (!file) return;
        readImageAsDataUrl(file, function (dataUrl) {
          if (!dataUrl) return;
          var p = loadProfile();
          p.avatar = dataUrl;
          saveProfile(p);
          renderProfileView();
        });
        try {
          avatarInput.value = "";
        } catch (e2) {}
      });
    }

    if (nameBtn) {
      nameBtn.addEventListener("click", function () {
        var p = loadProfile();
        var next = window.prompt("请输入用户名", String(p.name || "")) || "";
        next = String(next).trim();
        if (!next) return;
        p.name = next;
        saveProfile(p);
        renderProfileView();
      });
    }

    if (signBtn) {
      signBtn.addEventListener("click", function () {
        var p = loadProfile();
        var next = window.prompt("请输入个性签名", String(p.sign || "")) || "";
        next = String(next).trim();
        if (!next) return;
        p.sign = next;
        saveProfile(p);
        renderProfileView();
      });
    }

    var photoBtns = qsa(".profile-photo", profileRoot);
    if (galleryInput && photoBtns && photoBtns.length) {
      photoBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          profileGallerySlot = Number(btn.dataset.slot || 0);
          try {
            galleryInput.click();
          } catch (e) {}
        });
      });

      galleryInput.addEventListener("change", function () {
        var file = galleryInput.files && galleryInput.files[0] ? galleryInput.files[0] : null;
        if (!file) return;
        var slot = Number(profileGallerySlot || 0);
        if (!isFinite(slot) || slot < 0 || slot > 3) slot = 0;
        readImageAsDataUrl(file, function (dataUrl) {
          if (!dataUrl) return;
          var p = loadProfile();
          if (!Array.isArray(p.gallery)) p.gallery = [];
          p.gallery[slot] = dataUrl;
          saveProfile(p);
          renderProfileView();
        });
        try {
          galleryInput.value = "";
        } catch (e2) {}
      });
    }
  }

  function showToast(text) {
    if (!toastEl) return;
    if (state.toastTimer) window.clearTimeout(state.toastTimer);
    toastEl.textContent = String(text || "");
    toastEl.classList.add("is-active");
    state.toastTimer = window.setTimeout(function () {
      toastEl.classList.remove("is-active");
    }, 1800);
  }

  // ===== 聊天抽屉与消息同步 =====
  var chatDrawerState = {
    open: false,
    roleId: "",
    roleName: "",
    typingTimer: 0,
    aiReq: 0,
    aiInFlight: false,
    aiInFlightAt: 0,
    lastSystemAt: 0,
    lastSwitchAt: 0,
    lastTrackKey: "",
    lastAmbientAt: 0,
    lastLyricAt: 0,
    lastLyricText: "",
    lastPlaybackAt: 0,
    lastPlaybackKind: "",
  };

  var TOGETHER_START_EMITTED_KEY = "listen_together_start_emitted_v1";

  function readTogetherStartEmittedMap() {
    try {
      if (!window.localStorage) return {};
      var raw = localStorage.getItem(TOGETHER_START_EMITTED_KEY) || "";
      var data = raw ? safeJsonParse(raw) : null;
      return data && typeof data === "object" ? data : {};
    } catch (e) {
      return {};
    }
  }

  function writeTogetherStartEmittedMap(map) {
    try {
      if (!window.localStorage) return;
      localStorage.setItem(TOGETHER_START_EMITTED_KEY, JSON.stringify(map || {}));
    } catch (e) {}
  }

  function maybeEmitTogetherStart(session) {
    var roleId = resolveTogetherRoleId(session) || state.togetherRoleId;
    if (!roleId) return;
    var at = session && session.at ? String(session.at) : "";
    if (!at) at = "unknown";
    var map = readTogetherStartEmittedMap();
    if (String(map[roleId] || "") === at) return;
    map[roleId] = at;
    writeTogetherStartEmittedMap(map);
    var cur = state.queue && state.queue[state.currentIndex] ? state.queue[state.currentIndex] : null;
    var songName = cur && cur.title ? String(cur.title) : "未知歌曲";
    chatDrawerState.lastTrackKey = cur ? trackKey(cur) : "";
    chatDrawerState.lastAmbientAt = 0;
    chatDrawerState.lastLyricAt = 0;
    chatDrawerState.lastLyricText = "";
    syncSystemMessage("start", songName);
  }

  function maybeSyncTogetherSongSwitch(nextSongInfo) {
    if (!isTogetherActive()) return;
    var next = nextSongInfo && typeof nextSongInfo === "object" ? nextSongInfo : null;
    if (!next) return;
    var nextKey = trackKey(next) || (String(next.title || "") + "::" + String(next.artist || ""));
    if (!nextKey) return;
    if (!chatDrawerState.lastTrackKey) {
      chatDrawerState.lastTrackKey = nextKey;
      return;
    }
    if (chatDrawerState.lastTrackKey === nextKey) return;
    chatDrawerState.lastTrackKey = nextKey;
    chatDrawerState.lastAmbientAt = 0;
    chatDrawerState.lastLyricAt = 0;
    chatDrawerState.lastLyricText = "";
    syncSystemMessage("switch", next && next.title ? String(next.title) : "未知歌曲");
  }

  function getTogetherRoleId() {
    return state.togetherRoleId || resolveTogetherRoleId(readTogetherSession());
  }

  function readChatStore() {
    try {
      if (window.parent && window.parent !== window) {
        var pw = window.parent;
        var data = pw.chatData || JSON.parse(pw.localStorage.getItem("wechat_chatData") || "{}");
        return data && typeof data === "object" ? data : {};
      }
    } catch (e) {}
    try {
      var raw = localStorage.getItem("wechat_chatData") || "{}";
      var data2 = safeJsonParse(raw);
      return data2 && typeof data2 === "object" ? data2 : {};
    } catch (e2) {
      return {};
    }
  }

  function writeChatStore(map) {
    try {
      if (window.parent && window.parent !== window) {
        var pw = window.parent;
        pw.chatData = map;
        pw.localStorage.setItem("wechat_chatData", JSON.stringify(map));
        if (typeof pw.saveData === "function") {
          try {
            pw.saveData();
          } catch (e0) {}
        }
        return;
      }
    } catch (e) {}
    try {
      localStorage.setItem("wechat_chatData", JSON.stringify(map));
    } catch (e2) {}
  }

  function pushChatMessage(roleId, msg) {
    var id = String(roleId || "");
    if (!id) return;
    var all = readChatStore();
    if (!Array.isArray(all[id])) all[id] = [];
    all[id].push(msg);
    writeChatStore(all);
  }

  function sanitizeAiReply(text) {
    var s = String(text == null ? "" : text).trim();
    if (!s) return "";
    
    // === 新增：尝试解析 JSON 提取 reply === 
    try { 
      var jsonStr = s; 
      if (jsonStr.indexOf("```") >= 0) { 
        jsonStr = jsonStr.replace(/```(json)?/gi, "").replace(/```/g, "").trim(); 
      } 
      var start = jsonStr.indexOf("{"); 
      var end = jsonStr.lastIndexOf("}"); 
      if (start !== -1 && end > start) { 
        var obj = JSON.parse(jsonStr.substring(start, end + 1)); 
        if (obj.reply) { 
            s = String(obj.reply); 
        } else if (obj.content) { 
            s = String(obj.content); 
        } 
      } 
    } catch (e) { 
      // 解析失败则继续走常规文本清洗 
    } 
    // =================================== 

    if (s.indexOf("```") >= 0) {
      s = s.replace(/```[a-z0-9]*\n?/gi, "").replace(/```/g, "");
    }
    s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    s = s.replace(/\n{3,}/g, "\n\n");
    s = s.replace(/\s*\|\|\|\s*/g, "\n");
    s = s.trim();
    if (s.length > 320) s = s.slice(0, 320) + "…";
    return s;
  }

  function pushAiText(roleId, text) {
    var rid = String(roleId || "");
    if (!rid) return;
    var content = sanitizeAiReply(text);
    if (!content) return;
    var now = Date.now();
    var aiMsg = { role: "ai", type: "text", content: content, timestamp: now, status: "sent" };
    pushChatMessage(rid, aiMsg);
    if (chatDrawerState.open && String(chatDrawerState.roleId || "") === rid && chatDrawerBody) {
      var row = document.createElement("div");
      row.className = "chat-drawer-row is-ai";
      var b = document.createElement("div");
      b.className = "chat-drawer-bubble";
      b.textContent = content;
      row.appendChild(b);
      chatDrawerBody.appendChild(row);
      scrollChatDrawerToEnd();
    }
  }

  function getHistoryForAi(roleId) {
    var rid = String(roleId || "");
    if (!rid) return [];
    var all = readChatStore();
    var list = Array.isArray(all[rid]) ? all[rid] : [];
    return list.filter(function (m) {
      return m && (m.role === "me" || m.role === "ai");
    });
  }

  function maybeEmitTogetherLyricMoment() {
    if (!isTogetherActive()) return;
    if (!state.isPlaying) return;
    var rid = getTogetherRoleId();
    if (!rid) return;
    var quote = getActiveLyricQuote();
    if (!quote) return;
    if (quote === chatDrawerState.lastLyricText) return;
    chatDrawerState.lastLyricText = quote;
    var now = Date.now();
    if (now - chatDrawerState.lastLyricAt < 18000) return;
    if (now - chatDrawerState.lastAmbientAt < 26000) return;
    if (Math.random() > 0.35) return;
    chatDrawerState.lastLyricAt = now;
    chatDrawerState.lastAmbientAt = now;
    autoReplyLogic("唱到这句歌词：" + quote, "lyric", rid);
  }

  function maybeEmitTogetherPlaybackMoment(kind) {
    if (!isTogetherActive()) return;
    var rid = getTogetherRoleId();
    if (!rid) return;
    var now = Date.now();
    if (now - chatDrawerState.lastPlaybackAt < 7000) return;
    if (chatDrawerState.lastPlaybackKind === String(kind || "") && now - chatDrawerState.lastPlaybackAt < 20000) return;
    chatDrawerState.lastPlaybackAt = now;
    chatDrawerState.lastPlaybackKind = String(kind || "");
    autoReplyLogic(kind === "pause" ? "我先暂停一下音乐" : "我继续播放啦", String(kind || ""), rid);
  }

  function scrollChatDrawerToEnd() {
    if (!chatDrawerBody) return;
    chatDrawerBody.scrollTop = chatDrawerBody.scrollHeight;
  }

  function renderChatDrawerHistory(roleId) {
    if (!chatDrawerBody) return;
    chatDrawerBody.innerHTML = "";
    var all = readChatStore();
    var list = Array.isArray(all[roleId]) ? all[roleId] : [];
    list.forEach(function (m) {
      var row = document.createElement("div");
      if (m.type === "system") {
        row.className = "chat-drawer-row is-system";
      } else if (m.role === "me") {
        row.className = "chat-drawer-row is-me";
      } else {
        row.className = "chat-drawer-row is-ai";
      }
      var b = document.createElement("div");
      b.className = "chat-drawer-bubble";
      b.textContent = m.content || "";
      row.appendChild(b);
      chatDrawerBody.appendChild(row);
    });
    scrollChatDrawerToEnd();
  }

  function toggleChatDrawer(open) {
    if (!chatDrawer) return;
    if (open) {
      var rid0 = getTogetherRoleId();
      if (!rid0) {
        showToast("请先进入一起听");
        return;
      }
    }
    chatDrawerState.open = !!open;
    chatDrawer.classList.toggle("is-active", !!open);
    chatDrawer.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) {
      var rid = getTogetherRoleId();
      chatDrawerState.roleId = rid;
      var profiles = getCharProfiles();
      var p = profiles[rid] || {};
      if (chatDrawerTitle) {
        var who = p.nickName || p.name || rid || "对方";
        chatDrawerTitle.textContent = "与 " + who + " 聊天中";
        chatDrawerState.roleName = who;
      }
      renderChatDrawerHistory(rid);
      setTimeout(scrollChatDrawerToEnd, 50);
      try {
        if (chatDrawerInput) chatDrawerInput.focus();
      } catch (e) {}
    } else {
      if (chatDrawerTyping) {
        chatDrawerTyping.textContent = "";
        chatDrawerTyping.classList.remove("is-active");
      }
    }
  }

  function syncSystemMessage(action, songName) {
    var rid = getTogetherRoleId();
    if (!rid) return;
    var now = Date.now();
    if (action === "switch") {
      if (now - chatDrawerState.lastSwitchAt < 800) return;
      chatDrawerState.lastSwitchAt = now;
    } else {
      if (now - chatDrawerState.lastSystemAt < 800) return;
      chatDrawerState.lastSystemAt = now;
    }
    var text = "";
    if (action === "start") text = "[系统] 开启了一起听模式，当前播放：《" + String(songName || "未知歌曲") + "》";
    else if (action === "switch") text = "[系统] 歌曲切换为：《" + String(songName || "未知歌曲") + "》";
    else if (action === "stop") text = "[系统] 用户关闭了一起听模式";
    else text = String(action || "");
    
    // === 修改点：在这里增加 hidden: true 属性 ===
    var msg = { role: "system", type: "system", content: text, timestamp: now, hidden: true };
    // ============================================

    pushChatMessage(rid, msg);
    if (chatDrawerState.open) {
      var row = document.createElement("div");
      row.className = "chat-drawer-row is-system";
      var b = document.createElement("div");
      b.className = "chat-drawer-bubble";
      b.textContent = msg.content;
      row.appendChild(b);
      if (chatDrawerBody) chatDrawerBody.appendChild(row);
      scrollChatDrawerToEnd();
    }
    autoReplyLogic(msg.content, action, rid);
  }

  function sendMessage(text) {
    var rid = getTogetherRoleId();
    if (!rid) return;
    var content = String(text || "").trim();
    if (!content) return;
    var now = Date.now();
    var userMsg = { role: "me", type: "text", content: content, timestamp: now, status: "sent" };
    pushChatMessage(rid, userMsg);
    if (chatDrawerBody) {
      var row = document.createElement("div");
      row.className = "chat-drawer-row is-me";
      var b = document.createElement("div");
      b.className = "chat-drawer-bubble";
      b.textContent = content;
      row.appendChild(b);
      chatDrawerBody.appendChild(row);
      scrollChatDrawerToEnd();
    }
    autoReplyLogic(content);
  }

  function buildSongContextText() {
    var cur = state.queue && state.queue[state.currentIndex] ? state.queue[state.currentIndex] : null;
    var title = (cur && cur.title) || "";
    var artist = (cur && cur.artist) || "";
    if (title && artist) return "当前歌曲《" + title + "》 - " + artist;
    if (title) return "当前歌曲《" + title + "》";
    return "当前未获取到歌曲信息";
  }

  function getActiveLyricQuote() {
    var idx = Number(state.lyricsActiveIndex);
    if (!isFinite(idx) || idx < 0) return "";
    if (!state.lyricsLines || !state.lyricsLines.length) return "";
    var cur = state.lyricsLines[idx] && state.lyricsLines[idx].text ? String(state.lyricsLines[idx].text) : "";
    if (cur && cur.trim()) return cur.trim();
    return "";
  }

  function isEmojiOnlyText(text) {
    var s = String(text || "").trim();
    if (!s) return false;
    if (s.length > 12) return false;
    try {
      var t = s.replace(/\s+/g, "");
      if (!t) return false;
      var emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
      if (!emojiRe.test(t)) return false;
      var rest = t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "");
      return rest.length === 0;
    } catch (e) {
      return false;
    }
  }

  function simulateAIResponse(prompt, systemEventKind, forcedRoleId) {
    var rid = forcedRoleId || getTogetherRoleId();
    if (!rid) return;
    if (chatDrawerTyping) {
      chatDrawerTyping.textContent = (chatDrawerState.roleName || "对方") + " 正在输入...";
      chatDrawerTyping.classList.add("is-active");
    }
    if (chatDrawerState.typingTimer) window.clearTimeout(chatDrawerState.typingTimer);
    var delay = 1500 + Math.floor(Math.random() * 1500);
    chatDrawerState.typingTimer = window.setTimeout(function () {
      if (chatDrawerTyping) {
        chatDrawerTyping.textContent = "";
        chatDrawerTyping.classList.remove("is-active");
      }
      var reply = "";
      var songCtx = buildSongContextText();
      var p = String(prompt || "").trim();
      if (systemEventKind === "lyric") {
        var q = "";
        try {
          var m = p.match(/歌词[:：]\s*(.+)$/);
          if (m && m[1]) q = String(m[1]).trim();
        } catch (e0) {}
        if (!q) q = getActiveLyricQuote();
        if (q) {
          var picks = [
            "这句“" + q + "”有点上头",
            "听到“" + q + "”，突然就安静了",
            "这句太戳了：“" + q + "”",
            "等等，这句“" + q + "”好像在说我们",
          ];
          reply = picks[Math.floor(Math.random() * picks.length)];
        } else {
          reply = "这段旋律有点走心";
        }
      } else if (systemEventKind === "pause") {
        reply = "暂停一下也好～你想聊聊这首歌哪里最戳你吗";
      } else if (systemEventKind === "resume") {
        reply = "继续～我刚刚还在回味前面那句";
      } else {
        var isSystem =
          systemEventKind === "switch" || systemEventKind === "start" || systemEventKind === "stop" || /^\[系统\]/.test(p);
        if (isSystem) {
        var cur = state.queue && state.queue[state.currentIndex] ? state.queue[state.currentIndex] : null;
        var songName = (cur && cur.title) || "这首歌";
        if (systemEventKind === "stop" || p.indexOf("关闭了一起听模式") >= 0) {
          reply = "那就先到这里～下次再一起听";
        } else if (systemEventKind === "switch" || p.indexOf("歌曲切换") >= 0) {
          reply = "啊，换到《" + songName + "》了，前奏太美了";
        } else {
          reply = "一起听开始～我已经准备好了，" + "《" + songName + "》走起";
        }
        } else if (isEmojiOnlyText(p)) {
          reply = p;
        } else if (/(歌词|这句|这段|那句|唱到|词)/.test(p)) {
          var quote2 = getActiveLyricQuote();
          if (quote2) reply = "你说的是这句吧：「" + quote2 + "」";
          else reply = "我也想看歌词那句～ " + songCtx;
        } else {
          reply = "我在听～ " + songCtx;
        }
      }
      pushAiText(rid, reply);
    }, delay);
  }

  function autoReplyLogic(userText, systemEventKind, forcedRoleId) {
    var rid = forcedRoleId || getTogetherRoleId();
    if (!rid) return;
    var content = String(userText || "").trim();
    if (!content) return;

    var parentWin = null;
    try {
      if (window.parent && window.parent !== window) parentWin = window.parent;
    } catch (e0) {
      parentWin = null;
    }

    if (parentWin && typeof parentWin.callAI === "function") {
      var now = Date.now();
      if (chatDrawerState.aiInFlight && systemEventKind && now - (chatDrawerState.aiInFlightAt || 0) < 9000) return;
      chatDrawerState.aiInFlight = true;
      chatDrawerState.aiInFlightAt = now;
      chatDrawerState.aiReq = (chatDrawerState.aiReq || 0) + 1;
      var reqId = chatDrawerState.aiReq;

      if (chatDrawerTyping && chatDrawerState.open) {
        chatDrawerTyping.textContent = (chatDrawerState.roleName || "对方") + " 正在输入...";
        chatDrawerTyping.classList.add("is-active");
      }

      var profiles = getCharProfiles();
      var p = profiles[rid] || {};
      var roleName = p.nickName || p.name || rid || "TA";
      var persona = p.desc || p.persona || p.prompt || "";
      var lyricQuote = getActiveLyricQuote();
      var sysParts = [];
      sysParts.push("【角色名称】" + roleName);
      if (persona && String(persona).trim()) sysParts.push(String(persona).trim());
      sysParts.push("你正在和用户在手机音乐App里一起听歌并聊天。你说话要像微信聊天。");
      sysParts.push("回复要求：1-2句自然中文；不要使用markdown/代码块；不要输出任何触发码或指令；不要长篇大论。");
      sysParts.push("当前音乐状态：" + (state.isPlaying ? "播放中" : "已暂停") + "；" + buildSongContextText() + (lyricQuote ? "；当前歌词：" + lyricQuote : ""));
      var systemPrompt = sysParts.join("\n\n");
      var history = getHistoryForAi(rid);

      try {
        parentWin.callAI(
          systemPrompt,
          history,
          content,
          function (text) {
            if (reqId !== chatDrawerState.aiReq) return;
            chatDrawerState.aiInFlight = false;
            chatDrawerState.aiInFlightAt = 0;
            if (chatDrawerTyping) {
              chatDrawerTyping.textContent = "";
              chatDrawerTyping.classList.remove("is-active");
            }
            pushAiText(rid, text);
          },
          function () {
            if (reqId !== chatDrawerState.aiReq) return;
            chatDrawerState.aiInFlight = false;
            chatDrawerState.aiInFlightAt = 0;
            if (chatDrawerTyping) {
              chatDrawerTyping.textContent = "";
              chatDrawerTyping.classList.remove("is-active");
            }
            simulateAIResponse(content, systemEventKind, rid);
          }
        );
      } catch (e1) {
        chatDrawerState.aiInFlight = false;
        chatDrawerState.aiInFlightAt = 0;
        if (chatDrawerTyping) {
          chatDrawerTyping.textContent = "";
          chatDrawerTyping.classList.remove("is-active");
        }
        simulateAIResponse(content, systemEventKind, rid);
      }
      return;
    }

    simulateAIResponse(content, systemEventKind, rid);
  }

  function handleMusicEvents() {
    try {
      if (chatBtn) {
        chatBtn.addEventListener("click", function () {
          toggleChatDrawer(true);
        });
      }
      if (chatDrawerBackdrop) {
        chatDrawerBackdrop.addEventListener("click", function () {
          toggleChatDrawer(false);
        });
      }
      if (chatDrawerClose) {
        chatDrawerClose.addEventListener("click", function () {
          toggleChatDrawer(false);
        });
      }
      if (chatDrawerSend) {
        chatDrawerSend.addEventListener("click", function () {
          var v = chatDrawerInput ? String(chatDrawerInput.value || "").trim() : "";
          if (!v) return;
          if (chatDrawerInput) chatDrawerInput.value = "";
          sendMessage(v);
        });
      }
      if (chatDrawerInput) {
        chatDrawerInput.addEventListener("keydown", function (e) {
          if (e && (e.key === "Enter" || e.keyCode === 13)) {
            var v = String(chatDrawerInput.value || "").trim();
            if (!v) return;
            chatDrawerInput.value = "";
            sendMessage(v);
          }
        });
      }
    } catch (e) {}
  }

  function setSearchActive(active) {
    if (topSearch) topSearch.classList.toggle("is-active", !!active);
    if (musicApp) musicApp.classList.toggle("is-searching", !!active);
    if (recommendView) recommendView.classList.toggle("is-active", !active);
    if (searchView) searchView.classList.toggle("is-active", !!active);
  }

  function setClearVisible(visible) {
    if (!searchClear) return;
    searchClear.style.display = visible ? "grid" : "none";
  }

  function setParentFullscreen(enabled) {
    try {
      if (window.parent && window.parent !== window && window.parent.postMessage) {
        window.parent.postMessage({ type: "MUSIC_PARENT_FULLSCREEN", enabled: !!enabled }, "*");
      }
    } catch (e) {}
  }

  function openPlayer() {
    playerSheet.classList.add("active");
    playerSheet.setAttribute("aria-hidden", "false");
    setParentFullscreen(true);
    syncFromGlobalPlayer();
    syncTogetherFromStorage();
  }

  function closePlayer() {
    try {
      if (miniOpen) miniOpen.focus();
      else if (document.activeElement && typeof document.activeElement.blur === "function") document.activeElement.blur();
    } catch (e) {}
    playerSheet.classList.remove("active");
    playerSheet.setAttribute("aria-hidden", "true");
    setParentFullscreen(false);
  }

  function setActiveTab(tabName) {
    tabs.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.dataset.tab === tabName);
    });
  }

  function setActivePage(tabName) {
    if (!homePage || !profilePage) return;
    var isMe = tabName === "me";
    if (isMe) setSearchActive(false);
    homePage.hidden = !!isMe;
    profilePage.hidden = !isMe;
    if (musicApp) musicApp.classList.toggle("is-profile", !!isMe);
    if (topSearch) topSearch.style.display = isMe ? "none" : "";
    if (isMe) renderProfileView();
    if (!isMe) exitHomeSelectMode();
  }

  function setModeByIndex(nextIndex) {
    state.modeIndex = nextIndex % modeList.length;
    updateModeButtons();
  }

  function updateModeButtons() {
    var mode = modeList[state.modeIndex];
    if (!mode) mode = { key: "loop", icon: "bx-refresh", label: "列表循环" };
    if (!shuffleBtn) return;
    var icon = qs("i", shuffleBtn);
    if (icon) icon.className = "bx " + String(mode.icon || "bx-refresh");
    shuffleBtn.setAttribute("aria-label", String(mode.label || "列表循环"));
    shuffleBtn.title = String(mode.label || "列表循环");
  }

  function updateQueueButton() {
    if (!repeatBtn) return;
    var icon = qs("i", repeatBtn);
    if (icon) icon.className = "bx bx-list-ul";
    repeatBtn.setAttribute("aria-label", "播放列表");
    repeatBtn.title = "播放列表";
  }

  function setPlayIcon(isPlaying) {
    var icon = qs("i", playBtn);
    if (icon) icon.className = isPlaying ? "bx bx-pause" : "bx bx-play";
    if (playBtn) playBtn.setAttribute("aria-label", isPlaying ? "暂停" : "播放");

    var miniIcon = miniPlayBtn ? qs("i", miniPlayBtn) : null;
    if (miniIcon) miniIcon.className = isPlaying ? "bx bx-pause" : "bx bx-play";
    if (miniPlayBtn) miniPlayBtn.setAttribute("aria-label", isPlaying ? "暂停" : "播放");
  }

  function setPlaying(nextPlaying) {
    if (!audioEl) return;

    if (nextPlaying) {
      var gp = getGlobalPlayer();
      var p = gp && typeof gp.play === "function" ? gp.play() : audioEl.play();
      if (p && typeof p.catch === "function") {
        p.catch(function () {
          showToast("点击播放继续");
        });
      }
    } else {
      var gp2 = getGlobalPlayer();
      if (gp2 && typeof gp2.pause === "function") gp2.pause();
      else audioEl.pause();
    }
  }

  function applyTrackInfo(songInfo) {
    var cover = songInfo && songInfo.cover ? songInfo.cover : DEFAULT_COVER;
    var title = songInfo && songInfo.title ? songInfo.title : "未知歌曲";
    var artist = songInfo && songInfo.artist ? songInfo.artist : "未知歌手";

    if (coverImg) coverImg.src = cover;
    if (trackTitle) trackTitle.textContent = title;
    if (trackArtist) trackArtist.textContent = artist;
    if (npTrackTitle) npTrackTitle.textContent = title;
    if (npTrackArtist) npTrackArtist.textContent = artist;

    if (miniCover) miniCover.src = cover;
    if (miniTitle) miniTitle.textContent = title;
    if (miniArtist) miniArtist.textContent = artist;

    if (miniPlayer) {
      miniPlayer.classList.add("is-active");
      miniPlayer.setAttribute("aria-hidden", "false");
    }

    try {
      var id = songInfo && songInfo.id ? String(songInfo.id) : "";
      var sourceType = songInfo && (songInfo.sourceType || songInfo.source) ? String(songInfo.sourceType || songInfo.source) : "";
      state.currentTrackMeta = {
        title: title,
        artist: artist,
        cover: cover,
        key: trackKey(songInfo),
        id: id,
        sourceType: sourceType,
      };
    } catch (e) {}

    updateFavButton();
    loadLyricsForSong(songInfo);
    updateTogetherDurationLabel();
  }

  function setLyricsOpen(open) {
    playerSheet.classList.toggle("is-lyrics", !!open);
    if (!!open) {
      syncLyric();
    }
  }

  function setLyricsEmpty(text) {
    if (!lyricsView) return;
    if (lyricListEl) {
      lyricListEl.innerHTML = "";
      var el = document.createElement("li");
      el.className = "lyrics-empty";
      el.textContent = String(text || "暂无歌词");
      lyricListEl.appendChild(el);
    } else {
      lyricsView.innerHTML = "";
      var el2 = document.createElement("div");
      el2.className = "lyrics-empty";
      el2.textContent = String(text || "暂无歌词");
      lyricsView.appendChild(el2);
    }
    state.lyricsEls = [];
    state.lyricsActiveIndex = -1;
  }

  function parseLrc(text) {
    var raw = String(text || "");
    if (!raw.trim()) return [];
    var out = [];
    raw.split(/\r?\n/).forEach(function (line) {
      var s = String(line || "").trim();
      if (!s) return;
      if (/^\[(ar|ti|al|by|offset):/i.test(s)) return;
      var re = /\[(\d{1,2}):(\d{1,2}(?:\.\d{1,3})?)\]/g;
      var match = null;
      var times = [];
      while ((match = re.exec(s))) {
        var mm = Number(match[1]);
        var ss = Number(match[2]);
        if (!isFinite(mm) || !isFinite(ss)) continue;
        times.push(mm * 60 + ss);
      }
      if (!times.length) return;
      var txt = s.replace(re, "").trim();
      times.forEach(function (t) {
        out.push({ time: t, text: txt });
      });
    });
    out.sort(function (a, b) {
      return (a.time || 0) - (b.time || 0);
    });
    return out;
  }

  function renderLyrics(lines) {
    if (!lyricsView) return;
    if (!lyricListEl) {
      setLyricsEmpty("暂无歌词");
      return;
    }
    lyricListEl.innerHTML = "";
    state.lyricsEls = [];
    state.lyricsActiveIndex = -1;

    if (!lines || !lines.length) {
      setLyricsEmpty("暂无歌词");
      return;
    }

    var frag = document.createDocumentFragment();
    lines.forEach(function (it, idx) {
      var li = document.createElement("li");
      li.className = "lyric-line";
      li.dataset.index = String(idx);
      li.textContent = it && it.text ? String(it.text) : "…";
      state.lyricsEls.push(li);
      frag.appendChild(li);
    });
    lyricListEl.appendChild(frag);
    syncLyric();
  }

  function extractLyricText(payloadText) {
    var t = String(payloadText || "").trim();
    if (!t) return "";
    if (t[0] !== "{") return t;
    var obj = safeJsonParse(t);
    if (!obj || typeof obj !== "object") return t;
    if (typeof obj.lyric === "string" && obj.lyric.trim()) return obj.lyric;
    if (typeof obj.lrc === "string" && obj.lrc.trim()) return obj.lrc;
    if (obj.data && typeof obj.data.lrc === "string" && obj.data.lrc.trim()) return obj.data.lrc;
    if (obj.data && typeof obj.data.lyric === "string" && obj.data.lyric.trim()) return obj.data.lyric;
    if (obj.lrc && typeof obj.lrc.lyric === "string" && obj.lrc.lyric.trim()) return obj.lrc.lyric;
    return t;
  }

  function fetchLyricById(id, sourceType) {
    var vid = String(id || "").trim();
    if (!vid) return Promise.resolve("");
    var type = String(sourceType || "").trim() || "kw";

    if (type === "vkeys_netease" || type === "vkeys_tencent") {
      var src = type === "vkeys_netease" ? "netease" : "tencent";
      var vUrl = "https://api.vkeys.cn/v2/music/" + src + "/lyric?id=" + encodeURIComponent(vid);
      return fetchJson(vUrl, 12000)
        .then(function (payload) {
          if (!payload) return "";
          var d = payload.data;
          if (typeof d === "string") return d;
          if (d && typeof d === "object") {
            if (typeof d.lyric === "string" && d.lyric.trim()) return d.lyric;
            if (typeof d.lrc === "string" && d.lrc.trim()) return d.lrc;
          }
          return "";
        })
        .catch(function () {
          return "";
        })
        .then(function (txt) {
          if (txt && String(txt).trim()) return txt;
          var fUrl =
            "https://api.liumingye.cn/m/api/lrc?id=" + encodeURIComponent(vid) + "&type=" + encodeURIComponent("wy");
          return fetchJsonp(fUrl, 10000)
            .catch(function () {
              return fetchJson(fUrl, 12000);
            })
            .then(function (payload) {
              if (!payload) return "";
              if (typeof payload === "string") return extractLyricText(payload);
              return extractLyricText(JSON.stringify(payload));
            })
            .catch(function () {
              return "";
            });
        });
    }

    var url =
      "https://api.liumingye.cn/m/api/lrc?id=" +
      encodeURIComponent(vid) +
      "&type=" +
      encodeURIComponent(type);
    return fetchJsonp(url, 10000)
      .catch(function () {
        return fetchJson(url, 12000);
      })
      .then(function (payload) {
        if (!payload) return "";
        if (typeof payload === "string") return extractLyricText(payload);
        return extractLyricText(JSON.stringify(payload));
      })
      .catch(function () {
        return fetch(url, { method: "GET" })
          .then(function (res) {
            return res.text();
          })
          .then(function (txt) {
            return extractLyricText(txt);
          })
          .catch(function () {
            return "";
          });
      });
  }

  function loadLyricsForSong(songInfo) {
    var key = trackKey(songInfo) || (songInfo && songInfo.id ? String(songInfo.id) : "");
    if (!key) key = "unknown";
    state.lyricsKey = key;

    if (!lyricsView) return;
    if (state.lyricFetchTimer) window.clearTimeout(state.lyricFetchTimer);

    var inline = songInfo && (songInfo.lyric || songInfo.lrc) ? String(songInfo.lyric || songInfo.lrc) : "";
    if (inline.trim()) {
      state.lyricsLines = parseLrc(inline);
      renderLyrics(state.lyricsLines);
      return;
    }

    if (state.lyricCache && state.lyricCache[key]) {
      state.lyricsLines = parseLrc(state.lyricCache[key]);
      renderLyrics(state.lyricsLines);
      return;
    }

    var id = songInfo && songInfo.id ? String(songInfo.id) : "";
    if (!id) {
      state.lyricsLines = [];
      setLyricsEmpty("暂无歌词");
      return;
    }

    var type = songInfo && (songInfo.source || songInfo.sourceType) ? String(songInfo.source || songInfo.sourceType) : "";
    if (!type && state.currentTrackMeta && state.currentTrackMeta.sourceType) type = String(state.currentTrackMeta.sourceType || "");
    if (!type) type = "kw";

    setLyricsEmpty("歌词加载中...");
    state.lyricFetchTimer = window.setTimeout(function () {
      fetchLyricById(id, type).then(function (txt) {
        if (state.lyricsKey !== key) return;
        if (txt && txt.trim()) {
          state.lyricCache[key] = txt;
          state.lyricsLines = parseLrc(txt);
          renderLyrics(state.lyricsLines);
        } else {
          state.lyricsLines = [];
          setLyricsEmpty("暂无歌词");
        }
      });
    }, 60);
  }

  function findActiveLyricIndex(timeSeconds) {
    var t = Number(timeSeconds);
    if (!isFinite(t) || t < 0) t = 0;
    var lines = state.lyricsLines || [];
    if (!lines.length) return -1;
    var lo = 0;
    var hi = lines.length - 1;
    var ans = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      var mt = Number(lines[mid].time);
      if (!isFinite(mt)) mt = 0;
      if (mt <= t + 0.08) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return ans;
  }

  function syncLyric() {
    if (!lyricsView) return;
    if (!state.lyricsLines || !state.lyricsLines.length) return;
    var t = audioEl ? Number(audioEl.currentTime || 0) : 0;
    var idx = findActiveLyricIndex(t);
    if (idx === state.lyricsActiveIndex) return;

    var prev = state.lyricsActiveIndex;
    state.lyricsActiveIndex = idx;
    if (prev >= 0 && state.lyricsEls && state.lyricsEls[prev]) {
      state.lyricsEls[prev].classList.remove("active");
    }
    if (idx >= 0 && state.lyricsEls && state.lyricsEls[idx]) {
      state.lyricsEls[idx].classList.add("active");
    }

    if (idx < 0) return;
    var el = state.lyricsEls && state.lyricsEls[idx] ? state.lyricsEls[idx] : null;
    if (!el) return;

    var top = el.offsetTop - (lyricsView.clientHeight / 2 - el.clientHeight / 2);
    var nextTop = Math.max(0, top);
    try {
      lyricsView.scrollTo({ top: nextTop, behavior: "smooth" });
    } catch (e) {
      lyricsView.scrollTop = nextTop;
    }
    try {
      maybeEmitTogetherLyricMoment();
    } catch (e2) {}
  }

  function formatClock(seconds) {
    var s = Number(seconds);
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60);
    var r = Math.floor(s % 60);
    return m + ":" + String(r).padStart(2, "0");
  }

  function updateTimeLabels() {
    if (!audioEl) return;
    if (currentTimeEl) currentTimeEl.textContent = formatClock(audioEl.currentTime || 0);
    if (durationTimeEl) durationTimeEl.textContent = formatClock(audioEl.duration || 0);
  }

  function setLoading(loading) {
    if (!playBtn) return;
    playBtn.disabled = !!loading;
    playBtn.setAttribute("aria-busy", loading ? "true" : "false");
    var icon = qs("i", playBtn);
    if (!icon) return;
    if (loading) icon.className = "bx bx-loader-alt bx-spin";
    else icon.className = state.isPlaying ? "bx bx-pause" : "bx bx-play";
  }

  function mulberry32(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function computeBarCount() {
    if (!waveEl) return 0;
    var rect = waveEl.getBoundingClientRect();
    var w = rect.width || 0;
    if (w <= 0) return 0;
    var barWidth = 3;
    var gap = 3;
    var count = Math.floor((w + gap) / (barWidth + gap));
    return clampInt(count, 28, 64);
  }

  function renderWave() {
    state.bars.forEach(function (barEl, i) {
      barEl.classList.toggle("filled", i < state.progressCount);
    });
  }

  function updateWaveFromAudio() {
    if (!audioEl || !state.barCount) return;
    var duration = audioEl.duration;
    updateTimeLabels();
    if (!duration || !isFinite(duration) || duration <= 0) return;
    var ratio = audioEl.currentTime / duration;
    state.progressCount = clampInt(ratio * state.barCount, 0, state.barCount);
    renderWave();
  }

  function seekByRatio(ratio) {
    if (!audioEl) return;
    var r = Number(ratio);
    if (!isFinite(r)) return;
    if (r < 0) r = 0;
    if (r > 1) r = 1;
    var duration = audioEl.duration;
    if (!duration || !isFinite(duration) || duration <= 0) return;
    var t = duration * r;
    var gp = getGlobalPlayer();
    if (gp && typeof gp.seek === "function") gp.seek(t);
    else {
      try {
        audioEl.currentTime = t;
      } catch (e) {}
    }
    updateWaveFromAudio();
  }

  function playUrl(url) {
    if (!audioEl) return;
    var u = String(url || "").trim();
    if (!u) {
      showToast("该歌曲无可用音源");
      return;
    }

    var meta = state.currentTrackMeta || null;
    var gp = getGlobalPlayer();
    if (gp && typeof gp.setTrack === "function") {
      gp.setTrack({
        title: meta && meta.title ? meta.title : "",
        artist: meta && meta.artist ? meta.artist : "",
        cover: meta && meta.cover ? meta.cover : "",
        key: meta && meta.key ? meta.key : "",
        id: meta && meta.id ? meta.id : "",
        sourceType: meta && meta.sourceType ? meta.sourceType : "",
        url: u,
      });
    } else {
      audioEl.src = u;
    }
    setPlaying(true);
  }

  function buildWaveBars() {
    if (!waveEl) return;
    waveEl.innerHTML = "";

    var rnd = mulberry32(0x13579bdf);
    var count = computeBarCount();
    if (!count) count = 40;
    state.barCount = count;
    var bars = [];
    for (var i = 0; i < state.barCount; i += 1) {
      var h = 8 + Math.round(rnd() * 28);
      if (h < 10) h = 10;
      if (h > 36) h = 36;
      var bar = document.createElement("span");
      bar.className = "bar";
      bar.style.setProperty("--h", h + "px");
      bars.push(bar);
      waveEl.appendChild(bar);
    }
    state.bars = bars;
    if (state.progressCount > state.barCount) state.progressCount = state.barCount;
    renderWave();
    updateWaveFromAudio();
  }

  function scheduleWaveRebuild() {
    window.requestAnimationFrame(function () {
      buildWaveBars();
    });
  }

  function extractSearchArray(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (typeof payload === "string") {
      var txt = String(payload || "").trim();
      if (!txt) return [];
      var first = txt.charAt(0);
      if (first === "{" || first === "[") {
        try {
          return extractSearchArray(JSON.parse(txt));
        } catch (e) {
          return [];
        }
      }
      return [];
    }
    if (typeof payload !== "object") return [];

    var candidates = [
      payload.data,
      payload.result,
      payload.results,
      payload.songs,
      payload.list,
      payload.items,
      payload.data && payload.data.list,
      payload.data && payload.data.songs,
      payload.data && payload.data.results,
      payload.result && payload.result.songs,
      payload.result && payload.result.list,
    ];

    for (var i = 0; i < candidates.length; i += 1) {
      if (Array.isArray(candidates[i])) return candidates[i];
    }

    var keys = Object.keys(payload);
    for (var j = 0; j < keys.length; j += 1) {
      var v = payload[keys[j]];
      if (Array.isArray(v)) return v;
      if (v && typeof v === "object") {
        var inner = extractSearchArray(v);
        if (inner.length) return inner;
      }
    }
    return [];
  }

  function normalizeSong(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = raw.id || raw.songid || raw.songId || raw.ID || raw.trackId || raw.trackID || raw.track_id;
    var title = raw.title || raw.name || raw.songname || raw.songName || raw.trackName || raw.track_name;
    var author =
      raw.author || raw.artist || raw.singer || raw.artistname || raw.artistName || raw.singerName || raw.artist_name;
    var pic = raw.pic || raw.cover || raw.picUrl || raw.img || raw.image || raw.artworkUrl100 || raw.artworkUrl60;
    var url = raw.url || raw.playUrl || raw.play_url || raw.mp3 || raw.musicUrl;
    if (!url && raw.previewUrl) url = raw.previewUrl;
    if (!id || !title) return null;
    return {
      id: String(id),
      title: String(title),
      artist: author ? String(author) : "未知歌手",
      cover: pic ? String(pic).replace(/^http:\/\//i, "https://") : DEFAULT_COVER,
      url: url ? String(url).replace(/^http:\/\//i, "https://") : "",
    };
  }

  function normalizeMetingTrack(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = raw.id || raw.url_id || raw.urlId || raw.song_id || raw.songId;
    var title = raw.title || raw.name;
    var artist = raw.artist || raw.author || raw.singer;
    var cover = raw.cover || raw.pic;
    var url = raw.url || raw.mp3 || raw.playUrl || raw.play_url;
    if (!title) return null;
    if (!id && !url) return null;
    return {
      id: id ? String(id) : "",
      title: String(title),
      artist: artist ? String(artist) : "未知歌手",
      cover: cover ? String(cover).replace(/^http:\/\//i, "https://") : DEFAULT_COVER,
      url: url ? String(url).replace(/^http:\/\//i, "https://") : "",
      source: "wy",
      sourceType: "wy",
    };
  }

  function clearSearchList() {
    if (!searchList) return;
    searchList.innerHTML = "";
  }

  function renderSearchList(songs) {
    if (!searchList) return;
    clearSearchList();

    if (!songs || !songs.length) {
      if (searchHint) searchHint.textContent = "未找到结果";
      return;
    }

    if (searchHint) searchHint.textContent = "";

    songs.forEach(function (song, index) {
      var li = document.createElement("li");
      var row = document.createElement("div");
      row.className = "search-item";
      row.dataset.id = song.id;
      row.dataset.index = String(index);

      var cover = document.createElement("div");
      cover.className = "search-cover";
      var img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      img.src = song.cover || DEFAULT_COVER;
      cover.appendChild(img);

      var meta = document.createElement("div");
      meta.className = "search-meta";
      var title = document.createElement("div");
      title.className = "search-title";
      title.textContent = song.title;
      var artist = document.createElement("div");
      artist.className = "search-artist";
      artist.textContent = song.artist || "未知歌手";
      meta.appendChild(title);
      meta.appendChild(artist);

      var actions = document.createElement("div");
      actions.className = "search-actions";

      var addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "search-action-btn";
      addBtn.setAttribute("aria-label", "添加到列表");
      var addIcon = document.createElement("i");
      addIcon.className = "bx bx-list-plus";
      addBtn.appendChild(addIcon);

      var favBtn2 = document.createElement("button");
      favBtn2.type = "button";
      favBtn2.className = "search-action-btn";
      favBtn2.setAttribute("aria-label", "收藏");
      var favIcon = document.createElement("i");
      favIcon.className = "bx bx-heart";
      favBtn2.appendChild(favIcon);

      var play = document.createElement("div");
      play.className = "search-play";
      var icon = document.createElement("i");
      icon.className = "bx bx-play";
      play.appendChild(icon);

      actions.appendChild(addBtn);
      actions.appendChild(favBtn2);
      actions.appendChild(play);

      function syncActionState() {
        var libIndex = findLibrarySongIndex(song);
        var libSong = libIndex >= 0 ? state.library[libIndex] : null;
        addBtn.classList.toggle("is-added", libIndex >= 0);
        var favKey = trackKey(libSong || song);
        var active = !!(favKey && isFav(favKey));
        favBtn2.classList.toggle("is-fav", active);
        favIcon.className = active ? "bx bxs-heart" : "bx bx-heart";
      }

      syncActionState();

      addBtn.addEventListener("click", function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        var res = addSongToLibrary(song, false);
        if (res.added) showToast("已添加到列表");
        else showToast("已在列表中");
        syncActionState();
      });

      favBtn2.addEventListener("click", function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        var active = toggleFavForSong(song);
        showToast(active ? "已收藏" : "已取消收藏");
        syncActionState();
      });

      row.addEventListener("click", function () {
        state.queueMode = "search";
        state.queue = songs.slice();
        var idx = Number(row.dataset.index || 0);
        state.currentIndex = idx;
        playSong(song);
      });

      row.appendChild(cover);
      row.appendChild(meta);
      row.appendChild(actions);

      li.appendChild(row);
      searchList.appendChild(li);
    });
  }

  function renderList(songs) {
    renderSearchList(songs);
  }

  function fetchJson(url, timeoutMs) {
    var totalTimeout = Number(timeoutMs || 15000);
    if (!isFinite(totalTimeout) || totalTimeout <= 0) totalTimeout = 15000;
    var startedAt = Date.now();

    function isLiumingyeApi(u) {
      return String(u || "").indexOf("https://api.liumingye.cn/m/api/") === 0;
    }

    function parseJsonText(text) {
      var t = String(text || "").trim();
      if (!t) throw new Error("empty_response");
      return JSON.parse(t);
    }

    function unwrapAllOriginsGet(data) {
      if (!data || typeof data !== "object") return data;
      if (!("contents" in data)) return data;
      var c = data.contents;
      if (typeof c === "string") {
        try {
          return JSON.parse(c);
        } catch (e) {
          return c;
        }
      }
      return c;
    }

    function remainingMs() {
      var elapsed = Date.now() - startedAt;
      var left = totalTimeout - elapsed;
      return left > 0 ? left : 0;
    }

    var commonProxies = [
      { name: "codetabs", build: function (u) { return "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(u); } },
      { name: "allorigins_raw", build: function (u) { return "https://api.allorigins.win/raw?url=" + encodeURIComponent(u); } },
      { name: "allorigins_get", build: function (u) { return "https://api.allorigins.win/get?url=" + encodeURIComponent(u); } },
      { name: "isomorphic_git", build: function (u) { return "https://cors.isomorphic-git.org/" + u; } },
      { name: "thingproxy", build: function (u) { return "https://thingproxy.freeboard.io/fetch/" + u; } },
    ];

    var proxies = isLiumingyeApi(url)
      ? commonProxies.concat([{ name: "direct", build: function (u) { return u; } }])
      : [{ name: "direct", build: function (u) { return u; } }].concat(commonProxies);

    function fetchTextWithTimeout(targetUrl, timeoutLeft) {
      var ctl = null;
      var signal = null;
      try {
        ctl = new AbortController();
        signal = ctl.signal;
      } catch (e) {
        ctl = null;
        signal = null;
      }

      var t = null;
      if (timeoutLeft) {
        t = window.setTimeout(function () {
          try {
            if (ctl) ctl.abort();
          } catch (e) {}
        }, timeoutLeft);
      }

      return fetch(targetUrl, { method: "GET", signal: signal })
        .then(function (res) {
          if (!res.ok) throw new Error("status_" + res.status);
          return res.text();
        })
        .finally(function () {
          if (t) window.clearTimeout(t);
        });
    }

    function tryProxy(index) {
      var left = remainingMs();
      if (!left) return Promise.reject(new Error("timeout"));

      if (index === 0 && isLiumingyeApi(url)) {
        return fetchJsonp(url, Math.min(10000, left)).catch(function () {
          return tryProxy(index + 1);
        });
      }

      if (index >= proxies.length) {
        return Promise.reject(new Error("所有线路均繁忙，请稍后再试"));
      }

      var item = proxies[index];
      var targetUrl = item.build(url);
      var isAllOriginsGet = item.name === "allorigins_get";

      return fetchTextWithTimeout(targetUrl, left)
        .then(function (text) {
          if (isAllOriginsGet) {
            var wrapped = parseJsonText(text);
            return unwrapAllOriginsGet(wrapped);
          }
          return parseJsonText(text);
        })
        .catch(function (err) {
          try {
            console.warn("线路 " + (index + 1) + " 连接失败，自动切换下一条...", err && err.message ? err.message : "");
          } catch (e) {}
          return tryProxy(index + 1);
        });
    }

    return tryProxy(0);
  }

  function fetchJsonp(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var cb = "__jsonp_cb_" + String(Date.now()) + "_" + String(Math.floor(Math.random() * 1e9));
      var done = false;
      var script = document.createElement("script");

      function cleanup() {
        if (script && script.parentNode) script.parentNode.removeChild(script);
        try {
          delete window[cb];
        } catch (e) {
          window[cb] = undefined;
        }
      }

      var timer = null;
      if (timeoutMs) {
        timer = window.setTimeout(function () {
          if (done) return;
          done = true;
          cleanup();
          reject(new Error("timeout"));
        }, timeoutMs);
      }

      window[cb] = function (data) {
        if (done) return;
        done = true;
        if (timer) window.clearTimeout(timer);
        cleanup();
        resolve(data);
      };

      script.onerror = function () {
        if (done) return;
        done = true;
        if (timer) window.clearTimeout(timer);
        cleanup();
        reject(new Error("load_error"));
      };

      var sep = url.indexOf("?") >= 0 ? "&" : "?";
      script.src = url + sep + "callback=" + encodeURIComponent(cb);
      document.head.appendChild(script);
    });
  }

  function pickUrl(payload) {
    if (!payload) return "";
    if (typeof payload === "string") return payload;
    var direct = payload.url || payload.link;
    if (direct) return String(direct);
    var data = payload.data || payload.result;
    if (data && (data.url || data.link)) return String(data.url || data.link);
    if (data && typeof data === "string") return data;
    return "";
  }

  function trackKey(song) {
    if (!song) return "";
    if (song.id) return "id:" + String(song.id);
    if (song.url || song.src) return "u:" + String(song.url || song.src);
    var t = String(song.title || "").trim().toLowerCase();
    var a = String(song.artist || "").trim().toLowerCase();
    if (!t) return "";
    return "ta:" + t + "::" + a;
  }

  function findLibrarySongIndex(song) {
    if (!song) return -1;
    var key = trackKey(song);
    if (!key) return -1;
    var list = state.library || [];
    for (var i = 0; i < list.length; i += 1) {
      if (trackKey(list[i]) === key) return i;
    }
    return -1;
  }

  function disableSong(song) {
    var i = findLibrarySongIndex(song);
    if (i < 0) return;
    if (!state.library[i]) return;
    state.library[i].disabled = true;
    saveLibrary();
    rebuildQueue();
    renderHomePlaylist();
  }

  function playNextAfterDisable(prevIndex) {
    rebuildQueue();
    if (!state.queue.length) return;
    var next = prevIndex;
    if (next >= state.queue.length) next = state.queue.length - 1;
    if (next < 0) next = 0;
    playQueueIndex(next);
  }

  function ensureCurrentTrackInfo() {
    var current = state.queue[state.currentIndex];
    if (!current) return null;
    applyTrackInfo(current);
    return current;
  }

  function playQueueIndex(index) {
    if (!state.queue.length) {
      showToast("暂无歌曲");
      return;
    }
    var next = state.queue[index];
    if (!next) return;
    maybeSyncTogetherSongSwitch(next);
    state.currentIndex = index;

    if (next.id) {
      playSongById(next.id, next);
    } else {
      openPlayer();
      setActiveTab("play");
      applyTrackInfo(next);
      scheduleWaveRebuild();
      playUrl(next.url || next.src);
    }
  }

  function computeNextIndex(delta) {
    if (!state.queue.length) return 0;
    var modeKey = modeList[state.modeIndex].key;
    if (modeKey === "shuffle") return Math.floor(Math.random() * state.queue.length);
    return (state.currentIndex + delta + state.queue.length) % state.queue.length;
  }

  function handleTrackEnd() {
    var modeKey = modeList[state.modeIndex].key;
    if (modeKey === "single") {
      if (audioEl) audioEl.currentTime = 0;
      setPlaying(true);
      return;
    }
    playQueueIndex(computeNextIndex(1));
  }

  async function playSong(songInfo) {
    maybeSyncTogetherSongSwitch(songInfo);
    openPlayer();
    setActiveTab("play");
    applyTrackInfo(songInfo);
    scheduleWaveRebuild();
    setLoading(true);

    var directUrl = songInfo && (songInfo.url || songInfo.src) ? String(songInfo.url || songInfo.src) : "";
    if (directUrl) {
      playUrl(directUrl);
      setLoading(false);
      return;
    }

    var id = songInfo && songInfo.id ? String(songInfo.id) : "";
    var type = songInfo && (songInfo.source || songInfo.sourceType) ? String(songInfo.source || songInfo.sourceType) : "";
    if (!type) type = getSearchType();
    if (!id) {
      setLoading(false);
      showToast("该歌曲无法播放");
      return;
    }

    if (type === "vkeys_netease" || type === "vkeys_tencent") {
      var src = type === "vkeys_netease" ? "netease" : "tencent";
      var vUrl = "https://api.vkeys.cn/v2/music/" + src + "?id=" + encodeURIComponent(id);
      try {
        var vPayload = await fetchJson(vUrl, 12000);
        var vLink = vPayload && vPayload.data && vPayload.data.url ? String(vPayload.data.url) : "";
        if (!vLink) vLink = pickUrl(vPayload);
        if (!vLink) throw new Error("empty_url");
        vLink = String(vLink).replace(/^http:\/\//i, "https://");
        try {
          songInfo.url = vLink;
        } catch (e) {}
        playUrl(vLink);
        setLoading(false);
        return;
      } catch (e) {
        try {
          var fType = "wy";
          var fLinkUrl =
            "https://api.liumingye.cn/m/api/link?id=" + encodeURIComponent(id) + "&type=" + encodeURIComponent(fType);
          var fPayload = await fetchJsonp(fLinkUrl, 10000).catch(function () {
            return fetchJson(fLinkUrl, 12000);
          });
          var fUrl = pickUrl(fPayload);
          if (fUrl) {
            fUrl = String(fUrl).replace(/^http:\/\//i, "https://");
            playUrl(fUrl);
            setLoading(false);
            return;
          }
        } catch (e2) {}
        showToast("该歌曲无法播放");
        disableSong(songInfo);
        setLoading(false);
        return;
      }
    }

    var linkUrl =
      "https://api.liumingye.cn/m/api/link?id=" +
      encodeURIComponent(id) +
      "&type=" +
      encodeURIComponent(String(type || "kw"));

    try {
      var payload = await fetchJson(linkUrl, 10000);
      var url = pickUrl(payload);
      if (!url) throw new Error("empty_url");
      playUrl(url);
    } catch (e) {
      showToast("该歌曲无法播放");
      disableSong(songInfo);
    } finally {
      setLoading(false);
    }
  }

  function playSongById(id, songInfo) {
    var s = songInfo && typeof songInfo === "object" ? songInfo : {};
    if (!s.id) s.id = String(id || "");
    playSong(s);
  }

  function parseSongsFromPayload(payload) {
    var list = extractSearchArray(payload);
    return list
      .map(normalizeSong)
      .filter(function (x) {
        return !!x;
      });
  }

  function parseVkeysSearchSongs(payload, sourceKey) {
    if (!payload || typeof payload !== "object") return [];
    var ok = payload.code === 200 || payload.code === "200";
    if (!ok) return [];
    var arr = payload.data;
    if (!Array.isArray(arr) || !arr.length) return [];
    var out = [];
    for (var i = 0; i < arr.length; i += 1) {
      var raw = arr[i];
      if (!raw || typeof raw !== "object") continue;
      var id = raw.id;
      var name = raw.song || raw.name || raw.title;
      var singer = raw.singer || raw.artist || raw.author;
      var cover = raw.cover || raw.pic || raw.image;
      if (!id || !name) continue;
      out.push({
        id: String(id),
        title: String(name),
        artist: singer ? String(singer) : "未知歌手",
        cover: cover ? String(cover).replace(/^http:\/\//i, "https://") : DEFAULT_COVER,
        url: "",
        source: sourceKey === "netease" ? "vkeys_netease" : "vkeys_tencent",
        sourceType: sourceKey === "netease" ? "vkeys_netease" : "vkeys_tencent",
      });
    }
    return out;
  }

  async function searchVkeysAll(keyword) {
    var q = String(keyword || "").trim();
    if (!q) return [];
    var urlNetease = "https://api.vkeys.cn/v2/music/netease?word=" + encodeURIComponent(q);
    var urlTencent = "https://api.vkeys.cn/v2/music/tencent?word=" + encodeURIComponent(q);
    var results = await Promise.all([
      fetchJson(urlNetease, 12000).catch(function () {
        return null;
      }),
      fetchJson(urlTencent, 12000).catch(function () {
        return null;
      }),
    ]);
    var a = parseVkeysSearchSongs(results[0], "netease");
    var b = parseVkeysSearchSongs(results[1], "tencent");
    return a.concat(b).slice(0, 50);
  }

  async function doSearch(keyword) {
    var q = String(keyword || "").trim();
    if (!q) {
      if (searchHint) searchHint.textContent = "请输入关键词";
      clearSearchList();
      return;
    }

    setSearchActive(true);
    clearSearchList();

    try {
      if (searchHint) searchHint.textContent = "正在全网搜索...";
      var vkeysSongs = await searchVkeysAll(q);
      if (vkeysSongs && vkeysSongs.length) {
        renderList(vkeysSongs);
        if (searchHint) searchHint.textContent = "";
        showToast("已显示全网搜索结果");
        return;
      }
    } catch (e) {}

    var sources = [
      { type: "kw", name: "酷我" },
      { type: "kg", name: "酷狗" },
      { type: "tx", name: "QQ" },
      { type: "wy", name: "网易云" },
    ];

    var success = false;

    for (var i = 0; i < sources.length; i += 1) {
      var source = sources[i];
      if (searchHint) searchHint.textContent = "正在从 " + source.name + " 搜索...";

      var searchUrl =
        "https://api.liumingye.cn/m/api/search?q=" + encodeURIComponent(q) + "&type=" + encodeURIComponent(source.type);

      try {
        var payload = await fetchJson(searchUrl, 10000);

        var ok = payload && (payload.code === 200 || payload.code === "200");
        var list = extractSearchArray(payload);

        if (ok && list && list.length > 0) {
          var songs = list
            .map(normalizeSong)
            .filter(function (x) {
              return !!x;
            });

          if (songs.length > 0) {
            songs.forEach(function (s) {
              s.source = source.type;
              s.sourceType = source.type;
            });

            renderList(songs);
            if (searchHint) searchHint.textContent = "";
            showToast("已显示 " + source.name + " 搜索结果");
            success = true;
            break;
          }
        }
      } catch (e) {}
    }

    if (!success) {
      if (searchHint) searchHint.textContent = "搜索失败，未找到相关歌曲";
      showToast("所有音源均无法连接");
    }
  }

  function normalizeMatchText(input) {
    var s = String(input || "")
      .toLowerCase()
      .replace(/（[^）]*）|\([^)]*\)|【[^】]*】|\[[^\]]*\]/g, " ")
      .replace(/[\u2018\u2019'"]/g, "")
      .replace(/[-‐‑–—_]/g, " ")
      .replace(/[·•]/g, " ")
      .replace(/[^a-z0-9\u00c0-\u024f\u4e00-\u9fff\uac00-\ud7af\s]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return s;
  }

  function normalizeTitleForMatch(title) {
    var t = normalizeMatchText(title);
    t = t.replace(/\b(feat|ft|with)\b/g, " ").replace(/\s+/g, " ").trim();
    return t;
  }

  function splitArtistParts(artist) {
    var a = normalizeMatchText(artist).replace(/\b(feat|ft|with)\b/g, " ");
    return a
      .split(/[\/,&，、;；]+|\s{2,}/g)
      .map(function (x) {
        return String(x || "").trim();
      })
      .filter(function (x) {
        return !!x;
      });
  }

  function artistMatches(a, b) {
    var aa = splitArtistParts(a);
    var bb = splitArtistParts(b);
    if (!aa.length || !bb.length) return true;
    for (var i = 0; i < aa.length; i += 1) {
      for (var j = 0; j < bb.length; j += 1) {
        var x = aa[i];
        var y = bb[j];
        if (!x || !y) continue;
        if (x === y) return true;
        if (x.length >= 2 && y.length >= 2 && (x.indexOf(y) >= 0 || y.indexOf(x) >= 0)) return true;
      }
    }
    return false;
  }

  function titleScore(a, b) {
    var x = normalizeTitleForMatch(a);
    var y = normalizeTitleForMatch(b);
    if (!x || !y) return 0;
    if (x === y) return 3;
    if (x.indexOf(y) >= 0 || y.indexOf(x) >= 0) return 2;
    return 0;
  }

  function computeMatchScore(origin, candidate) {
    if (!origin || !candidate) return -1;
    var ts = titleScore(origin.title, candidate.title);
    if (!ts) return -1;
    if (!artistMatches(origin.artist, candidate.artist)) return -1;
    var score = ts + 3;
    var st = String(candidate.sourceType || candidate.source || "");
    if (st === "kw") score += 0.4;
    else if (st === "kg") score += 0.3;
    else if (st === "tx") score += 0.2;
    else if (st === "wy") score -= 0.2;
    return score;
  }

  async function searchLiumingyeSongs(keyword, sourceType) {
    var q = String(keyword || "").trim();
    if (!q) return [];
    var t = String(sourceType || "").trim();
    if (!t) return [];
    var url =
      "https://api.liumingye.cn/m/api/search?q=" + encodeURIComponent(q) + "&type=" + encodeURIComponent(t);
    var payload = await fetchJson(url, 10000);
    var list = extractSearchArray(payload);
    if (!list || !list.length) return [];
    var songs = list
      .map(normalizeSong)
      .filter(function (x) {
        return !!x;
      })
      .slice(0, 20);
    songs.forEach(function (s) {
      s.url = "";
      s.source = t;
      s.sourceType = t;
    });
    return songs;
  }

  async function findBestMatchForSong(song) {
    if (!song) return null;
    var title = String(song.title || "").trim();
    if (!title) return null;
    var artist = String(song.artist || "").trim();
    var q = (title + " " + artist).trim();
    var sources = ["kw", "kg", "tx", "wy"];
    var best = null;
    var bestScore = -1;
    for (var i = 0; i < sources.length; i += 1) {
      var type = sources[i];
      try {
        var candidates = await searchLiumingyeSongs(q, type);
        for (var j = 0; j < candidates.length; j += 1) {
          var c = candidates[j];
          var score = computeMatchScore(song, c);
          if (score > bestScore) {
            bestScore = score;
            best = c;
          }
          if (bestScore >= 6) return best;
        }
      } catch (e) {}
    }
    if (bestScore < 5) return null;
    return best;
  }

  function applyMatchToSong(target, candidate) {
    if (!target || !candidate) return false;
    var newId = candidate.id ? String(candidate.id) : "";
    var newType = candidate.sourceType || candidate.source ? String(candidate.sourceType || candidate.source) : "";
    if (!newId || !newType) return false;
    if (String(target.id || "") === newId && String(target.sourceType || target.source || "") === newType) return false;
    target.id = newId;
    target.source = newType;
    target.sourceType = newType;
    target.url = "";
    if (!target.cover || String(target.cover) === DEFAULT_COVER) {
      target.cover = candidate.cover || target.cover;
    }
    if (!target.artist || String(target.artist) === "未知歌手") {
      target.artist = candidate.artist || target.artist;
    }
    return true;
  }

  function previewFixKey(song) {
    var t = normalizeTitleForMatch(song && song.title ? song.title : "");
    var a = normalizeMatchText(song && song.artist ? song.artist : "");
    if (!t) return "";
    return "pf:" + t + "::" + a;
  }

  async function fixShortPreviewTrack(track) {
    if (!track) return;
    var libIndex = findLibrarySongIndex(track);
    showToast("正在匹配可播放音源...");
    var candidate = await findBestMatchForSong(track);
    if (!candidate) {
      showToast("未找到更可用的音源");
      return;
    }
    var changed = applyMatchToSong(track, candidate);
    if (!changed) return;
    if (libIndex >= 0 && state.library && state.library[libIndex]) {
      var libSong = state.library[libIndex];
      applyMatchToSong(libSong, candidate);
    }
    saveLibrary();
    rebuildQueue();
    renderHomePlaylist();
    try {
      if (audioEl) audioEl.pause();
    } catch (e) {}
    playSong(track);
  }

  function maybeFixShortPreviewFromMetadata() {
    if (!audioEl) return;
    var d = Number(audioEl.duration || 0);
    if (!isFinite(d) || d <= 0) return;
    if (d < 20 || d > 45) return;
    var current = state.queue[state.currentIndex];
    if (!current) return;
    var st = String(current.sourceType || current.source || "");
    if (st !== "vkeys_netease" && st !== "wy") return;
    var k = previewFixKey(current);
    if (!k) return;
    if (!state.previewFixMap) state.previewFixMap = {};
    if (state.previewFixMap[k]) return;
    state.previewFixMap[k] = 1;
    fixShortPreviewTrack(current).catch(function () {});
  }

  function prefetchMatchForTracks(tracks, maxCount) {
    if (!tracks || !tracks.length) return;
    var limit = Number(maxCount || 20);
    if (!isFinite(limit) || limit <= 0) limit = 20;
    limit = Math.min(limit, tracks.length);
    var concurrency = 2;
    var idx = 0;
    var inFlight = 0;
    var changed = 0;

    function enqueue() {
      while (inFlight < concurrency && idx < limit) {
        var t = tracks[idx];
        idx += 1;
        if (!t) continue;
        var st = String(t.sourceType || t.source || "");
        if (st !== "vkeys_netease" && st !== "wy") continue;
        inFlight += 1;
        findBestMatchForSong(t)
          .then(function (candidate) {
            if (!candidate) return;
            var ok = applyMatchToSong(t, candidate);
            if (ok) changed += 1;
          })
          .catch(function () {})
          .finally(function () {
            inFlight -= 1;
            if (idx >= limit && inFlight === 0) {
              if (changed > 0) {
                saveLibrary();
                rebuildQueue();
                renderHomePlaylist();
                showToast("已匹配 " + changed + " 首可播放音源");
              }
              return;
            }
            enqueue();
          });
      }
    }

    enqueue();
  }

  function prefetchLyricsForTracks(tracks, maxCount) {
    if (!tracks || !tracks.length) return;
    var limit = Number(maxCount || 30);
    if (!isFinite(limit) || limit <= 0) limit = 30;
    limit = Math.min(limit, tracks.length);
    var concurrency = 4;
    var idx = 0;
    var inFlight = 0;

    function enqueue() {
      while (inFlight < concurrency && idx < limit) {
        var t = tracks[idx];
        idx += 1;
        if (!t || !t.id) continue;
        var key = trackKey(t);
        if (!key) continue;
        if (!state.lyricCache) state.lyricCache = {};
        if (state.lyricCache[key]) continue;
        inFlight += 1;
        fetchLyricById(String(t.id), String(t.sourceType || t.source || ""))
          .then(function (txt) {
            if (!txt || !String(txt).trim()) return;
            var k = trackKey(t);
            if (!k) return;
            if (!state.lyricCache) state.lyricCache = {};
            state.lyricCache[k] = String(txt);
          })
          .catch(function () {})
          .finally(function () {
            inFlight -= 1;
            enqueue();
          });
      }
    }

    enqueue();
  }

  function importPlaylist(playlistId) {
    function normalizePlaylistIdInput(input) {
      var raw = String(input || "").trim();
      if (!raw) return "";
      var nums = raw.match(/\d{5,}/g);
      if (!nums || !nums.length) return "";
      nums.sort(function (a, b) {
        return String(b).length - String(a).length;
      });
      return String(nums[0] || "").trim();
    }

    var pid = normalizePlaylistIdInput(playlistId);
    if (!pid) {
      showToast("请输入正确的歌单 ID 或分享链接");
      return;
    }

    showToast("正在解析歌单...");
    var isNullOrigin = false;
    try {
      isNullOrigin = window.location.protocol === "file:" || window.location.origin === "null";
    } catch (e) {}

    var urls = [
      API_METING_PLAYLIST_FALLBACK + encodeURIComponent(pid),
      API_METING_PLAYLIST + encodeURIComponent(pid),
    ];

    function fetchPlaylistPayload(i, lastErr) {
      if (i >= urls.length) return Promise.reject(lastErr || new Error("all_failed"));
      var u = urls[i];
      var tryJsonpFirst = isNullOrigin && u.indexOf("api.i-meto.com/meting/api") >= 0;
      var p = tryJsonpFirst
        ? fetchJsonp(u, 15000).catch(function () {
            return fetchJson(u, 15000);
          })
        : fetchJson(u, 15000).catch(function () {
            return fetchJsonp(u, 15000);
          });
      return p.catch(function (err) {
        return fetchPlaylistPayload(i + 1, err);
      });
    }

    fetchPlaylistPayload(0)
      .then(function (payload) {
        var list = Array.isArray(payload) ? payload : extractSearchArray(payload);
        if (!Array.isArray(list) || !list.length) {
          var reason = "";
          if (typeof payload === "string") {
            var s = String(payload || "").trim();
            if (s && (s.indexOf("<!DOCTYPE") >= 0 || s.indexOf("<html") >= 0)) reason = "接口返回异常（HTML），可能被拦截";
          } else if (payload && typeof payload === "object") {
            reason =
              payload.msg ||
              payload.message ||
              payload.error ||
              payload.reason ||
              (payload.data && typeof payload.data === "string" ? payload.data : "");
          }
          showToast(reason ? "歌单解析失败：" + String(reason) : "未解析到歌曲");
          return;
        }

        var tracks = list
          .map(normalizeMetingTrack)
          .filter(function (x) {
            return !!x;
          });

        if (!tracks.length) {
          showToast("未解析到可用歌曲");
          return;
        }

        tracks = tracks
          .map(function (t) {
            if (!t) return null;
            var out = Object.assign({}, t);
            var hasId = !!(out.id && String(out.id).trim());
            var hasUrl = !!(out.url || out.src);
            if (!hasId && !hasUrl) return null;
            if (hasId && !hasUrl) {
              out.url = "";
              out.source = "vkeys_netease";
              out.sourceType = "vkeys_netease";
            }
            return out;
          })
          .filter(function (t) {
            return !!t;
          });

        if (!tracks.length) {
          showToast("未解析到可用歌曲");
          return;
        }

        var titleKey = function (t) {
          return String(t || "")
            .trim()
            .toLowerCase();
        };
        var existing = new Set(
          state.library.map(function (s) {
            return titleKey(s && s.title);
          })
        );

        var added = [];
        tracks.forEach(function (track) {
          var key = titleKey(track.title);
          if (!key) return;
          if (existing.has(key)) return;
          existing.add(key);
          added.push(track);
        });

        if (!added.length) {
          showToast("没有可导入的新歌曲");
          renderHomePlaylist();
          return;
        }

        state.library = state.library.concat(added);
        state.queueMode = "library";
        rebuildQueue();
        saveLibrary();
        renderHomePlaylist();
        showToast("成功导入 " + added.length + " 首歌曲！");
        prefetchLyricsForTracks(added, 25);
        prefetchMatchForTracks(added, 18);
      })
      .catch(function (err) {
        try {
          console.error("importPlaylist failed:", err);
        } catch (e) {}
        var reason = err && err.message ? String(err.message) : "";
        showToast(reason ? "歌单解析失败：" + reason : "歌单解析失败");
      });
  }

  tabs.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var tabName = btn.dataset.tab || "home";
      setActiveTab(tabName);
      setActivePage(tabName);
      if (tabName === "play") {
        openPlayer();
        scheduleWaveRebuild();
      }
    });
  });

  if (homePlaylist) {
    var pressTimer = 0;
    var pressBtn = null;
    var pressMoved = false;

    function clearPress() {
      if (pressTimer) window.clearTimeout(pressTimer);
      pressTimer = 0;
      pressBtn = null;
      pressMoved = false;
    }

    function scheduleLongPress(btn) {
      clearPress();
      pressBtn = btn;
      pressTimer = window.setTimeout(function () {
        state.homeIgnoreClick = true;
        var key = pressBtn ? String(pressBtn.dataset.key || "") : "";
        if (!key) return;
        enterHomeSelectMode();
        toggleHomeSelectedByKey(key);
      }, 420);
    }

    homePlaylist.addEventListener("touchstart", function (e) {
      var t = e.target;
      if (!t) return;
      var b = t.closest ? t.closest(".playlist-item") : null;
      if (!b || !homePlaylist.contains(b)) return;
      scheduleLongPress(b);
    });

    homePlaylist.addEventListener("touchmove", function () {
      pressMoved = true;
      if (pressTimer) window.clearTimeout(pressTimer);
    });

    homePlaylist.addEventListener("touchend", function () {
      if (pressMoved) clearPress();
      else if (pressTimer) window.clearTimeout(pressTimer);
      pressTimer = 0;
    });

    homePlaylist.addEventListener("touchcancel", function () {
      clearPress();
    });

    homePlaylist.addEventListener("click", function (e) {
      var target = e.target;
      if (!target) return;
      var btn = target.closest ? target.closest(".playlist-item") : null;
      if (!btn || !homePlaylist.contains(btn)) return;
      if (state.homeIgnoreClick) {
        state.homeIgnoreClick = false;
        return;
      }
      if (state.homeSelecting) {
        e.preventDefault();
        e.stopPropagation();
        toggleHomeSelectedByKey(String(btn.dataset.key || ""));
        return;
      }
      var index = Number(btn.dataset.index || 0);
      state.queueMode = "library";
      rebuildQueue();
      playQueueIndex(index);
    });
  }

  if (homeSelectCancel) {
    homeSelectCancel.addEventListener("click", function () {
      exitHomeSelectMode();
    });
  }

  if (homeDeleteBtn) {
    homeDeleteBtn.addEventListener("click", function () {
      deleteHomeSelectedSongs();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("focus", function () {
      setSearchActive(true);
    });

    searchInput.addEventListener("blur", function () {
      if (!String(searchInput.value || "").trim()) setSearchActive(false);
    });

    searchInput.addEventListener("input", function () {
      setClearVisible(!!searchInput.value);
      if (!searchInput.value && searchHint) {
        searchHint.textContent = "输入关键词后回车搜索";
        clearSearchList();
      }
    });

    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        doSearch(searchInput.value);
      }
    });
  }

  if (searchSource) {
    searchSource.addEventListener("change", function () {
      if (!searchInput) return;
      if (String(searchInput.value || "").trim()) doSearch(searchInput.value);
    });
  }

  if (searchClear) {
    searchClear.addEventListener("click", function () {
      if (!searchInput) return;
      searchInput.value = "";
      setClearVisible(false);
      if (searchHint) searchHint.textContent = "输入关键词后回车搜索";
      clearSearchList();
      searchInput.focus();
    });
  }

  if (searchCancel) {
    searchCancel.addEventListener("click", function () {
      if (searchInput) {
        searchInput.value = "";
        searchInput.blur();
      }
      setClearVisible(false);
      if (searchHint) searchHint.textContent = "输入关键词后回车搜索";
      clearSearchList();
      setSearchActive(false);
    });
  }

  if (playlistImportBtn) {
    playlistImportBtn.addEventListener("click", function () {
      var pid = window.prompt("请输入网易云歌单 ID (例如: 24381616)");
      if (pid === null) return;
      var v = String(pid || "").trim();
      if (!v) return;
      importPlaylist(v);
    });
  }

  playBtn.addEventListener("click", function () {
    if (!audioEl) return;
    var current = ensureCurrentTrackInfo();
    if (!audioEl.src) {
      if (!current) {
        showToast("暂无歌曲");
        return;
      }
      if (current && current.id) {
        playSongById(current.id, current);
        return;
      }
      state.playCtx = { key: trackKey(current), triedApi: true, triedOuter: true };
      playUrl(current.url || current.src);
      return;
    }
    setPlaying(audioEl.paused);
  });

  if (miniPlayBtn) {
    miniPlayBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!audioEl) return;
      var current = ensureCurrentTrackInfo();
      if (!audioEl.src) {
        if (!current) {
          showToast("暂无歌曲");
          return;
        }
        if (current && current.id) {
          playSongById(current.id, current);
          return;
        }
        state.playCtx = { key: trackKey(current), triedApi: true, triedOuter: true };
        playUrl(current.url || current.src);
        return;
      }
      setPlaying(audioEl.paused);
    });
  }

  if (miniOpen) {
    miniOpen.addEventListener("click", function () {
      openPlayer();
      setActiveTab("play");
      scheduleWaveRebuild();
    });
  }

  if (shuffleBtn) {
    shuffleBtn.addEventListener("click", function () {
      setModeByIndex(state.modeIndex + 1);
    });
  }

  if (repeatBtn) {
    repeatBtn.addEventListener("click", function () {
      openQueue();
    });
  }

  prevBtn.addEventListener("click", function () {
    playQueueIndex(computeNextIndex(-1));
  });

  nextBtn.addEventListener("click", function () {
    playQueueIndex(computeNextIndex(1));
  });

  closeBtn.onclick = function () {
    closePlayer();
  };

  if (waveEl) {
    waveEl.addEventListener("click", function (e) {
      var rect = waveEl.getBoundingClientRect();
      var x = e.clientX - rect.left;
      seekByRatio(x / rect.width);
    });
  }

  if (favBtn) {
    favBtn.addEventListener("click", function () {
      toggleFav();
    });
  }

  function isTogetherActive() {
    if (!playerSheet) return false;
    if (!playerSheet.classList.contains("is-together")) return false;
    var roleId = state.togetherRoleId || resolveTogetherRoleId(readTogetherSession());
    return !!roleId;
  }

  function updateTogetherDurationLabel() {
    if (!togetherDurationLabel) return;
    if (!isTogetherActive()) {
      togetherDurationLabel.textContent = "";
      return;
    }
    var roleId = state.togetherRoleId || resolveTogetherRoleId(readTogetherSession());
    if (!roleId) {
      togetherDurationLabel.textContent = "";
      return;
    }
    var map = loadTogetherStatsMap();
    var cur = map[roleId] && typeof map[roleId] === "object" ? map[roleId] : {};
    var base = Number(cur.listenSeconds || 0);
    if (!isFinite(base) || base < 0) base = 0;
    var extra = 0;
    if (state.isPlaying && state.listenStartedAt) {
      var d = Math.floor((Date.now() - state.listenStartedAt) / 1000);
      if (isFinite(d) && d > 0) extra = d;
    }
    togetherDurationLabel.textContent = formatHoursMinutesCN(base + extra);
  }

  function maybeCountTogetherSongStart() {
    if (!isTogetherActive()) return;
    var current = state.queue && state.queue[state.currentIndex] ? state.queue[state.currentIndex] : null;
    if (!current) return;
    var k = trackKey(current) || (String(current.title || "") + "::" + String(current.artist || ""));
    if (!k) return;
    if (state.togetherLastCountedKey === k) return;
    state.togetherLastCountedKey = k;
    bumpTogetherSongCount();
  }

  function exitTogetherSession() {
    flushListenTime();
    try {
      if (isTogetherActive()) syncSystemMessage("stop");
    } catch (e0) {}
    try {
      if (window.localStorage) localStorage.removeItem("listen_together_session");
    } catch (e) {}
    setTogetherMenuOpen(false);
    setTogetherExitOpen(false);
    syncTogetherFromStorage();
    openPlayer();
    setActiveTab("play");
    setActivePage("play");
  }

  function openTogetherChat() {
    var roleId = state.togetherRoleId || resolveTogetherRoleId(readTogetherSession());
    if (!roleId) return;
    setTogetherMenuOpen(false);
    try {
      if (window.parent && window.parent !== window) {
        if (typeof window.parent.enterChatRoom === "function") {
          window.parent.enterChatRoom(roleId);
          return;
        }
        if (typeof window.parent.openChatApp === "function") {
          window.parent.openChatApp();
          return;
        }
      }
    } catch (e) {}
  }

  function openTogetherExitCard() {
    flushListenTime();
    var session = readTogetherSession();
    var roleId = state.togetherRoleId || resolveTogetherRoleId(session);
    if (!roleId) return;
    if (togetherExitAvatarLeft) {
      var mp = null;
      try {
        mp = loadProfile();
      } catch (e0) {
        mp = null;
      }
      togetherExitAvatarLeft.src = normalizeAssetUrl(
        (mp && mp.avatar) || (session && session.userAvatar ? String(session.userAvatar) : "")
      );
    }
    if (togetherExitAvatarRight) {
      togetherExitAvatarRight.src = normalizeAssetUrl(session && session.characterAvatar ? String(session.characterAvatar) : "");
    }
    var map = loadTogetherStatsMap();
    var cur = map[roleId] && typeof map[roleId] === "object" ? map[roleId] : {};
    var sec = Number(cur.listenSeconds || 0);
    if (!isFinite(sec) || sec < 0) sec = 0;
    var songs = Number(cur.songs || 0);
    if (!isFinite(songs) || songs < 0) songs = 0;
    if (togetherExitSongCount) togetherExitSongCount.textContent = String(Math.floor(songs));
    if (togetherExitDurationMin) togetherExitDurationMin.textContent = String(Math.floor(sec / 60));
    setTogetherMenuOpen(false);
    setTogetherExitOpen(true);
  }

  function openInvite() {
    renderInviteList();
    setInviteOpen(true);
  }

  if (inviteBtn) {
    inviteBtn.addEventListener("click", function () {
      if (isTogetherActive()) {
        setTogetherMenuOpen(true);
      } else {
        openInvite();
      }
    });
  }

  if (inviteBackdrop) {
    inviteBackdrop.addEventListener("click", function () {
      setInviteOpen(false);
    });
  }

  if (inviteClose) {
    inviteClose.addEventListener("click", function () {
      setInviteOpen(false);
    });
  }

  if (togetherMenuBackdrop) {
    togetherMenuBackdrop.addEventListener("click", function () {
      setTogetherMenuOpen(false);
    });
  }

  if (togetherMenuChatBtn) {
    togetherMenuChatBtn.addEventListener("click", function () {
      setTogetherMenuOpen(false);
      toggleChatDrawer(true);
    });
  }

  if (togetherMenuExitBtn) {
    togetherMenuExitBtn.addEventListener("click", function () {
      openTogetherExitCard();
    });
  }

  if (togetherExitBackdrop) {
    togetherExitBackdrop.addEventListener("click", function () {
      setTogetherExitOpen(false);
    });
  }

  if (togetherExitShareBtn) {
    togetherExitShareBtn.addEventListener("click", function () {
      var roleId = state.togetherRoleId || resolveTogetherRoleId(readTogetherSession());
      if (roleId) {
        flushListenTime();
        var text = buildTogetherExitSummaryText(roleId);
        sendTextToRole(roleId, text);
        showToast("已分享");
      }
      exitTogetherSession();
    });
  }

  if (togetherExitCloseBtn) {
    togetherExitCloseBtn.addEventListener("click", function () {
      exitTogetherSession();
    });
  }

  if (moreBtn) {
    moreBtn.addEventListener("click", function () {
      showToast("开发中");
    });
  }

  function applyTogetherSession(session) {
    if (!playerSheet) return;
    playerSheet.classList.add("is-together");
    state.togetherRoleId = resolveTogetherRoleId(session);
    state.togetherLastCountedKey = "";
    maybeEmitTogetherStart(session);

    if (!togetherRow) return;

    var leftImg = togetherRow.querySelector(".avatar-left img");
    if (leftImg) {
      var mp = null;
      try {
        mp = loadProfile();
      } catch (e0) {
        mp = null;
      }
      leftImg.src = normalizeAssetUrl(
        (mp && mp.avatar) || (session && session.userAvatar ? String(session.userAvatar) : "")
      );
    }

    var right = togetherRow.querySelector(".avatar-right");
    if (right) {
      if (session && session.characterAvatar) {
        right.classList.remove("placeholder");
        var rightImg = right.querySelector("img");
        if (!rightImg) {
          rightImg = document.createElement("img");
          rightImg.alt = "";
          rightImg.loading = "lazy";
          right.appendChild(rightImg);
        }
        rightImg.src = normalizeAssetUrl(String(session.characterAvatar));
      } else {
        right.classList.add("placeholder");
      }
    }
    updateTogetherDurationLabel();
  }

  window.addEventListener("message", function (ev) {
    var data = ev && ev.data ? ev.data : null;
    if (!data || typeof data !== "object") return;
    if (data.type === "MUSIC_OPEN_PLAYER") {
      openPlayer();
      setActiveTab("play");
      scheduleWaveRebuild();
      syncFromGlobalPlayer();
      syncTogetherFromStorage();
    } else if (data.type === "MUSIC_TOGETHER_START") {
      openPlayer();
      setActiveTab("play");
      scheduleWaveRebuild();
      applyTogetherSession(data.payload || {});
      try {
        if (window.localStorage) localStorage.setItem("listen_together_session", JSON.stringify(data.payload || {}));
      } catch (e) {}
      syncFromGlobalPlayer();
      showToast("已进入一起听");
    }
  });

  try {
    if (window.parent && window.parent !== window && window.parent.__musicOpenPlayerOnLoad) {
      window.parent.__musicOpenPlayerOnLoad = false;
      openPlayer();
      setActiveTab("play");
      scheduleWaveRebuild();
      syncFromGlobalPlayer();
      syncTogetherFromStorage();
    }
  } catch (e) {}
  updateModeButtons();
  updateQueueButton();

  if (queueBackdrop) {
    queueBackdrop.addEventListener("click", function () {
      setQueueOpen(false);
    });
  }

  if (queueClose) {
    queueClose.addEventListener("click", function () {
      setQueueOpen(false);
    });
  }

  if (coverCard) {
    coverCard.addEventListener("click", function () {
      setLyricsOpen(true);
    });
  }

  if (playerSheet) {
    playerSheet.addEventListener("click", function (e) {
      if (playerSheet.classList.contains("is-lyrics")) return;
      var target = e && e.target ? e.target : null;
      if (!target) return;
      if (target.closest(".controls")) return;
      if (target.closest(".np-topbar")) return;
      if (target.closest(".np-actions")) return;
      if (target.closest(".wave-wrap")) return;
      if (target.closest(".queue-modal")) return;
      if (target.closest(".invite-modal")) return;
      if (target.closest(".cover-wrap") || target.closest(".track-info") || target.closest(".together")) {
        setLyricsOpen(true);
      }
    });
  }

  if (lyricsView) {
    lyricsView.addEventListener("click", function () {
      setLyricsOpen(false);
    });
  }

  if (audioEl) {
    audioEl.addEventListener("play", function () {
      state.isPlaying = true;
      if (!state.listenStartedAt) state.listenStartedAt = Date.now();
      maybeCountTogetherSongStart();
      playerSheet.classList.add("is-playing");
      setPlayIcon(true);
      updateTogetherDurationLabel();
      try {
        maybeEmitTogetherPlaybackMoment("resume");
      } catch (e) {}
    });

    audioEl.addEventListener("pause", function () {
      state.isPlaying = false;
      flushListenTime();
      if (profilePage && !profilePage.hidden) renderProfileView();
      playerSheet.classList.remove("is-playing");
      setPlayIcon(false);
      updateTogetherDurationLabel();
      try {
        maybeEmitTogetherPlaybackMoment("pause");
      } catch (e2) {}
    });

    audioEl.addEventListener("timeupdate", function () {
      updateWaveFromAudio();
      syncLyric();
      updateTogetherDurationLabel();
    });

    audioEl.addEventListener("loadedmetadata", function () {
      updateWaveFromAudio();
      maybeFixShortPreviewFromMetadata();
    });

    audioEl.addEventListener("ended", function () {
      flushListenTime();
      if (profilePage && !profilePage.hidden) renderProfileView();
      handleTrackEnd();
    });

    audioEl.addEventListener("error", function () {
      flushListenTime();
      var current = state.queue[state.currentIndex];
      if (!current) {
        showToast("音频加载失败");
        return;
      }

      showToast("该歌曲无法播放");
      disableSong(current);
      playNextAfterDisable(state.currentIndex);
    });
  }

  window.addEventListener("beforeunload", function () {
    flushListenTime();
  });

  ensureLatestServiceWorker();
  handleMusicEvents();
  setupProfileInteractions();
  state.library = loadLibrary();
  rebuildQueue();
  setSearchActive(false);
  setClearVisible(false);
  setModeByIndex(2);
  scheduleWaveRebuild();
  setPlayIcon(false);
  setActivePage("home");
  updateHomeSelectUi();
  renderHomePlaylist();
  syncFromGlobalPlayer();
  syncTogetherFromStorage();

  window.addEventListener("resize", function () {
    scheduleWaveRebuild();
  });
})();
