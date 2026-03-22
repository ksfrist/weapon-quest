// Weapon Quest Game - game.js
var WEAPONS = [
  // -- 冷兵器 --
  {lv:1,  n:"木棍",     e:"\ud83e\udde4", era:"cold",  cost:10},
  {lv:2,  n:"石斧",     e:"\ud83e\udd93", era:"cold",  cost:20},
  {lv:3,  n:"青铜剑",   e:"\u2694\ufe0f", era:"cold",  cost:30},
  {lv:4,  n:"铁剑",     e:"\ud83e\udd61\ufe0f", era:"cold",  cost:40},
  {lv:5,  n:"钢刀",     e:"\ud83d\udd2a", era:"cold",  cost:50},
  // -- 火器 --
  {lv:6,  n:"火绳枪",   e:"\ud83d\udd2b", era:"fire",  cost:60},
  {lv:7,  n:"左轮手枪",  e:"\ud83e\uddad", era:"fire",  cost:70},
  {lv:8,  n:"步枪",     e:"\ud83c\udfaf", era:"fire",  cost:80},
  {lv:9,  n:"冲锋枪",   e:"\ud83d\udca8", era:"fire",  cost:90},
  {lv:10, n:"狙击枪",   e:"\ud83d\udd2d", era:"fire",  cost:100},
  // -- 重型 --
  {lv:11, n:"加特林",   e:"\u2699\ufe0f", era:"heavy", cost:120},
  {lv:12, n:"火箭筒",   e:"\ud83d\ude80", era:"heavy", cost:140},
  {lv:13, n:"榴弹炮",   e:"\ud83d\udca3", era:"heavy", cost:160},
  {lv:14, n:"坦克炮",   e:"\ud83e\udde1\ufe0f", era:"heavy", cost:180},
  // -- 能量 --
  {lv:15, n:"激光枪",   e:"\u26a1", era:"energy", cost:200},
  {lv:16, n:"电磁炮",   e:"\ud83d\udd0c", era:"energy", cost:230},
  {lv:17, n:"等离子炮", e:"\ud83d\udca5", era:"energy", cost:260},
  {lv:18, n:"冷冻射线", e:"\u2744\ufe0f", era:"energy", cost:300},
  // -- 科幻 --
  {lv:19, n:"量子炮",   e:"\ud83d\udd2e", era:"future", cost:350},
  {lv:20, n:"星际舰炮", e:"\ud83c\udf0c", era:"future", cost:0},
];
var ERAS = [
  {id:"cold",   n:"冷兵器时代", e:"\ud83e\udd75", color:"#8B4513"},
  {id:"fire",   n:"早期火器",   e:"\ud83d\udd2b", color:"#CD7F32"},
  {id:"heavy",  n:"重型武器",   e:"\ud83d\udca3", color:"#b91c1c"},
  {id:"energy", n:"能量武器",   e:"\u26a1", color:"#7c3aed"},
  {id:"future", n:"未来科技",   e:"\ud83c\udf0c", color:"#6366f1"},
];

var TASK_ICONS = ["\ud83d\udcdd","\ud83d\udcd6","\u270f\ufe0f","\ud83d\udcda","\ud83c\udfc3","\ud83e\uddf9","\ud83d\udd73","\ud83e\uddca","\ud83c\udf31","\u2b50"];

var state = {
  name:"",gold:0,xp:0,level:1,currentWp:0,fragments:0,
  ownedWp:[],streak:0,totalDone:0,lastDate:"",tasks:[],history:[],
  templates:[],createdAt:"",soundEnabled:true
};

var currentPage = "home";
var taskView = "list"; // "list" or "templates"
var editingTemplateId = null;
var selectedIcon = "\ud83d\udcdd";
var STORAGE_KEY = "wpquest_v3";

function xpForLevel(lv) { return lv * 80; }
function todayStr() { return new Date().toISOString().split("T")[0]; }
function yesterdayStr() {
  var d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
}

