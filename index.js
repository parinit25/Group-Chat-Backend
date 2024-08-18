require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { sequelize } = require("./utils/database");

// Models Import
const User = require("./models/User");
const Contacts = require("./models/Contacts");
const Messages = require("./models/Messages");
const Group = require("./models/Group");
const GroupMessage = require("./models/GroupMessage");
const GroupMember = require("./models/GroupMember");
require("./models/associations");
const authRoutes = require("./routes/auth");
const contactRoutes = require("./routes/contacts");
const messagesRoutes = require("./routes/messages");
const groupRoutes = require("./routes/group");
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this to your frontend's origin
    methods: ["GET", "POST"],
  },
});

// Initialize AWS S3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_IAM_USER_KEY,
    secretAccessKey: process.env.AWS_IAM_USER_SECRET,
  },
});

const myBucket = process.env.AWS_BUCKET_NAME;

app.use(express.json());
app.use(cors());
app.use(helmet());

app.use("/auth", authRoutes);
app.use("/contacts", contactRoutes);
app.use("/messages", messagesRoutes);
app.use("/groups", groupRoutes);

// Generate presigned URL endpoint
app.post("/generate-presigned-url", async (req, res) => {
  const { fileName, fileType, senderId, receiverId, chatType, groupId } =
    req.body;

  try {
    let folderPath;
    if (chatType === "individual") {
      folderPath = `individual/${senderId}`;
    } else if (chatType === "group") {
      folderPath = `groups/${groupId}`;
    }

    if (fileType.startsWith("image/")) {
      folderPath += "/images";
    } else if (fileType.startsWith("video/")) {
      folderPath += "/videos";
    } else {
      folderPath += "/docs";
    }

    const key = `${folderPath}/${Date.now()}_${fileName}`;

    const command = new PutObjectCommand({
      Bucket: myBucket,
      Key: key,
      ContentType: fileType,
      ACL: "public-read",
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // URL expires in 1 hour

    res.status(200).send({ url, key });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    res.status(500).send({ message: "Failed to generate presigned URL." });
  }
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinChat", ({ senderId, receiverId }) => {
    if (!senderId || !receiverId) {
      socket.emit("errorMessage", {
        message: "Invalid sender or receiver ID.",
      });
      return;
    }
    const room = [senderId, receiverId].sort().join("_");
    console.log("Room joined:", room);
    socket.join(room);
  });

  socket.on("sendMessage", async ({ senderId, receiverId, content }) => {
    const room = [senderId, receiverId].sort().join("_");
    try {
      if (!senderId || !receiverId || !content) {
        throw new Error("Invalid input data.");
      }
      const message = await Messages.create({
        senderId,
        content,
        receiverId,
        type: "text", // Indicates this is a text message
      });

      io.to(room).emit("receiveMessage", message);
      console.log(`Message emitted to receiver ${receiverId}`, room);
    } catch (error) {
      console.error("Error in sending message:", error);
      socket.emit("errorMessage", { message: error.message });
    }
  });

  socket.on("sendFile", async (data) => {
    const { fileUrl, senderId, receiverId, chatType, groupId } = data;
    console.log("send message called", fileUrl, senderId, receiverId);
    try {
      const room =
        chatType === "individual"
          ? [senderId, receiverId].sort().join("_")
          : groupId;

      const messageData = {
        senderId,
        receiverId: chatType === "individual" ? receiverId : null,
        groupId: chatType === "group" ? groupId : null,
        content: fileUrl,
        type: "media", // Indicates this is a media file
      };

      if (chatType === "individual") {
        const message = await Messages.create(messageData);
        io.to(room).emit("receiveMessage", message);
      } else if (chatType === "group") {
        const groupMessage = await GroupMessage.create(messageData);
        const response = {
          id: groupMessage.id,
          senderId,
          senderName: `${(await User.findByPk(senderId)).firstName} ${
            (await User.findByPk(senderId)).lastName
          }`,
          content: groupMessage.content,
          groupId: groupMessage.groupId,
          createdAt: groupMessage.createdAt,
        };
        io.to(room).emit("receiveGroupMessage", response);
      }

      console.log(`File URL emitted to room ${room}`, fileUrl);
    } catch (error) {
      console.error("Error in sending file message:", error);
      socket.emit("errorMessage", { message: error.message });
    }
  });

  socket.on("joinGroup", ({ groupId }) => {
    if (!groupId) {
      socket.emit("errorMessage", { message: "Invalid group ID." });
      return;
    }
    const room = groupId;
    socket.join(room);
  });

  socket.on("sendGroupMessage", async ({ senderId, groupId, message }) => {
    const room = groupId;
    console.log(senderId, groupId, message);
    try {
      if (!senderId || !groupId || !message) {
        throw new Error("Invalid input data.");
      }
      const sender = await User.findByPk(senderId);
      if (!sender) {
        throw new Error("Sender not found.");
      }
      const groupMessage = await GroupMessage.create({
        senderId: senderId,
        message: message,
        groupId: groupId,
      });
      console.log(sender);
      const response = {
        id: groupMessage.id,
        senderId: sender.id,
        senderName: sender.firstName + " " + sender.lastName,
        message: groupMessage.message,
        groupId: groupMessage.groupId,
        createdAt: groupMessage.createdAt,
      };

      io.to(room).emit("receiveGroupMessage", response);
      console.log(`Message emitted to group ${groupId}`, room);
    } catch (error) {
      console.log("Error in sending group message:", error);
      socket.emit("errorMessage", { message: error.message });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

sequelize
  .sync({ alter: true })
  .then(() => {
    server.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  })
  .catch((err) => {
    console.log(err);
  });
