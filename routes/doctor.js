const router = require('express').Router();
const fs = require('fs');
const sqlite = require('sqlite3');
const d3_module = import('d3');

const db = new sqlite.Database('db.sqlite3', (err) => {
	if (err) {
		console.log(err.message);
	} else {
		db.run(`CREATE TABLE IF NOT EXISTS message (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			content VARCHAR(255),
			sender VARCHAR(63),
			receiver VARCHAR(63),
			time TEXT DEFAULT CURRENT_TIMESTAMP,
			shown BOOLEAN DEFAULT FALSE,
			rate INT DEFAULT 0
		)`, (error) => {
			if (error) {
				console.log(error.message);
			} else {
				console.log('[DOCTOR] Connected.');
			}
		});
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
			const { Password: password, ...doctor } = doctorData[i];
			doctors.push(doctor);
		}
	}
	res.status(200).json(doctors);
});

router.get('/courses/:id', async (req, res) => {
	const studentData = await studentPromise;
	let students = [];
	for (var i = studentData.length - 1; i >= 0; i--) {
		if (studentData[i]['Course #'] === req.params.id) {
			const { Password: password, ...student} = studentData[i];
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
	for (var i = attendData.length - 1; i >= 0; i--) {
		for (var j = req.body.length - 1; j >= 0; j--) {
			if (attendData[i]['الاسم'] === req.body[j]['name']
				&& attendData[i][Object.keys(attendData[i])[0]] === req.body[j]['id']) {
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
						['درجة (1) ' + req.body.type]: req.body.rows[j]['mark1'],
						['درجة (2) ' + req.body.type]: req.body.rows[j]['mark2'],
						['درجة (3) ' + req.body.type]: req.body.rows[j]['mark3'],
						['درجة (4) ' + req.body.type]: req.body.rows[j]['mark4'],
						['المعدل ' + req.body.type]: req.body.rows[j]['markf']
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
	const attendPromise = new Promise((resolve, reject) => {
		d3_module.then((d3) => {
			fs.readFile(`./requirement/attendance/${req.body.course}.csv`,
				'utf-8', (err, data) => {
				if (err) {
					reject(err);
				} else {
					data = d3.csvParse(data);
					resolve(data);
				}
			});
		});
	}),
	attendData = await attendPromise;
	if (attendData.length > 0) {
		for (var j = req.body.rows.length - 1; j >= 0; j--) {
			for (var i = attendData.length - 1; i >= 0; i--) {
				if (req.body.rows[j]['الاسم'] === attendData[i]['الاسم']
					&& req.body.rows[j]['الرقم'] === attendData[i][
						Object.keys(attendData[i])[0]]) {
					attendData[i] = {
						...attendData[i],
						...req.body.rows[j]
					};
					let rate = 0;
					const keys = Object.keys(attendData[i]);
					for (var k = keys.length - 1; k >= 0; k--) {
						if (attendData[i][keys[k]] === 'غ') {
							if (keys[k].includes('عملي')) {
								rate += 2;
							} else {
								rate += 4;
							}
						}
					}
					attendData[i]['النسبة'] = rate;
					if (rate > 12) {
						const advisorData = await advisorPromise,
						content = `Your student ${
							req.body.rows[j]['الاسم']} has an attendance rate of ${rate}.`,
						sender = req.body.rows[j]['الاسم'];
						let receiver = '';
						for (var i = advisorData.length - 1; i >= 0; i--) {
							if (req.body.rows[j]['الرقم'] === advisorData[i]['ID']
								&& req.body.rows[j]['الاسم'] === advisorData[i]['الاسم']) {
								receiver = advisorData[i]['المرشد'];
							}
						}
						db.run(`INSERT INTO message (content, sender, receiver, rate)
							VALUES (
							'${content}', '${sender}', '${receiver}', '${rate}')`,
							(err) => {
							if (err) {
								res.status(500).json(err.message);
							}
						});
					}
				} else {
					for (var j = req.body.rows.length - 1; j >= 0; j--) {
						let rate = 0;
						const keys = Object.keys(req.body.rows[j]);
						for (var k = keys.length - 1; k >= 0; k--) {
							if (req.body.rows[j][keys[k]] === 'غ') {
								if (keys[k].includes('عملي')) {
									rate += 2;
								} else {
									rate += 4;
								}
							}
						}
						attendData.push({...req.body.rows[j], 'النسبة': rate});
						if (rate > 12) {
							const advisorData = await advisorPromise,
							content = `Your student ${
								req.body.rows[j]['الاسم']} has an attendance rate of ${rate}.`,
							sender = req.body.rows[j]['الاسم'];
							let receiver = '';
							for (var i = advisorData.length - 1; i >= 0; i--) {
								if (req.body.rows[j]['الرقم'] === advisorData[i]['ID']
									&& req.body.rows[j]['الاسم'] === advisorData[i]['الاسم']) {
									receiver = advisorData[i]['المرشد'];
								}
							}
							db.run(`INSERT INTO message (content, sender, receiver, rate)
								VALUES (
								'${content}', '${sender}', '${receiver}', '${rate}')`,
								(err) => {
								if (err) {
									res.status(500).json(err.message);
								}
							});
						}
					}
				}
			}
		}
	} else {
		for (var j = req.body.rows.length - 1; j >= 0; j--) {
			let rate = 0;
			const keys = Object.keys(req.body.rows[j]);
			for (var k = keys.length - 1; k >= 0; k--) {
				if (req.body.rows[j][keys[k]] === 'غ') {
					if (keys[k].includes('عملي')) {
						rate += 2;
					} else {
						rate += 4;
					}
				}
			}
			attendData.push({...req.body.rows[j], 'النسبة': rate});
			if (rate > 12) {
				const advisorData = await advisorPromise,
				content = `Your student ${
					req.body.rows[j]['الاسم']} has an attendance rate of ${rate}.`,
				sender = req.body.rows[j]['الاسم'];
				let receiver = '';
				for (var i = advisorData.length - 1; i >= 0; i--) {
					if (req.body.rows[j]['الرقم'] === advisorData[i]['ID']
						&& req.body.rows[j]['الاسم'] === advisorData[i]['الاسم']) {
						receiver = advisorData[i]['المرشد'];
					}
				}
				db.run(`INSERT INTO message (content, sender, receiver) VALUES (
					'${content}', '${sender}', '${receiver}')`,
					(err) => {
					if (err) {
						res.status(500).json(err.message);
					}
				});
			}
		}
	}

	d3_module.then((d3) => {
		const data = d3.csvFormat(attendData);
		fs.writeFile(`./requirement/attendance/${req.body.course}.csv`,
			data, 'utf-8', (err) => {
			if (err) {
				res.status(500).json(err.message);
			} else {
				res.status(200).json('Changes applied successfully.');
			}
		});
	});
});

module.exports = router;