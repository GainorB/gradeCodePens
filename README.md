## TO RUN

1.  npm i or npm install

## THEN

In Terminal

```javascript
node main.js grade
```

or

```javascript
node main.js g
```

or

need to run: `npm link` to set up a system link

```javascript
gradecodepens grade
```

## NEXT

1.  Insert the class number (ex: 503)
2.  Insert the name of the project you want to find. Case sensitive.
3.  Open found projects in new tabs? (Y/N)

## ./OUTPUT/

This folder will contain .json files corresponding to the classes you searched for, in the following format: [CLASS NUMBER]-[DATE].json.

Sample structure:

```javascript
   {
      "link": "https://codepen.io/ANUR2021/pen/MGBEgM",
      "student": "ANUR2021",
      "screenshot": "http://codepen.io/ANUR2021/pen/MGBEgM/image/large.png"
   },
```

## STATS

1.  **NUMBER OF STUDENTS IN CLASS:** total number of scholars in class
2.  **NUMBER OF FOUND PROJECTS:** total number of projects from that class that match the project you searched for
3.  **NUMBER OF INCORRECTLY NAMED PROJECTS (NOT FOUND):** total number of scholars who incorrectly named the project
4.  **STUDENTS WHO DIDN'T NAME PROJECT CORRECTLY:** names of scholars who didn't name project correctly
5.  **NUMBER OF REJECTED REQUESTS:** total number of scholars who don't have any saved codePens
6.  **REJECTED REQUESTS:** names of scholars who don't have any saved codePens