function load() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    var p = JSON.parse(raw);
    state.name        = p.name        || "";
    state.gold       = p.gold        || 0;
    state.xp         = p.xp          || 0;
    state.level      = p.level       || 1;
    state.currentWp  = p.currentWp   || 0;
    state.fragments  = p.fragments   || 0;
    state.ownedWp    = p.ownedWp     || [];
    state.streak     = p.streak      || 0;
    state.totalDone  = p.totalDone   || 0;
    state.lastDate   = p.lastDate    || "";
    state.tasks      = p.tasks       || [];
    state.history    = p.history     || [];
    state.templates  = p.templates   || [];
    state.createdAt  = p.createdAt   || "";
    state.soundEnabled = p.soundEnabled !== undefined ? p.soundEnabled : true;
    return true;
  } catch(e) { return false; }
}

function resetDailyTasks() {
  var today = todayStr();
  if (state.lastDate && state.lastDate !== today) {
    state.tasks.forEach(function(t) {
      t.done = false;
      t.rating = null;
    });
  }
}

function updateStreak() {
  var today = todayStr();
  if (state.lastDate === today) return;
  var yStr = yesterdayStr();
  if (state.lastDate === yStr) {
    state.streak = (state.streak || 0) + 1;
  } else if (state.lastDate && state.lastDate !== today) {
    state.streak = 1;
  } else if (!state.lastDate) {
    state.streak = 1;
  }
  state.lastDate = today;
}

function addTask(text, icon) {
  if (!text || !text.trim()) return;
  state.tasks.push({
    id: Date.now(),
    text: text.trim(),
    icon: icon || selectedIcon,
    done: false,
    rating: null,
    important: false,
    fromTemplate: null
  });
  save();
  renderTasks();
}

function toggleTask(id) {
  for (var i = 0; i < state.tasks.length; i++) {
    if (state.tasks[i].id === id) {
      state.tasks[i].done = !state.tasks[i].done;
      if (!state.tasks[i].done) state.tasks[i].rating = null;
      break;
    }
  }
  save();
  renderTasks();
}

function rateTask(id, rating) {
  for (var i = 0; i < state.tasks.length; i++) {
    var t = state.tasks[i];
    if (t.id !== id) continue;
    if (!t.done) return;
    var prev = t.rating;
    if (prev === rating) {
      refundTask(t);
      t.rating = null;
      t.done = false;
    } else {
      if (prev) refundTask(t);
      applyRating(t, rating);
      t.rating = rating;
    }
    break;
  }
  save();
  refreshDisplay();
  renderTasks();
}

function refundTask(task) {
  var r = task.rating;
  if (r === "full") {
    state.gold -= 10; state.xp -= 5; state.fragments -= 10; state.totalDone -= 1;
  } else if (r === "partial") {
    state.gold -= 6; state.xp -= 3; state.fragments -= 6; state.totalDone -= 1;
  } else if (r === "none") {
    state.gold -= 2; state.xp -= 1; state.fragments -= 2; state.totalDone -= 1;
  }
  if (state.gold < 0) state.gold = 0;
  if (state.xp < 0) state.xp = 0;
  if (state.fragments < 0) state.fragments = 0;
}

function applyRating(task, rating) {
  updateStreak();
  var gold = 0, xp = 0, frags = 0;
  if (rating === "full")   { gold = 10; xp = 5; frags = 1; state.totalDone++; }
  else if (rating === "partial") { gold = 6; xp = 3; state.totalDone++; }
  state.gold += gold;
  state.xp += xp;
  state.fragments += frags;
  state.history.unshift({ text: task.text, rating: rating, date: todayStr(), gold: gold, xp: xp });
  var needed = xpForLevel(state.level);
  if (state.xp >= needed) {
    state.xp -= needed; state.level++;
    setTimeout(confettiBurst, 100);
  }
  checkWeaponUnlock();
  state.lastDate = todayStr();
}

function checkWeaponUnlock() {
  while (true) {
    var wp = getCurrentWeapon();
    var nextWp = wp.lv < 20 ? WEAPONS[wp.lv] : null;
    if (!nextWp) break; // max tier reached
    if (state.fragments >= nextWp.cost) {
      state.fragments -= nextWp.cost;
      state.currentWp = nextWp.lv;
      if (state.ownedWp.indexOf(nextWp.lv) === -1) state.ownedWp.push(nextWp.lv);
      setTimeout(confettiBurst, 100);
    } else {
      break;
    }
  }
}

