const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'development_secret_key_change_me';
const DATABASE_FILE = process.env.DATABASE_FILE || path.join(__dirname, 'data', 'chore-app.db');
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// Ensure the data directory exists
const fs = require('fs');
const dataDir = path.dirname(DATABASE_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(DATABASE_FILE, (err) => {
  if (err) {
    console.error('Failed to connect to database', err);
  } else {
    console.log('Connected to SQLite database.');
  }
});

const initializeDatabase = () => {
  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS families (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        family_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        family_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        role TEXT CHECK(role IN ('parent', 'kid')) NOT NULL,
        points INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS chores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        family_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        assigned_to INTEGER,
        due_date TEXT,
        status TEXT CHECK(status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
        points INTEGER DEFAULT 0,
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES members (id) ON DELETE SET NULL
      )`
    );
  });
};

initializeDatabase();

const generateToken = (family) => {
  return jwt.sign({ familyId: family.id, familyName: family.family_name }, JWT_SECRET, {
    expiresIn: '12h',
  });
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Missing authorization token' });
  }

  jwt.verify(token, JWT_SECRET, (err, family) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    req.family = family;
    next();
  });
};

app.post('/api/auth/register', (req, res) => {
  const { familyName, parentName, email, password } = req.body;

  if (!familyName || !parentName || !email || !password) {
    return res.status(400).json({ message: 'familyName, parentName, email, and password are required.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.serialize(() => {
    db.run(
      'INSERT INTO families (family_name, email, password_hash) VALUES (?, ?, ?)',
      [familyName, email.toLowerCase(), hashedPassword],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
          }
          console.error('Error creating family', err);
          return res.status(500).json({ message: 'Failed to create family account.' });
        }

        const familyId = this.lastID;
        db.run(
          'INSERT INTO members (family_id, name, role) VALUES (?, ?, ?)',
          [familyId, parentName, 'parent'],
          function (memberErr) {
            if (memberErr) {
              console.error('Error creating parent member', memberErr);
              return res.status(500).json({ message: 'Family created but failed to add parent profile.' });
            }

            const family = {
              id: familyId,
              family_name: familyName,
              email,
            };

            const token = generateToken(family);
            return res.status(201).json({
              token,
              family: {
                id: familyId,
                familyName,
                email,
              },
            });
          }
        );
      }
    );
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  db.get('SELECT * FROM families WHERE email = ?', [email.toLowerCase()], (err, family) => {
    if (err) {
      console.error('Error retrieving family', err);
      return res.status(500).json({ message: 'Failed to log in.' });
    }

    if (!family) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isValidPassword = bcrypt.compareSync(password, family.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = generateToken(family);
    return res.json({
      token,
      family: {
        id: family.id,
        familyName: family.family_name,
        email: family.email,
      },
    });
  });
});

app.get('/api/dashboard', authenticateToken, (req, res) => {
  const familyId = req.family.familyId;

  const familyQuery = 'SELECT id, family_name AS familyName, email FROM families WHERE id = ?';
  const membersQuery = 'SELECT id, name, role, points FROM members WHERE family_id = ? ORDER BY role DESC, name ASC';
  const choresQuery = `
    SELECT c.id, c.title, c.description, c.assigned_to AS assignedTo, c.due_date AS dueDate,
           c.status, c.points, c.completed_at AS completedAt, m.name AS assignedName
    FROM chores c
    LEFT JOIN members m ON c.assigned_to = m.id
    WHERE c.family_id = ?
    ORDER BY c.created_at DESC`;

  db.serialize(() => {
    db.get(familyQuery, [familyId], (familyErr, family) => {
      if (familyErr) {
        console.error('Failed to fetch family', familyErr);
        return res.status(500).json({ message: 'Failed to load family dashboard.' });
      }

      db.all(membersQuery, [familyId], (membersErr, members) => {
        if (membersErr) {
          console.error('Failed to fetch members', membersErr);
          return res.status(500).json({ message: 'Failed to load family members.' });
        }

        db.all(choresQuery, [familyId], (choresErr, chores) => {
          if (choresErr) {
            console.error('Failed to fetch chores', choresErr);
            return res.status(500).json({ message: 'Failed to load chores.' });
          }

          res.json({
            family,
            members,
            chores,
          });
        });
      });
    });
  });
});

app.post('/api/members', authenticateToken, (req, res) => {
  const familyId = req.family.familyId;
  const { name, role } = req.body;

  if (!name || !role) {
    return res.status(400).json({ message: 'Member name and role are required.' });
  }

  if (!['parent', 'kid'].includes(role)) {
    return res.status(400).json({ message: 'Role must be either "parent" or "kid".' });
  }

  db.run(
    'INSERT INTO members (family_id, name, role) VALUES (?, ?, ?)',
    [familyId, name, role],
    function (err) {
      if (err) {
        console.error('Failed to add member', err);
        return res.status(500).json({ message: 'Failed to add member.' });
      }

      res.status(201).json({
        id: this.lastID,
        name,
        role,
        points: 0,
      });
    }
  );
});

app.put('/api/members/:memberId', authenticateToken, (req, res) => {
  const familyId = req.family.familyId;
  const { memberId } = req.params;
  const { name, role } = req.body;

  db.run(
    'UPDATE members SET name = ?, role = ? WHERE id = ? AND family_id = ?',
    [name, role, memberId, familyId],
    function (err) {
      if (err) {
        console.error('Failed to update member', err);
        return res.status(500).json({ message: 'Failed to update member.' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Member not found.' });
      }

      res.json({ id: Number(memberId), name, role });
    }
  );
});

app.delete('/api/members/:memberId', authenticateToken, (req, res) => {
  const familyId = req.family.familyId;
  const { memberId } = req.params;

  db.run('DELETE FROM members WHERE id = ? AND family_id = ?', [memberId, familyId], function (err) {
    if (err) {
      console.error('Failed to delete member', err);
      return res.status(500).json({ message: 'Failed to delete member.' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Member not found.' });
    }

    res.status(204).send();
  });
});

app.post('/api/chores', authenticateToken, (req, res) => {
  const familyId = req.family.familyId;
  const { title, description, assignedTo, dueDate, points } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Chore title is required.' });
  }

  db.run(
    'INSERT INTO chores (family_id, title, description, assigned_to, due_date, points) VALUES (?, ?, ?, ?, ?, ?)',
    [familyId, title, description || '', assignedTo || null, dueDate || null, points || 0],
    function (err) {
      if (err) {
        console.error('Failed to create chore', err);
        return res.status(500).json({ message: 'Failed to create chore.' });
      }

      res.status(201).json({
        id: this.lastID,
        title,
        description: description || '',
        assignedTo: assignedTo || null,
        dueDate: dueDate || null,
        status: 'pending',
        points: points || 0,
      });
    }
  );
});

app.put('/api/chores/:choreId', authenticateToken, (req, res) => {
  const familyId = req.family.familyId;
  const { choreId } = req.params;
  const { title, description, assignedTo, dueDate, status, points } = req.body;

  const updates = [title, description, assignedTo, dueDate, status, points, choreId, familyId];
  db.run(
    `UPDATE chores
     SET title = ?, description = ?, assigned_to = ?, due_date = ?, status = ?, points = ?
     WHERE id = ? AND family_id = ?`,
    updates,
    function (err) {
      if (err) {
        console.error('Failed to update chore', err);
        return res.status(500).json({ message: 'Failed to update chore.' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Chore not found.' });
      }

      res.json({ id: Number(choreId), title, description, assignedTo, dueDate, status, points });
    }
  );
});

app.post('/api/chores/:choreId/complete', authenticateToken, (req, res) => {
  const familyId = req.family.familyId;
  const { choreId } = req.params;

  db.run(
    `UPDATE chores SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ? AND family_id = ?`,
    [choreId, familyId],
    function (err) {
      if (err) {
        console.error('Failed to complete chore', err);
        return res.status(500).json({ message: 'Failed to complete chore.' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Chore not found.' });
      }

      res.json({ id: Number(choreId), status: 'completed' });
    }
  );
});

app.delete('/api/chores/:choreId', authenticateToken, (req, res) => {
  const familyId = req.family.familyId;
  const { choreId } = req.params;

  db.run('DELETE FROM chores WHERE id = ? AND family_id = ?', [choreId, familyId], function (err) {
    if (err) {
      console.error('Failed to delete chore', err);
      return res.status(500).json({ message: 'Failed to delete chore.' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Chore not found.' });
    }

    res.status(204).send();
  });
});

app.get('/api/leaderboard', authenticateToken, (req, res) => {
  const familyId = req.family.familyId;

  db.all(
    `SELECT m.id, m.name, m.role, m.points, IFNULL(SUM(c.points), 0) AS completedPoints
     FROM members m
     LEFT JOIN chores c ON c.assigned_to = m.id AND c.status = 'completed'
     WHERE m.family_id = ?
     GROUP BY m.id
     ORDER BY completedPoints DESC, m.name ASC`,
    [familyId],
    (err, leaderboard) => {
      if (err) {
        console.error('Failed to load leaderboard', err);
        return res.status(500).json({ message: 'Failed to load leaderboard.' });
      }

      res.json({ leaderboard });
    }
  );
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  } else {
    next();
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ message: 'Unexpected server error.' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
