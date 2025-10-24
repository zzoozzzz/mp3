// ===== routes/users.js =====
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Task = require('../models/task');

// ---------- GET /api/users ----------
router.get('/', async (req, res) => {
  try {
    // where
    let query = {};
    if (req.query.where) {
      try {
        query = JSON.parse(req.query.where);
      } catch (err) {
        return res.status(400).json({ message: "Invalid where query format", data: [] });
      }
    }

    // sort
    let sort = {};
    if (req.query.sort) {
      try {
        sort = JSON.parse(req.query.sort);
      } catch (err) {
        return res.status(400).json({ message: "Invalid sort query format", data: [] });
      }
    }

    // select
    let select = {};
    if (req.query.select) {
      try {
        select = JSON.parse(req.query.select);
      } catch (err) {
        return res.status(400).json({ message: "Invalid select query format", data: [] });
      }
    }

    // skip specific number
    let skip = 0;
    if (req.query.skip) {
      const parsedSkip = parseInt(req.query.skip);
      if (!isNaN(parsedSkip) && parsedSkip >= 0) skip = parsedSkip;
    }

    // limit unlimited
    let limit = 0;
    if (req.query.limit) {
      const parsedLimit = parseInt(req.query.limit);
      if (!isNaN(parsedLimit) && parsedLimit > 0) limit = parsedLimit;
    }

    // execute query
    let queryExec = User.find(query).sort(sort).select(select).skip(skip);
    if (limit > 0) queryExec = queryExec.limit(limit);

    const result = await queryExec;

    // 6️⃣ count 
    if (req.query.count === "true") {
      const count = await User.countDocuments(query);
      // 
      return res.status(200).json({ message: "OK", data: count });
    }

    // return null when no result
    if (!result || result.length === 0) {
      return res.status(200).json({ message: "OK", data: [] });
    }

    res.status(200).json({ message: "OK", data: result });
  } catch (err) {
    res.status(500).json({ message: "Server error", data: [] });
  }
});

// ---------- POST /api/users ----------
router.post('/', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Missing required fields: name or email", data: null });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists", data: null });
    }

    const newUser = new User({
      name,
      email,
      pendingTasks: [],
      dateCreated: new Date()
    });

    await newUser.save();
    res.status(201).json({ message: "User created successfully", data: newUser });
  } catch (err) {
    res.status(500).json({ message: "Server error", data: err.message });
  }
});

// ---------- GET /api/users/:id ----------
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found", data: null });
    }
    res.status(200).json({ message: "OK", data: user });
  } catch (err) {
    res.status(500).json({ message: "Server error", data: err.message });
  }
});

// ---------- PUT /api/users/:id ----------
router.put('/:id', async (req, res) => {
  try {
    const { name, email, pendingTasks } = req.body;

    // check require
    if (!name || !email) {
      return res.status(400).json({ message: "Missing required fields: name or email", data: null });
    }

    // check email
    const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists", data: null });
    }

    // update user
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, pendingTasks: pendingTasks || [] },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found", data: null });
    }

    // update each task's assignedUser / assignedUserName
    if (pendingTasks && pendingTasks.length > 0) {
      for (const taskId of pendingTasks) {
        const task = await Task.findById(taskId);
        if (task) {
          task.assignedUser = updatedUser._id.toString();
          task.assignedUserName = updatedUser.name;
          await task.save();
        }
      }
    }

    res.status(200).json({ message: "User updated successfully", data: updatedUser });
  } catch (err) {
    console.error("PUT /api/users/:id ERROR:", err);
    res.status(500).json({ message: "Server error", data: err.message });
  }
});

// ---------- DELETE /api/users/:id ----------
router.delete('/:id', async (req, res) => {
  try {
    const cleanId = req.params.id.trim();

    // find the user
    const user = await User.findById(cleanId);
    if (!user) {
      return res.status(404).json({ message: "User not found", data: null });
    }

    // set all of its tasks to unassigned
    await Task.updateMany(
      { assignedUser: cleanId },
      { assignedUser: "", assignedUserName: "unassigned" }
    );

    // delete the user
    await User.findByIdAndDelete(cleanId);

    console.log(`Deleted user ${user.name}, and unassigned all their tasks.`);

    res.status(204).json({ message: "User deleted successfully", data: null });
  } catch (err) {
    console.error("DELETE /api/users/:id ERROR:", err);
    res.status(500).json({ message: "Server error", data: err.message });
  }
});


module.exports = router;
