import express from "express";
import {
  updateToken,
  sendNotification,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.post("/save-token", updateToken);
router.post("/token", updateToken);
router.post("/send", sendNotification);

export default router;
