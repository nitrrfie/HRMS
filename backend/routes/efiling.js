const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const FileTransfer = require("../models/FileTransfer");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads/efiling");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Allow common document types
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/jpeg",
    "image/png",
    "image/gif",
    "text/plain",
    "application/zip",
    "application/x-rar-compressed",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG, GIF, TXT, ZIP, RAR"
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

// Send a file to another user
router.post("/send", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const { recipientId, note } = req.body;

    if (!recipientId) {
      // Delete uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res
        .status(400)
        .json({ success: false, message: "Recipient is required" });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      fs.unlinkSync(req.file.path);
      return res
        .status(404)
        .json({ success: false, message: "Recipient not found" });
    }

    // Cannot send to yourself
    if (recipientId === req.user._id.toString()) {
      fs.unlinkSync(req.file.path);
      return res
        .status(400)
        .json({ success: false, message: "Cannot send file to yourself" });
    }

    const fileTransfer = await FileTransfer.create({
      sender: req.user._id,
      recipient: recipientId,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: req.file.path,
      note: note || "",
      // Start a new thread
      isForwarded: false,
    });

    // For original upload, threadId is its own ID
    fileTransfer.threadId = fileTransfer._id;
    await fileTransfer.save();

    await fileTransfer.populate([
      { path: "sender", select: "username profile.firstName profile.lastName" },
      {
        path: "recipient",
        select: "username profile.firstName profile.lastName",
      },
    ]);

    res.status(201).json({
      success: true,
      message: "File sent successfully",
      transfer: fileTransfer,
    });
  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Forward a file
router.post("/forward", protect, async (req, res) => {
  try {
    const { originalTransferId, recipientId, note } = req.body;

    if (!originalTransferId || !recipientId) {
      return res.status(400).json({
        success: false,
        message: "Original file and recipient are required",
      });
    }

    const originalTransfer = await FileTransfer.findById(originalTransferId);
    if (!originalTransfer) {
      return res
        .status(404)
        .json({ success: false, message: "Original file not found" });
    }

    // Verify user has access to this file (is sender or recipient)
    if (
      originalTransfer.sender.toString() !== req.user._id.toString() &&
      originalTransfer.recipient.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized to forward this file" });
    }

    // Create new transfer record pointing to same physical file
    const newTransfer = await FileTransfer.create({
      sender: req.user._id,
      recipient: recipientId,
      fileName: originalTransfer.fileName,
      originalName: originalTransfer.originalName,
      fileType: originalTransfer.fileType,
      fileSize: originalTransfer.fileSize,
      filePath: originalTransfer.filePath,
      note: note || "",
      isForwarded: true,
      parentTransferId: originalTransfer._id,
      threadId: originalTransfer.threadId || originalTransfer._id,
    });

    await newTransfer.populate([
      { path: "sender", select: "username profile.firstName profile.lastName" },
      {
        path: "recipient",
        select: "username profile.firstName profile.lastName",
      },
    ]);

    res.status(201).json({
      success: true,
      message: "File forwarded successfully",
      transfer: newTransfer,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Get inbox (received files)
router.get("/inbox", protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const transfers = await FileTransfer.find({ recipient: req.user._id })
      .populate(
        "sender",
        "username profile.firstName profile.lastName employment.designation"
      )
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await FileTransfer.countDocuments({
      recipient: req.user._id,
    });
    const unreadCount = await FileTransfer.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.json({
      success: true,
      transfers,
      unreadCount,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Get sent files
router.get("/sent", protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const transfers = await FileTransfer.find({
      $or: [{ sender: req.user._id }, { recipient: req.user._id }],
    })
      .populate(
        "sender",
        "username profile.firstName profile.lastName employment.designation"
      )
      .populate(
        "recipient",
        "username profile.firstName profile.lastName employment.designation"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await FileTransfer.countDocuments({
      $or: [{ sender: req.user._id }, { recipient: req.user._id }],
    });

    res.json({
      success: true,
      transfers,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get file tracking thread
router.get("/track/:id", protect, async (req, res) => {
  try {
    const transfer = await FileTransfer.findById(req.params.id);
    if (!transfer) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    // Get all transfers in this thread
    // Sort by creation date to show journey
    const thread = await FileTransfer.find({
      $or: [
        { threadId: transfer.threadId || transfer._id },
        { _id: transfer.threadId || transfer._id },
      ],
    })
      .populate(
        "sender",
        "username profile.firstName profile.lastName employment.designation"
      )
      .populate(
        "recipient",
        "username profile.firstName profile.lastName employment.designation"
      )
      .sort({ createdAt: 1 });

    // Verify user has access to at least one file in thread
    const hasAccess = thread.some(
      (t) =>
        t.sender._id.toString() === req.user._id.toString() ||
        t.recipient._id.toString() === req.user._id.toString()
    );

    if (!hasAccess && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized to view tracking" });
    }

    res.json({ success: true, thread });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Get history (all sent and received)
router.get("/history", protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = req.query.filter; // 'sent', 'received', or empty for all

    let query = {
      $or: [{ sender: req.user._id }, { recipient: req.user._id }],
    };

    if (filter === "sent") {
      query = { sender: req.user._id };
    } else if (filter === "received") {
      query = { recipient: req.user._id };
    }

    const transfers = await FileTransfer.find(query)
      .populate(
        "sender",
        "username profile.firstName profile.lastName employment.designation role"
      )
      .populate(
        "recipient",
        "username profile.firstName profile.lastName employment.designation role"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await FileTransfer.countDocuments(query);

    res.json({
      success: true,
      transfers,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark file as read
router.patch("/:id/read", protect, async (req, res) => {
  try {
    const transfer = await FileTransfer.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!transfer) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    if (!transfer.isRead) {
      transfer.isRead = true;
      transfer.status = "read";
      transfer.readAt = new Date();
      await transfer.save();
    }

    res.json({ success: true, transfer });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Download file
router.get("/download/:id", protect, async (req, res) => {
  try {
    const transfer = await FileTransfer.findOne({
      _id: req.params.id,
      $or: [{ sender: req.user._id }, { recipient: req.user._id }],
    });

    if (!transfer) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    // Check for thread access if not direct sender/recipient
    // This handles cases where user might be part of the thread history but not this specific transfer
    // For now, basic check is sufficient as users only see transfers they are part of

    // Mark as read if recipient is downloading
    if (
      transfer.recipient.toString() === req.user._id.toString() &&
      !transfer.isRead
    ) {
      transfer.isRead = true;
      transfer.status = "read";
      transfer.readAt = new Date();
      await transfer.save();
    }

    // Check if file exists
    if (!fs.existsSync(transfer.filePath)) {
      return res
        .status(404)
        .json({ success: false, message: "File not found on server" });
    }

    res.download(transfer.filePath, transfer.originalName);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Get unread count
router.get("/unread-count", protect, async (req, res) => {
  try {
    const count = await FileTransfer.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.json({ success: true, count });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Delete a file transfer (only sender can delete from their sent, only within 24 hours)
router.delete("/:id", protect, async (req, res) => {
  try {
    const transfer = await FileTransfer.findOne({
      _id: req.params.id,
      sender: req.user._id,
    });

    if (!transfer) {
      return res
        .status(404)
        .json({ success: false, message: "File not found or unauthorized" });
    }

    // Check if within 24 hours
    const hoursSinceSent = (Date.now() - transfer.createdAt) / (1000 * 60 * 60);
    if (hoursSinceSent > 24) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete files older than 24 hours",
      });
    }

    // Delete physical file
    if (fs.existsSync(transfer.filePath)) {
      fs.unlinkSync(transfer.filePath);
    }

    await FileTransfer.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;
