// ===== routes/tasks.js =====
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Task = require('../models/task');  
const User = require('../models/user');

// ---------- GET /api/tasks ----------
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

    // skip
    let skip = 0;
    if (req.query.skip) {
      const parsedSkip = parseInt(req.query.skip);
      if (!isNaN(parsedSkip) && parsedSkip >= 0) skip = parsedSkip;
    }

    // limit — 100
    let limit = 100;
    if (req.query.limit) {
      const parsedLimit = parseInt(req.query.limit);
      if (!isNaN(parsedLimit) && parsedLimit > 0) limit = parsedLimit;
    }

    // 
    let result = await Task.find(query)
      .sort(sort)
      .select(select)
      .skip(skip)
      .limit(limit);

    // 6️count 
    if (req.query.count === "true") {
      const count = await Task.countDocuments(query);
      return res.status(200).json({ message: "OK", data: count });
    }

    // 
    if (!result || result.length === 0) {
      return res.status(200).json({ message: "OK", data: [] });
    }

    res.status(200).json({ message: "OK", data: result });
  } catch (err) {
    res.status(500).json({ message: "Server error", data: [] });
  }
});

// ---------- POST /api/tasks ----------
router.post('/', async (req, res) => {
  try {
    const { name, deadline, description, completed, assignedUser, assignedUserName } = req.body;

    // test require
    if (!name || !deadline) {
      return res.status(400).json({ message: "Missing required fields: name or deadline", data: null });
    }

    const newTask = new Task({
      name,
      description: description || "No description",
      deadline,
      completed: completed || false,
      assignedUser: assignedUser || "",
      assignedUserName: assignedUserName || "unassigned"
    });

    await newTask.save();
    res.status(201).json({ message: "Task created successfully", data: newTask });
  } catch (err) {
    res.status(500).json({ message: "Server error", data: err.message });
  }
});

// ---------- GET /api/tasks/:id ----------
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Task not found", data: null });
    }
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found", data: null });
    }
    res.status(200).json({ message: "OK", data: task });
  } catch (err) {
    res.status(500).json({ message: "Server error", data: err.message });
  }
});

// ---------- PUT /api/tasks/:id ----------
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Task not found", data: null });
    }
    const { name, deadline, description, completed, assignedUser, assignedUserName } = req.body;

    // test require
    if (!name?.trim() || !deadline) {
      return res.status(400).json({ message: "Missing required fields: name or deadline", data: null });
    }

    // find old task
    const oldTask = await Task.findById(req.params.id);
    if (!oldTask) {
      return res.status(404).json({ message: "Task not found", data: null });
    }

    // if change the assigned,delete from the old
    if (oldTask.assignedUser && assignedUser && oldTask.assignedUser.toString() !== assignedUser) {
      const oldUser = await User.findById(oldTask.assignedUser);
      if (oldUser) {
        oldUser.pendingTasks = oldUser.pendingTasks.filter(
          tid => tid.toString() !== req.params.id
        );
        await oldUser.save();
      }
    }

    // update
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description: description || "No description",
        deadline,
        completed: completed !== undefined ? completed : false,
        assignedUser: assignedUser || "",
        assignedUserName: assignedUserName || "unassigned"
      },
      { new: true, runValidators: true }
    );

    // update pending tasks
    if (assignedUser) {
      const newUser = await User.findById(assignedUser);
      if (newUser && !newUser.pendingTasks.includes(req.params.id)) {
        newUser.pendingTasks.push(req.params.id);
        await newUser.save();
      }
    }

    res.status(200).json({ message: "Task updated successfully", data: updatedTask });
  } catch (err) {
    res.status(500).json({ message: "Server error", data: err.message });
  }
});


// ---------- DELETE /api/tasks/:id ----------
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Task not found", data: null });
    }
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found", data: null });
    }

    // if it's assigned, delete from pending task
    if (task.assignedUser) {
      const user = await User.findById(task.assignedUser);
      if (user) {
        user.pendingTasks = user.pendingTasks.filter(
          tid => tid.toString() !== req.params.id
        );
        await user.save();
        console.log(`Removed task ${req.params.id} from ${user.name}'s pendingTasks`);
      }
    }

    // delete task itself
    await Task.findByIdAndDelete(req.params.id);

    res.status(204).json({ message: "Task deleted successfully", data: null });
  } catch (err) {
    console.error("DELETE /api/tasks/:id ERROR:", err);
    res.status(500).json({ message: "Server error", data: err.message });
  }
});


module.exports = router;