function confettiBurst() {
  var colors = ["#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#c77dff","#ff9f1c","#00f5d4"];
  for (var i = 0; i < 50; i++) {
    (function(i) {
      var dot = document.createElement("div");
      var size = 4 + Math.random() * 8;
      var color = colors[Math.floor(Math.random() * colors.length)];
      var angle = Math.random() * Math.PI * 2;
      var dist = 60 + Math.random() * 200;
      var tx = Math.cos(angle) * dist;
      var ty = Math.sin(angle) * dist - 80;
      var duration = 0.8 + Math.random() * 1.0;
      var rotation = Math.random() * 720 - 360;
      var prefix = "cf" + Date.now();
      dot.style.cssText = [
        "position:fixed","top:50%","left:50%",
        "width:"+size+"px","height:"+size+"px","background:"+color,
        "border-radius:"+(Math.random()>0.5?"50%":"2px"),
        "pointer-events:none","z-index:99999",
        "transform:translate(-50%,-50%)",
        "animation:"+prefix+i+" "+duration+"s ease-out forwards"
      ].join(";");
      document.body.appendChild(dot);
      var st = document.createElement("style");
      st.textContent = "@keyframes "+prefix+i+" {0%{transform:translate(0,0) rotate(0deg);opacity:1}100%{transform:translate("+tx+"px,"+ty+"px) rotate("+rotation+"deg);opacity:0}}";
      document.head.appendChild(st);
      setTimeout(function() { dot.remove(); st.remove(); }, (duration + 0.3) * 1000);
    })(i);
  }
}

function showPage(page) {
  currentPage = page;
  var pages = ["home","tasks","weapons"];
  for (var i = 0; i < pages.length; i++) {
    var el = document.getElementById("page-" + pages[i]);
    if (el) el.style.display = pages[i] === page ? "block" : "none";
  }
  var btns = document.querySelectorAll(".nav-btn");
  for (var j = 0; j < btns.length; j++) {
    btns[j].classList.toggle("active", btns[j].dataset.page === page);
  }
  if (page === "home") renderHome();
  else if (page === "tasks") { taskView = "list"; renderTasks(); }
  else if (page === "weapons") renderWeapons();
}

function refreshDisplay() { renderHome(); }

function getCurrentWeapon() {
  var lv = state.currentWp || 1;
  return WEAPONS[lv - 1] || WEAPONS[0];
}

// ---- HOME ----
function renderHome() {
  var el = document.getElementById("home-content");
  if (!el) return;
  var wp = getCurrentWeapon();
  var nextWp = state.currentWp < 100 ? WEAPONS[state.currentWp] : null;
  var wp = getCurrentWeapon();
  var nextWp = wp.lv < 20 ? WEAPONS[wp.lv] : null;
  var fragNeeded = nextWp ? nextWp.cost : 0;
  var fragPct = fragNeeded > 0 ? Math.min((state.fragments / fragNeeded) * 100, 100) : 100;
  var xpPct = Math.min((state.xp / xpForLevel(state.level)) * 100, 100);
  var todayDone = 0;
  for (var i = 0; i < state.tasks.length; i++) {
    if (state.tasks[i].done && state.tasks[i].rating) todayDone++;
  }
  var pending = 0;
  for (var k = 0; k < state.tasks.length; k++) {
    if (state.tasks[k].done && !state.tasks[k].rating) pending++;
  }

  el.innerHTML =
    '<div class="home-name">你好，' + escHtml(state.name || "小勇士") + '！</div>' +
    '<div class="home-level">' +
      '<span class="lv-badge">&#9733; Lv.' + state.level + '</span>' +
      '<span class="streak-badge">&#128293; ' + state.streak + '天</span>' +
    '</div>' +
    '<div class="home-stats">' +
      '<div class="hs-card"><span class="hs-emoji">&#128176;</span><div class="hs-val">' + state.gold + '</div><div class="hs-label">金币</div></div>' +
      '<div class="hs-card"><span class="hs-emoji">&#9830;</span><div class="hs-val">' + state.fragments + '/10</div><div class="hs-label">碎片</div></div>' +
      '<div class="hs-card"><span class="hs-emoji">&#9989;</span><div class="hs-val">' + state.totalDone + '</div><div class="hs-label">已做完</div></div>' +
      '<div class="hs-card"><span class="hs-emoji">&#128203;</span><div class="hs-val">' + todayDone + '/' + state.tasks.length + '</div><div class="hs-label">今日</div></div>' +
    '</div>' +
    '<div class="home-wp">' +
      '<div class="wp-eyebrow">' + wp.e + ' ' + wp.tn + '</div>' +
      '<div class="wp-name">' + wp.n + '</div>' +
      '<div class="frag-bar-wrap">' +
        '<div class="frag-bar"><div class="frag-bar-fill" style="width:' + fragPct + '%"></div></div>' +
        '<div class="frag-hint">' + state.fragments + '/10 碎片 ' + (nextWp ? '&rarr; ' + nextWp.e + ' ' + nextWp.n : '&rarr; 已满级！') + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="xp-row">' +
      '<div class="xp-label">经验 ' + state.xp + '/' + xpForLevel(state.level) + '</div>' +
      '<div class="bar-bg"><div class="bar-fill xp-fill" style="width:' + xpPct + '%"></div></div>' +
    '</div>' +
    '<div class="cta-card" onclick="showPage(\'tasks\')">' +
      '<div class="cta-icon">&#128203;</div>' +
      '<div class="cta-body">' +
        '<div class="cta-title">今日任务 ' + todayDone + '/' + state.tasks.length + '</div>' +
        (pending > 0 ? '<div class="cta-warn">&#9203; ' + pending + '个待评分！</div>' : '<div class="cta-sub">点击去做任务</div>') +
      '</div>' +
      '<div class="cta-arrow">&rsaquo;</div>' +
    '</div>';
}

