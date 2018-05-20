#!/usr/bin/env node

const axios = require('axios');
const json2xls = require('json2xls');
const fs = require('fs');
const chalk = require('chalk');
const { prompt } = require('inquirer');
const program = require('commander');
const moment = require('moment');
const opn = require('opn');

const { log } = console;
// OBJECT CONTAINING ARRAYS OF STUDENTS
let allStudents;

// USED FOR CALLBACK
let counter;
// USED TO FILTER
// THE NAME OF THE ASSIGNMENT YOU WANT TO GRAB FROM EACH STUDENTS CODEPENS
let theKeyword;

// ARRAY OF QUESTIONS TO ASK USER
const questions = [
  { type: 'input', name: 'classNumber', message: 'Which class (#)?' },
  { type: 'input', name: 'keyword', message: 'Name of the project?' },
  { type: 'input', name: 'openTabs', message: 'Open found projects in new tabs? (Y/N)' },
  { type: 'input', name: 'jsonOrExcel', message: 'Create spreadsheet? (Y/N)' },
];

// ERROR HANDLER
function handleErrors(text, err) {
  return log(chalk.red(`${text} ${err}`));
}

try {
  allStudents = {
    501: require('./students/501.json'),
    502: require('./students/502.json'),
    503: require('./students/503.json'),
    601: require('./students/601.json'),
    602: require('./students/602.json'),
    603: require('./students/603.json'),
    701: require('./students/701.json'),
    702: require('./students/702.json'),
    703: require('./students/703.json'),
    801: require('./students/801.json'),
    802: require('./students/802.json'),
    803: require('./students/803.json'),
  };
} catch (e) {
  return handleErrors('', e.message);
}

// IF PROJECT IS FOUND INSERT INTO THIS ARRAY
const FOUNDPROJECTS = [];

// NUMBER OF FAILED PROJECTS
let FAILEDPROJECTS = 0;
const FAILEDSTUDENTS = [];

// NUMBER OF REJECTED REQUESTS (STUDENTS)
let REJECTED = 0;
const REJECTEDSTUDENTS = [];

// FORMAT DATE TO APPEND TO FILE CREATED
function date() {
  return moment().format('MM[-]DD[-]YYYY');
}

// FETCH HTML
function downloadHTML({ html }) {
  return axios.get(html, {
    timeout: 10000,
  });
}

// FETCH CSS
function downloadCSS({ css }) {
  return axios.get(css, {
    timeout: 10000,
  });
}

// PARSE AND FILTER DATA FROM API
function codePen({ data, username, openTabs, classNumber, niceName }) {
  // FILTER ARRAY OF PENS TO GET SPECIFIC PROJECT
  if (data !== undefined) {
    const project = data.filter(pen => pen.title === theKeyword).map(pen => ({
      student: username,
      link: pen.link,
      html: `${pen.link}.html`,
      css: `${pen.link}.css`,
    }))[0];

    if (project !== undefined) {
      FOUNDPROJECTS.push(project);
      if (openTabs.toLowerCase() === 'y') {
        // OPEN PROJECT LINK IN NEW TAB IN DEFAULT BROWSER
        opn(project.link, { wait: false });
      }

      // CREATE OUTPUT FOLDER IF IT DOESN'T EXIST
      if (!fs.existsSync('output')) {
        fs.mkdirSync('output');
      }

      const folderName = `${classNumber}-${date()}`;

      if (!fs.existsSync(`output/${folderName}`)) {
        fs.mkdirSync(`output/${folderName}`);
      }

      axios
        .all([downloadHTML(project), downloadCSS(project)])
        .then(
          axios.spread((html, css) => {
            if (!fs.existsSync(`output/${folderName}/${niceName}`)) {
              fs.mkdirSync(`output/${folderName}/${niceName}`);
            }
            fs.writeFileSync(`./output/${folderName}/${niceName}/${niceName}.html`, html.data);
            fs.writeFileSync(`./output/${folderName}/${niceName}/${niceName}.css`, css.data);
          })
        )
        .catch(err => handleErrors('', err));
    } else {
      FAILEDPROJECTS += 1;
      FAILEDSTUDENTS.push(username);
    }
  } else {
    REJECTED += 1;
    REJECTEDSTUDENTS.push(username);
  }
}

// STATS PRINTED TO CONSOLE
function stats(students, classNumber, jsonOrExcel) {
  log(chalk.green(`------------------------------`));
  log(chalk.green(`${classNumber} INFORMATION`));
  log(chalk.green(`------------------------------`));
  log(chalk.magenta(`# OF STUDENTS IN CLASS: `), students.length);
  log(chalk.magenta(`# OF FOUND PROJECTS: `), FOUNDPROJECTS.length);

  if (FAILEDPROJECTS > 0) {
    log(chalk.magenta(`# OF INCORRECTLY NAMED PROJECTS: `), FAILEDPROJECTS);
    log(chalk.magenta(`STUDENTS WHO DIDN'T NAME PROJECT CORRECTLY: `), FAILEDSTUDENTS);
  }

  if (REJECTED > 0) {
    log(chalk.magenta(`# OF REJECTED REQUESTS: `), REJECTED);
    log(chalk.magenta(`REJECTED REQUESTS: `), REJECTEDSTUDENTS);
  }
  log(chalk.green(`------------------------------`));

  // CREATE A EXCELL FILE
  if (jsonOrExcel.toLowerCase() === 'y') {
    const xls = json2xls(FOUNDPROJECTS);
    const folderName = `${classNumber}-${date()}`;
    fs.writeFile(`./output/${folderName}/projects.xlsx`, xls, 'binary', err => {
      if (err) handleErrors('', err);
      log(`Spreadsheet created.`);
    });
  }
}

// GET ALL PENS BY USERNAME
function getPens(username) {
  return axios.get(`https://cpv2api.com/pens/public/${username}`, {
    timeout: 10000,
  });
}

// GET ACTUAL NAME OF USERNAME
function getNiceName(username) {
  return axios.get(`https://cpv2api.com/profile/${username}`, {
    timeout: 10000,
  });
}

// GO
function go({ classNumber, keyword, openTabs, jsonOrExcel }) {
  // SELECTED CLASS
  const students = allStudents[classNumber];
  // DETERMINES WHEN THE CALLBACK IS CALLED
  counter = students.length;

  // KEYWORD TO SEARCH FOR
  theKeyword = keyword;

  // LOOP THROUGH STUDENTS AND HIT API
  students.forEach(name => {
    axios
      .all([getPens(name), getNiceName(name)])
      .then(
        axios.spread((pens, names) => {
          codePen({ data: pens.data.data, username: name, openTabs, classNumber, niceName: names.data.data.nicename });
          counter -= 1;
          if (counter === 0) {
            stats(students, classNumber, jsonOrExcel);
          }
        })
      )
      .catch(err => handleErrors('', err));
  });
}

program.version('1.0.0').description('Searches student codePen accounts for a specific assignment.');

program
  .command('grade')
  .alias('g')
  .action(() => {
    prompt(questions)
      .then(answers => {
        go({ classNumber: Number(answers.classNumber), ...answers });
      })
      .catch(err => handleErrors(`Error receiving input, try again.`, err));
  });

program.parse(process.argv);
