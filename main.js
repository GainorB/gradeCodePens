#!/usr/bin/env node

const axios = require('axios');
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

// TODO: Get HTML/CSS content from codePen
// TODO: Possibly connect to Remind API (if one exists) to automatically alert parents, etc..
// TODO: Possibly export to Excel or Google Sheets?
// TODO: Possibly..

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
  return moment().format('M[-]D[-]YYYY [at] h:mm:ss');
}

// PARSE AND FILTER DATA FROM API
function codePen({ data, username, openTabs }) {
  // FILTER ARRAY OF PENS TO GET SPECIFIC PROJECT
  if (data !== undefined) {
    const project = data.filter(pen => pen.title === theKeyword).map(pen => ({
      link: pen.link,
      student: pen.user.username,
      screenshot: pen.images.large,
    }))[0];

    if (project !== undefined) {
      FOUNDPROJECTS.push(project);
      if (openTabs.toLowerCase() === 'y') {
        // OPEN PROJECT LINK IN NEW TAB IN DEFAULT BROWSER
        opn(project.link, { wait: false });
      }
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
function stats(students, classNumber) {
  log(chalk.green(`------------------------------`));
  log(chalk.green(`${classNumber} STATS`));
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

  // CREATE OUTPUT FOLDER IF IT DOESN'T EXIST
  if (!fs.existsSync('output')) {
    fs.mkdirSync('output');
  }

  // CREATE FILE
  fs.writeFile(`./output/${classNumber}-${date()}.json`, JSON.stringify(FOUNDPROJECTS, null, 2), err => {
    if (err) handleErrors('', err);
    log(`${classNumber}-${date()}.json created successfully`);
  });
}

// GO
function go({ classNumber, keyword, openTabs }) {
  // SELECTED CLASS
  const students = allStudents[classNumber];
  // DETERMINES WHEN THE CALLBACK IS CALLED
  counter = students.length;

  // KEYWORD TO SEARCH FOR
  theKeyword = keyword;

  // LOOP THROUGH STUDENTS AND HIT API
  students.forEach(name => {
    axios
      .get(`https://cpv2api.com/pens/public/${name}`, {
        timeout: 10000,
      })
      .then(res => {
        const username = res.request._redirectable._options.pathname.split('/')[3];
        codePen({ data: res.data.data, username, openTabs });
        counter -= 1;
        if (counter === 0) {
          stats(students, classNumber);
        }
      })
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