function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ---- TASKS ----
function renderTasks() {
  var el = document.getElementById("tasks-content");
  if (!el) return;

  if (taskView === "templates") {
    renderTemplates(el);
    return;
  }

  var tasks = state.tasks.slice().sort(function(a, b) {
    if (a.important !== b.important) return a.important ? -1 : 1;
    if (a.done !== b.done) return a.done ? 1 : -1;
    return 0;
  });

  var todayDone = 0;
  for (var i = 0; i < state.tasks.length; i++) {
    if (state.tasks[i].done && state.tasks[i].rating) todayDone++;
  }

  var html =
    '<div class="view-tabs">' +
      '<button class="tab-btn active" onclick="switchView(\'list\')">&#128203; 任务</button>' +
      '<button class="tab-btn" onclick="switchView(\'templates\')">&#128218; 模板</button>' +
    '</div>' +

    '<div class="icon-row">' +
      TASK_ICONS.map(function(ic) {
        return '<span class="ic-opt' + (selectedIcon === ic ? ' ic-sel' : '') + '" onclick="selectIcon(\'' + ic.replace(/\u/g,"\\u") + '\')">' + ic + '</span>';
      }).join("") +
    '</div>' +

    '<div class="add-row">' +
      '<input type="text" id="task-input" placeholder="输入任务，按回车添加..." ' +
        'maxlength="50" inputmode="text" enterkeyhint="done" autocomplete="off" ' +
        'onkeydown="if(event.key===\'Enter\')handleAddTask()" />' +
      '<button class="btn-add" onclick="handleAddTask()">&#10133;</button>' +
    '</div>' +

    '<div class="task-list">';

  if (tasks.length === 0) {
    html += '<div class="empty">还没有任务，添加一个吧！&#10024;</div>';
  } else {
    for (var j = 0; j < tasks.length; j++) {
      var t = tasks[j];
      html +=
        '<div class="task-item' + (t.done ? ' task-done' : '') + (t.important ? ' task-imp' : '') + '">' +
          '<div class="task-row">' +
            '<span class="tcheck" onclick="toggleTask(' + t.id + ')">' + (t.done ? '&#9989;' : '&#11036;') + '</span>' +
            '<span class="ticon">' + t.icon + '</span>' +
            '<span class="ttext' + (t.done ? ' tdone' : '') + '">' + escHtml(t.text) + '</span>' +
            '<span class="tstar" onclick="toggleImp(' + t.id + ')">' + (t.important ? '&#11088;' : '&#9734;') + '</span>' +
            '<span class="tdel" onclick="delTask(' + t.id + ')">&#128465;</span>' +
          '</div>' +
          (t.done ? (
            '<div class="rate-row">' +
              '<button class="rb' + (t.rating==='full'?' rb-on':'') + '" onclick="rateTask('+t.id+',\'full\')">&#11088;&#11088;&#11088;</button>' +
              '<button class="rb' + (t.rating==='partial'?' rb-half':'') + '" onclick="rateTask('+t.id+',\'partial\')">&#11088;&#11088;</button>' +
            '</div>' +
            (t.rating ? '<div class="rew-info">' +
              (t.rating==="full"?"+10&#128176; +5&#9733; +1&#9830;":t.rating==="partial"?"+6&#128176; +3&#9733;":"+0") +
            '</div>' : '')
          ) : '') +
        '</div>';
    }
  }

  html += '</div><div class="summary">今日完成 ' + todayDone + ' 个</div>';
  el.innerHTML = html;
}

