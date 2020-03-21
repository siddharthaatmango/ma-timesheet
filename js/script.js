const {
  ipcRenderer,
  shell
} = require('electron');
const con = require('electron').remote.getGlobal('console');
const moment = require('moment');
const path = require('path');

const result = require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
if (result.error) {
  throw result.error
}


// Your mangoapps creds, use the login api to get these
const domainUrl = process.env.domainUrl;
const sessionId = process.env.sessionId;
const sessionHash = process.env.sessionHash;
const userId = process.env.userId;
const teamId = process.env.teamId;


const setUpUi = () => {
  $("#taskListRefreshBtn").on('click', () => {
    getTasks();
  });
  getTasks();
}

const handleTaskClicks = () => {
  $(".taskUpdateBtn").off('click').on('click', (e) => {
    updateTask(e.target.dataset.id);
  })
}

const updateTimeLog = (id) => {
  const t = window.tasks[id];

  const startTime = t.restarted_on ? t.restarted_on : t.started_on;
  const endTime = parseInt((new Date().getTime() / 1000));

  const t1 = moment.unix(startTime);
  const t2 = moment.unix(endTime);
  const diff = t2.diff(t1, 'minutes');

  let hours = Math.floor(diff / 60);
  let minutes = diff % 60;

  //currently mangoapps only support upto 24 hours and in an interval of 15 min
  if (hours > 23) {
    minutes = 59;
    hours = 23;
  } else {
    if (minutes > 45) {
      minutes = 0;
      hours = hours + 1;
    }
    else if (minutes > 30) minutes = 45;
    else if (minutes > 15) minutes = 30;
    else if (minutes > 0) minutes = 15;
  }
  if (hours < 1 && minutes < 1) minutes = 15;

  const formattedTime = `${("0" + hours).slice(-2)}:${("0" + minutes).slice(-2)}`;

  const headers = new Headers({
    Accept: 'application/json',
    _felix_session_id: sessionId
  });
  headers.append('Content-Type', 'application/json');

  const url = 'https://' + domainUrl + '/api/time_logs.json?_token=' + sessionId + '&_secret=' + sessionHash + '&_user_id=' + userId;

  const reqBody = {
    ms_request: {
      project: {
        parent: "projects",
        parent_id: teamId,
        time_log: {
          date: moment().format("DD/MM/YYYY"),
          time_str: formattedTime,
          task_id: t.id,
          for_whom: t.name,
          doing_what: "From MangoApps Timesheet App",
          is_billable: true
        }
      }
    }
  }

  const req = {
    method: 'POST',
    headers: headers,
    credentials: 'omit',
    body: JSON.stringify(reqBody)
  };

  fetch(url, req)
    .then(handleResponse)
    .then(resp => {

    }).catch(function (err) {
      console.log(err);
    });
}

const updateTask = (id) => {
  const t = window.tasks[id];

  const headers = new Headers({
    Accept: 'application/json',
    _felix_session_id: sessionId
  });
  headers.append('Content-Type', 'application/json');

  const url = 'https://' + domainUrl + '/api/tasks/' + id + '/lifecycle.json?_token=' + sessionId + '&_secret=' + sessionHash + '&_user_id=' + userId;

  const nextAction = Array.isArray(t.next_actions.action) ? t.next_actions.action[0] : t.next_actions.action;

  const reqBody = {
    ms_request: {
      task: {
        action: nextAction
      }
    }
  }

  const req = {
    method: 'PUT',
    headers: headers,
    credentials: 'omit',
    body: JSON.stringify(reqBody)
  };

  const doTimeLog = (t.status == "Started") ? true : false;

  fetch(url, req)
    .then(handleResponse)
    .then(resp => {
      $("#taskLi_" + id).replaceWith(getTaskTemplate(resp.task));
      handleTaskClicks();

      if (doTimeLog) updateTimeLog(id);

    }).catch(function (err) {
      console.log(err);
    });
};

const getTasks = () => {
  $("#taskListUl").html("");

  const headers = new Headers({
    Accept: 'application/json',
    _felix_session_id: sessionId
  });
  headers.append('Content-Type', 'application/json');

  const url = 'https://' + domainUrl + '/api/tasks.json?filter=My_Pending_Tasks&project_id=' + teamId + '&_token=' + sessionId + '&_secret=' + sessionHash + '&_user_id=' + userId;

  const req = {
    method: 'GET',
    headers: headers,
    credentials: 'omit'
  };

  fetch(url, req)
    .then(handleResponse)
    .then(resp => {
      window.tasks = {};
      for (const t of resp.tasks.task) {
        $("#taskListUl").append(getTaskTemplate(t));
      }
      handleTaskClicks();
    }).catch(function (err) {
      console.log(err);
    });
}

const getTaskTemplate = (t) => {
  window.tasks[t.id] = t;

  const mst = t.milestone_name ? t.milestone_name : '--';

  const nextAction = Array.isArray(t.next_actions.action) ? t.next_actions.action[0] : t.next_actions.action;

  let btn = '';
  if (nextAction == "Start")
    btn = '<button class="btn btn-mini btn-primary taskUpdateBtn" data-id="' + t.id + '">Start</button>';
  else if (nextAction == "Restart")
    btn = '<button class="btn btn-mini btn-warning taskUpdateBtn" data-id="' + t.id + '">Restart</button>';
  else if (nextAction == "Finish")
    btn = '<button class="btn btn-mini btn-positive taskUpdateBtn" data-id="' + t.id + '">Finish</button>';
  else
    btn = '<button class="btn btn-mini btn-default taskUpdateBtn" data-id="' + t.id + '">' + nextAction + '</button>';

  return '\n' +
    '<li class="list-group-item" id="taskLi_' + t.id + '">' +
    '<div class="media-body">' +
    '<strong>Milestone: ' + mst + '</strong>' +
    '<p>' + t.name + '</p>' +
    btn +
    '</div>' +
    '</li>';
}

const handleResponse = (response) => {
  return response.text().then(text => {
    const data = text && JSON.parse(text);
    return data.ms_response;
  });
}

document.addEventListener('DOMContentLoaded', setUpUi);