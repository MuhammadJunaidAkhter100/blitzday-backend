import * as express from "express";

import asyncHandler from "../utils/asyncHandler.js";
import meetingsController from "../controllers/meetings.controller.js";
import isAuthenticated from "../middlewares/jwt.js";

export const meetingRoutes = express.Router();
const router = meetingRoutes;

router.get(
    `/getAllMeetings`,
    isAuthenticated,
    asyncHandler(meetingsController.getAllMeetings)
);

router.get(
    `/getSingleMeeting/:id`,
    isAuthenticated,
    asyncHandler(meetingsController.getSingleMeeting)
);

router.post(
    `/saveMeeting`,
    isAuthenticated,
    asyncHandler(meetingsController.saveMeeting)
);

router.post(
    `/updateMeeting`,
    isAuthenticated,
    asyncHandler(meetingsController.updateMeeting)
);

router.post(
    `/scheduleDemo`,
    asyncHandler(meetingsController.scheduleDemo)
);

export default router;