function selectIcon(ic) { selectedIcon = ic; renderTasks(); }
function switchView(v) { taskView = v; renderTasks(); }

function handleAddTask() {
  var input = document.getElementById("task-input");
  if (!input || !input.value.trim()) return;
  addTask(input.value.trim(), selectedIcon);
  input.value = "";
}

function toggleImp(id) {
  for (var i = 0; i < state.tasks.length; i++) {
    if (state.tasks[i].id === id) {
      state.tasks[i].important = !state.tasks[i].important;
      break;
    }
  }
  save();
  renderTasks();
}

function delTask(id) {
  state.tasks = state.tasks.filter(function(t) { return t.id !== id; });
  save();
  renderTasks();
}

// ---- TEMPLATES ----
function renderTemplates(el) {
  var html =
    '<div class="view-tabs">' +
      '<button class="tab-btn" onclick="switchView(\'list\')">&#128203; 任务</button>' +
      '<button class="tab-btn active" onclick="switchView(\'templates\')">&#128218; 模板</button>' +
    '</div>';

  if (editingTemplateId !== null) {
    html += renderTemplateEditor();
  } else {
    html += '<button class="btn-new-tpl" onclick="newTemplate()">&#10133; 新建模板</button><div class="tpl-list">';
    if (state.templates.length === 0) {
      html += '<div class="empty">没有模板<br>比如创建一个"每天必做"模板<br>一次添加多个任务~</div>';
    } else {
      for (var i = 0; i < state.templates.length; i++) {
        var tmpl = state.templates[i];
        html +=
          '<div class="tpl-item">' +
            '<div class="tpl-head" onclick="toggleTpl(' + i + ')">' +
              '<span class="tpl-nm">' + escHtml(tmpl.name) + '</span>' +
              '<span class="tpl-ct">' + tmpl.tasks.length + '个任务</span>' +
              '<span class="tpl-chev" id="tc' + i + '">&rsaquo;</span>' +
            '</div>' +
            '<div class="tpl-body" id="tb' + i + '" style="display:none">' +
              '<div class="tpl-tasks">';
        for (var j = 0; j < tmpl.tasks.length; j++) {
          html += '<div class="tpl-t"><span>' + tmpl.tasks[j].icon + '</span><span>' + escHtml(tmpl.tasks[j].text) + '</span></div>';
        }
        html += '</div>' +
          '<div class="tpl-btns">' +
            '<button class="tplbtn tpl-use" onclick="useTemplate(' + i + ')">&#9654; 添加到今日</button>' +
            '<button class="tplbtn tpl-ed" onclick="editTemplate(' + i + ')">&#9998; 编辑</button>' +
            '<button class="tplbtn tpl-del" onclick="deleteTemplate(' + i + ')">&#128465; 删除</button>' +
          '</div>' +
        '</div></div>';
      }
    }
    html += '</div>';
  }
  el.innerHTML = html;
}

function toggleTpl(i) {
  var body = document.getElementById("tb" + i);
  var chev = document.getElementById("tc" + i);
  if (!body) return;
  var show = body.style.display === "none";
  body.style.display = show ? "block" : "none";
  if (chev) chev.innerHTML = show ? "&#9660;" : "&rsaquo;";
}

