const router = require('express').Router();
const fs = require('fs');
const d3_module = import('d3');

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
router.get('/doctor/:name', (req, res) => {
	res.sendFile('pages/courses.html', {root: '.'});
});

router.get('/course/:id', (req, res) => {
	res.sendFile('pages/course-details.html', {root: '.'});
});

router.get('/login', (req, res) => {
	res.sendFile('pages/login-doctor.html', {root: '.'});
});

// API
router.post('/login', async (req, res) => {
	let doctor = null;
	const data = await doctorPromise;
	for (var i = data.length - 1; i >= 0; i--) {
		if (data[i]['المدرس'] === req.body.name && data[i]['Password'] === req.body.password) {
			doctor = data[i];
		}
	}
	if (doctor) {
		res.status(202).json('Doctor has been logged in.');
	} else {
		res.status(401).json('Sorry, You are not a doctor in UOK.');
	}
});

router.get('/details/:name', async (req, res) => {
	const doctorData = await doctorPromise;
	let doctors = [];
	for (var i = doctorData.length - 1; i >= 0; i--) {
		if (doctorData[i]['المدرس'] === req.params.name) {
			delete doctorData[i]['Password'];
			doctors.push(doctorData[i]);
		}
	}
	res.status(200).json(doctors);
});

router.get('/courses/:id', async (req, res) => {
	const studentData = await studentPromise;
	let students = [];
	for (var i = studentData.length - 1; i >= 0; i--) {
		if (studentData[i]['Course #'] === req.params.id) {
			const student = studentData[i];
			delete student['Password'];
			students.push(student);
		}
	}
	res.status(200).json(students);
});

router.post('/attendance/:id', async (req, res) => {
	const attendPromise = new Promise((resolve, reject) => {
		d3_module.then((d3) => {
			fs.readFile(`./requirement/attendance/${req.params.id}.csv`,
				'utf-8', (err, data) => {
				if (err) {
					reject(err);
				} else {
					data = d3.csvParse(data);
					resolve(data);
				}
			});
		});
	});
	const attendData = await attendPromise;
	let data = [];
	const keys = Object.keys(attendData[0]);
	const name = keys[keys.length - 1],
	id = keys[keys.length - 2];
	for (var i = attendData.length - 1; i >= 0; i--) {
		for (var j = req.body.length - 1; j >= 0; j--) {
			if (attendData[i][name] === req.body[j]['name'] && attendData[i][id] === req.body[j]['id']) {
				data.push(attendData[i]);
			}
		}
	}
	res.status(200).json(data);
});

router.post('/write-marks', async (req, res) => {
	const studentData = await studentPromise;
	for (var i = studentData.length - 1; i >= 0; i--) {
		if (studentData[i]['Course #'] === req.body.course) {
			for (var j = req.body.rows.length - 1; j >= 0; j--) {
				if (req.body.rows[j]['id'] === studentData[i]['ID']) {
					studentData[i] = {
						...studentData[i],
						'الدرجة (1)': req.body.rows[j]['mark1'],
						'الدرجة (2)': req.body.rows[j]['mark2'],
						'الدرجة (3)': req.body.rows[j]['mark3'],
						'الدرجة (4)': req.body.rows[j]['mark4'],
						'المعدل': req.body.rows[j]['markf']
					};
				}
			}
		}
	}
	d3_module.then((d3) => {
		const data = d3.csvFormat(studentData);
		fs.writeFile('./requirement/student.csv', data, 'utf-8', (err) => {
			if (err) {
				res.status(500).json(err.message);
			} else {
				res.status(200).json('Changes applied successfully.');
			}
		});
	});
});

router.post('/write-attends', async (req, res) => {
	d3_module.then((d3) => {
		const data = d3.csvFormat(req.body.rows);
		fs.writeFile(`./requirement/attendance/${req.body.course}.csv`,
			data, 'utf8', (err) => {
			if (err) {
				res.status(500).json(err.message);
			} else {
				res.status(200).json('Changes applied successfully.');
			}
		});
	});
});

module.exports = router;