const router = require('express').Router();
const fs = require('fs');
const sqlite = require('sqlite3');
const d3_module = import('d3');

const db = new sqlite.Database('db.sqlite3', (err) => {
	if (err) {
		console.log(err.message);
	} else {
		console.log('Connected.');
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
					mark1: studentData[i]['الدرجة (1)'],
					mark2: studentData[i]['الدرجة (2)'],
					mark3: studentData[i]['الدرجة (3)'],
					mark4: studentData[i]['الدرجة (4)'],
					markf: studentData[i]['المعدل'],
				});
			}
		}
	}
	res.status(200).json(courses);
});

router.get('/show-message/:id', (req, res) => {
	db.get(`SELECT * FROM message WHERE receiver='${req.params.id}'`,
		(err, row) => {
			if (err) {
				res.status(500).json(err.message);
			} else if (row) {
				res.status(200).json(row);
			} else {
				res.status(404).json('No messages');
			}
		});
});

router.delete('/delete-message/:id', (req, res) => {
	db.run(`DELETE FROM message WHERE receiver='${req.params.id}'`,
		(err) => {
			if (err) {
				res.status(500).json(err.message);
			} else {
				res.status(200).json('Message ended.');
			}
		});
});

module.exports = router;