function newTemplate() { editingTemplateId = -1; renderTasks(); }
function editTemplate(i) { editingTemplateId = i; renderTasks(); }

function renderTemplateEditor() {
  var isNew = editingTemplateId === -1;
  var tmpl = isNew ? { name: "", tasks: [] } : state.templates[editingTemplateId];
  var tasks = tmpl.tasks || [];

  var rows = tasks.map(function(t, i) {
    var opts = TASK_ICONS.map(function(ic) {
      var sel = t.icon === ic ? ' selected' : '';
      return '<option value="' + ic + '"' + sel + '>' + ic + '</option>';
    }).join('');
    return '<div class="tpl-task-row">' +
      '<select class="tpl-sel" onchange="updateTplTask(' + i + ',\'icon\',this.value)">' + opts + '</select>' +
      '<input type="text" class="tpl-in" value="' + escHtml(t.text) + '" onchange="updateTplTask(' + i + ',\'text\',this.value)" />' +
      '<button class="tdel" onclick="removeTplTask(' + i + ')">&#128465;</button>' +
    '</div>';
  }).join('');

  return '<div class="tpl-editor">' +
    '<div class="tpl-name-row">' +
      '<input type="text" id="tpl-name" class="tpl-name-in" placeholder="模板名称..." value="' + escHtml(tmpl.name) + '" />' +
    '</div>' +
    '<div class="tpl-tasks-area">' + rows + '</div>' +
    '<button class="btn-add-task" onclick="addTplTask()">&#10133; 添加任务</button>' +
    '<div class="tpl-editor-btns">' +
      '<button class="tplbtn tpl-save" onclick="saveTemplate()">&#128190; 保存模板</button>' +
      '<button class="tplbtn tpl-cancel" onclick="cancelTemplate()">&#10006; 取消</button>' +
    '</div>' +
  '</div>';
}

function addTplTask() {
  var isNew = editingTemplateId === -1;
  if (isNew) {
    if (!window._tplDraft) window._tplDraft = { name: '', tasks: [] };
    var nameEl = document.getElementById('tpl-name');
    if (nameEl) window._tplDraft.name = nameEl.value;
    window._tplDraft.tasks.push({ icon: '\ud83d\udcdd', text: '' });
  } else {
    state.templates[editingTemplateId].tasks.push({ icon: '' + selectedIcon, text: '' });
  }
  var el = document.getElementById('tasks-content');
  if (el) el.innerHTML = renderTemplateEditor();
}

function updateTplTask(idx, field, val) {
  var isNew = editingTemplateId === -1;
  if (isNew) {
    if (!window._tplDraft) return;
    if (!window._tplDraft.tasks[idx]) window._tplDraft.tasks[idx] = {};
    window._tplDraft.tasks[idx][field] = val;
  } else {
    state.templates[editingTemplateId].tasks[idx][field] = val;
  }
}

function removeTplTask(idx) {
  var isNew = editingTemplateId === -1;
  if (isNew) {
    if (!window._tplDraft) return;
    window._tplDraft.tasks.splice(idx, 1);
  } else {
    state.templates[editingTemplateId].tasks.splice(idx, 1);
  }
  var el = document.getElementById('tasks-content');
  if (el) el.innerHTML = renderTemplateEditor();
}

function saveTemplate() {
  var isNew = editingTemplateId === -1;
  var nameEl = document.getElementById('tpl-name');
  var name = nameEl ? nameEl.value.trim() : '';
  if (!name) { alert('请输入模板名称！'); return; }
  var tasks;
  if (isNew) {
    if (window._tplDraft) {
      tasks = window._tplDraft.tasks.filter(function(t) { return t.text && t.text.trim(); });
    } else {
      tasks = [];
    }
  } else {
    tasks = state.templates[editingTemplateId].tasks.filter(function(t) { return t.text && t.text.trim(); });
  }
  if (tasks.length === 0) { alert('请至少添加一个任务！'); return; }
  var tmpl = { id: isNew ? Date.now() : state.templates[editingTemplateId].id, name: name, tasks: tasks };
  if (isNew) {
    state.templates.push(tmpl);
  } else {
    state.templates[editingTemplateId] = tmpl;
  }
  window._tplDraft = null;
  editingTemplateId = null;
  save();
  taskView = 'templates';
  renderTasks();
}

