const Notification = require("../models/notification");

async function createNotification(userId, message) {
  if (!userId || !message) return null;
  return Notification.create({
    user_id: userId,
    message,
    read: false,
  });
}

module.exports = { createNotification };
