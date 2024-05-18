const router = require('express').Router();
const fs = require('fs');
const sqlite = require('sqlite3');
const d3_module = import('d3');

const db = new sqlite.Database('db.sqlite3', (err) => {
	if (err) {
		console.log(err.message);
	} else {
		console.log('[STUDENT] Connected.');
	}
});

const doctorPromise = new Promise((resolve, reject) => {
	d3_module.then((d3) => {
		fs.readFile('./requirement/doctor.csv', 'utf-8', (err, data) => {
			if (err) {
				reject(err);
			} else {
				data = d3.csvParse(data);
				resolve(data);
			}
		});
	});
});

const advisorPromise = new Promise((resolve, reject) => {
	d3_module.then((d3) => {
		fs.readFile('./requirement/advisor.csv', 'utf-8', (err, data) => {
			if (err) {
				reject(err);
			} else {
				data = d3.csvParse(data);
				resolve(data);
			}
		});
	});
});


const studentPromise = new Promise((resolve, reject) => {
	d3_module.then((d3) => {
		fs.readFile('./requirement/student.csv', 'utf-8', (err, data) => {
			if (err) {
				reject(err);
			} else {
				data = d3.csvParse(data);
				resolve(data);
			}
		});
	});
});

// PAGES
router.get('/student/:id', (req, res) => {
	res.sendFile('pages/student-details.html', {root: '.'});
});
router.get('/login', (req, res) => {
	res.sendFile('pages/login-student.html', {root: '.'});
});

// API
router.post('/login', async (req, res) => {
	let student = null;
	const data = await studentPromise;
	for (var i = data.length - 1; i >= 0; i--) {
		if (data[i]['ID'] === req.body.number && data[i]['Password'] === req.body.password) {
			student = data[i];
		}
	}
	if (student) {
		res.status(202).json('Student has been logged in.');
	} else {
		res.status(401).json('Sorry, You are not a student in UOK.');
	}
});

router.get('/details/:id', async (req, res) => {
	const studentData = await studentPromise;
	const doctorData = await doctorPromise;
	let courses = [];
	for (var i = studentData.length - 1; i >= 0; i--) {
		for (var j = doctorData.length - 1; j >= 0; j--) {
			if (studentData[i]['ID'] === req.params.id && doctorData[j][
				Object.keys(doctorData[j])[0]] === studentData[i]['Course #']) {
				courses.push({
					ID: studentData[i]['ID'],
					name: studentData[i]['الاسم'],
					lec: studentData[i]['Lec #'],
					lab: studentData[i]['Lab #'],
					courseId: studentData[i]['Course #'],
					courseTitle: doctorData[j]['المادة'],
					day: doctorData[j]['اليوم'],
					time: doctorData[j]['التوقيت'],
					hall: doctorData[j]['القاعة'],
					mark1: parseFloat(studentData[i]['درجة (1) نظري']) + parseFloat(studentData[i]['درجة (1) عملي']) || '',
					mark2: parseFloat(studentData[i]['درجة (2) نظري']) + parseFloat(studentData[i]['درجة (2) عملي']) || '',
					mark3: parseFloat(studentData[i]['درجة (3) نظري']) + parseFloat(studentData[i]['درجة (3) عملي']) || '',
					mark4: parseFloat(studentData[i]['درجة (4) نظري']) + parseFloat(studentData[i]['درجة (4) عملي']) || '',
					markf: parseFloat(studentData[i]['المعدل نظري']) + parseFloat(studentData[i]['المعدل عملي']) || '',
				});
			}
		}
	}
	res.status(200).json(courses);
});

router.get('/advisor-name/:id', async (req, res) => {
	const advisorData = await advisorPromise;
	let name = '';
	for (var i = advisorData.length - 1; i >= 0; i--) {
		if (advisorData[i]['ID'] === req.params.id) {
			name = advisorData[i]['المرشد'];
		}
	}
	res.status(200).json(name);
});

router.get('/show-message/:name', (req, res) => {
	db.get(`SELECT * FROM message WHERE receiver='${req.params.name}'
		AND shown=FALSE`,
		(err, row) => {
			if (err) {
				res.status(500).json(err.message);
			} else if (row) {
				res.status(200).json(row);
			} else {
				res.status(200).json('No messages');
			}
		});
});

router.get('/dean-messages', (req, res) => {
	db.all('SELECT * FROM message WHERE rate>=15 ORDER BY rate', (err, rows) => {
		if (err) {
			res.status(200).json(err.message);
		} else {
			res.status(200).json(rows);
		}
	});
});

router.get('/head-messages', (req, res) => {
	db.all('SELECT * FROM message ORDER BY time', (err, rows) => {
		if (err) {
			res.status(200).json(err.message);
		} else {
			res.status(200).json(rows);
		}
	});
});

router.get('/hide-message/:msgId', (req, res) => {
	db.run(`UPDATE message SET shown=TRUE WHERE
		id='${req.params.msgId}'`,
		(err) => {
			if (err) {
				res.status(500).json(err.message);
			} else {
				res.status(200).json('Message ended.');
			}
		});
});

router.get('/head-data', async (req, res) => {
	const advisorData = await advisorPromise;
	let rows = [];
	for (var i = advisorData.length - 1; i >= 0; i--) {
		const element = rows.find((value) => {
			if (value['الاسم'] === advisorData[i]['الاسم']) {
				return value;
			}
		});

		if (!element) {
			const { Password: password, ...row } = advisorData[i];
			rows.push({
				...row,
				remainHours: 172 - row['Cum Pass Crd']
			});
		}
	}
	res.status(200).json(rows);
});

router.post('/dean-deprivation', async (req, res) => {
	const studentData = await studentPromise;
	let students = [];
	for (var i = studentData.length - 1; i >= 0; i--) {
		students.push(studentData[i]['الاسم']);
	}
	db.all(`SELECT DISTINCT sender, receiver
		FROM message WHERE rate >= ${req.body.rate}`, (err, rows) => {
			if (err) {
				res.status(500).json(err.message);
			} else {
				let deprivated = [];
				for (var i = rows.length - 1; i >= 0; i--) {
					if (students.includes(rows[i].sender)) {
						deprivated.push(rows[i].sender);
					} else {
						deprivated.push(rows[i].receiver);
					}
				}
				res.status(200).json([...new Set(deprivated)]);
			}
		});
});

module.exports = router;