function cancelTemplate() {
  window._tplDraft = null;
  editingTemplateId = null;
  renderTasks();
}

function useTemplate(idx) {
  var tmpl = state.templates[idx];
  if (!tmpl || !tmpl.tasks.length) return;
  for (var i = 0; i < tmpl.tasks.length; i++) {
    addTask(tmpl.tasks[i].text, tmpl.tasks[i].icon);
  }
  taskView = 'list';
  renderTasks();
}

function deleteTemplate(idx) {
  if (!confirm('确定删除这个模板？')) return;
  state.templates.splice(idx, 1);
  save();
  renderTasks();
}

// ---- WEAPONS + ACHIEVEMENTS ----
function renderWeapons() {
  var el = document.getElementById('weapons-content');
  if (!el) return;
  var tiers = [
    { t:1,  n:'起始之枪',  e:'\ud83d\udd2b', c:'#6b7280' },
    { t:2,  n:'能量之枪',  e:'\u26a1',       c:'#fbbf24' },
    { t:3,  n:'烈焰之枪',  e:'\ud83d\udd25', c:'#ef4444' },
    { t:4,  n:'冰霜之枪',  e:'\u2744',       c:'#38bdf8' },
    { t:5,  n:'激光之枪',  e:'\ud83d\udca5', c:'#a855f7' },
    { t:6,  n:'暗黑之枪',  e:'\ud83c\udf11', c:'#4b5563' },
    { t:7,  n:'神圣之枪',  e:'\u2b50',       c:'#fcd34d' },
    { t:8,  n:'宇宙之枪',  e:'\ud83c\udf0c', c:'#818cf8' },
    { t:9,  n:'终极之枪',  e:'\ud83d\udc8e', c:'#06b6d4' },
    { t:10, n:'创世之枪',  e:'\ud83d\udc51', c:'#f97316' }
  ];
  var ms = [
    { chk:function(){return state.totalDone>=1},   ic:'\u2618',              lb:'初出茅庐',   ds:'完成第1个任务' },
    { chk:function(){return state.totalDone>=10},  ic:'\u2618',              lb:'小试牛刀',   ds:'完成10个任务' },
    { chk:function(){return state.totalDone>=50},  ic:'\u2618',              lb:'渐入佳境',   ds:'完成50个任务' },
    { chk:function(){return state.totalDone>=100}, ic:'\ud83c\udfc6',        lb:'百战百胜',   ds:'完成100个任务' },
    { chk:function(){return state.streak>=3},      ic:'\ud83d\udd25',        lb:'三日连击',   ds:'连续3天' },
    { chk:function(){return state.streak>=7},      ic:'\u26a1',              lb:'一周战神',   ds:'连续7天' },
    { chk:function(){return state.streak>=30},     ic:'\ud83d\udc51',        lb:'月冠军',     ds:'连续30天' },
    { chk:function(){return state.level>=5},       ic:'\u2605',              lb:'五星勇士',   ds:'达到5级' },
    { chk:function(){return state.level>=10},      ic:'\u2b50',              lb:'十级战神',   ds:'达到10级' },
    { chk:function(){return state.ownedWp.length>=10},  ic:'\ud83d\udd2b', lb:'小小收藏家', ds:'拥有10把武器' },
    { chk:function(){return state.ownedWp.length>=50},  ic:'\ud83c\udfb2', lb:'武器大师',   ds:'拥有50把武器' },
    { chk:function(){return state.ownedWp.length>=100}, ic:'\ud83d\udc51',lb:'终极收藏家', ds:'拥有全部武器' }
  ];
  var unlocked = ms.filter(function(m){ return m.chk(); });
  var html = '<div class="wp-section-title">\ud83d\udd2b 武器图鉴 ' + state.ownedWp.length + '/100</div>';
  html += '<div class="weapons-scroll">';
  tiers.forEach(function(tier){
    var wps = WEAPONS.filter(function(w){ return w.t === tier.t; });
    html += '<div class="tier-section">';
    html += '<div class="tier-header" style="border-left-color:' + tier.c + '">' + tier.e + ' ' + tier.n + '</div>';
    html += '<div class="wp-grid">';
    wps.forEach(function(w){
      var owned = state.ownedWp.indexOf(w.lv) !== -1;
      var cur = (state.currentWp||0)+1 === w.lv;
      var bgStyle = owned ? 'background:' + tier.c + '22;' : '';
      html += '<div class="wp-chip' + (cur?' wp-cur':'') + (owned?' wp-owned':'') + '" style="' + bgStyle + '">';
      html += '<div class="wp-emoji">' + (owned||cur?w.e:'&#128274;') + '</div>';
      html += '<div class="wp-ch-name">' + (owned||cur?escHtml(w.n):'???') + '</div>';
      html += '<div class="wp-ch-lv">Lv.' + w.lv + '</div>';
      if (cur) html += '<div class="wp-cur-badge">&#127919;</div>';
      html += '</div>';
    });
    html += '</div></div>';
  });
  html += '</div>';
  html += '<div class="ach-section">';
  html += '<div class="ach-title">\ud83c\udfc6 成就 ' + unlocked.length + '/' + ms.length + '</div>';
  ms.forEach(function(m){
    var ok = m.chk();
    html += '<div class="ach-item' + (ok?' ach-on':'') + '">';
    html += '<div class="ach-ic">' + (ok?m.ic:'&#128274;') + '</div>';
    html += '<div class="ach-info"><div class="ach-lb">' + (ok?escHtml(m.lb):'???') + '</div><div class="ach-ds">' + (ok?escHtml(m.ds):'未解锁') + '</div></div>';
    html += '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

function exportData() {
  var dataStr = JSON.stringify(state, null, 2);
  var blob = new Blob([dataStr], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'weaponquest_backup_' + todayStr() + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData(fileInput) {
  var file = fileInput.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var imported = JSON.parse(e.target.result);
      if (imported && typeof imported === 'object') {
        state.name=imported.name||'';state.gold=imported.gold||0;state.xp=imported.xp||0;
        state.level=imported.level||1;state.currentWp=imported.currentWp||0;state.fragments=imported.fragments||0;
        state.ownedWp=imported.ownedWp||[];state.streak=imported.streak||0;state.totalDone=imported.totalDone||0;
        state.lastDate=imported.lastDate||'';state.tasks=imported.tasks||[];state.history=imported.history||[];
        state.templates=imported.templates||[];state.createdAt=imported.createdAt||'';
        state.soundEnabled=imported.soundEnabled!==undefined?imported.soundEnabled:true;
        save(); refreshDisplay(); showPage('home');
        alert('\u2705 数据导入成功！');
      }
    } catch(err) { alert('\u274c 导入失败：' + err.message); }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm('\u26a0\ufe0f 确定重置？数据不可恢复！')) return;
  state = {name:'',gold:0,xp:0,level:1,currentWp:0,fragments:0,ownedWp:[],streak:0,totalDone:0,lastDate:'',tasks:[],history:[],templates:[],createdAt:new Date().toISOString(),soundEnabled:true};
  save();
  refreshDisplay(); showPage('home');
  openNameModal();
}

function toggleSettings() {
  var panel = document.getElementById('settings-panel');
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' || !panel.style.display ? 'block' : 'none';
}

function openNameModal() {
  var modal = document.getElementById('name-modal');
  if (!modal) return;
  var input = document.getElementById('name-input');
  if (input) input.value = state.name || '';
  modal.classList.add('show');
}

function closeNameModal() {
  var modal = document.getElementById('name-modal');
  if (modal) modal.classList.remove('show');
}

function saveName() {
  var input = document.getElementById('name-input');
  state.name = input ? (input.value.trim() || '\u5c0f\u52c7\u58eb') : '\u5c0f\u52c7\u58eb';
  if (!state.createdAt) state.createdAt = new Date().toISOString();
  save();
  closeNameModal();
  renderHome();
}

function doSetup() {
  var hasData = load();
  resetDailyTasks();
  if (!hasData || !state.name) { openNameModal(); }
  else { closeNameModal(); updateStreak(); showPage('home'); }
}

function initApp() { doSetup(); }

document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'hidden') save();
});
