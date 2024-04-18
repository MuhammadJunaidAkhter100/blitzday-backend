import * as express from "express";

import asyncHandler from "../utils/asyncHandler.js";
import usersController from "../controllers/users.controller.js";
import isAuthenticated from "../middlewares/jwt.js";

export const userRoutes = express.Router();
const router = userRoutes;

router.post(
    `/signup`,
    asyncHandler(usersController.signUp)
);

router.post(
    `/login`,
    asyncHandler(usersController.login)
);

router.post(
    `/generatePasswordResetToken`,
    asyncHandler(usersController.generatePasswordResetToken)
);

router.post(
    `/verifyPasswordResetToken`,
    asyncHandler(usersController.verifyPasswordResetToken)
);

router.post(
    `/updateForgettedPassword`,
    isAuthenticated,
    asyncHandler(usersController.updateForgettedPassword)
);

router.get(
    `/getCurrentUser`,
    isAuthenticated,
    asyncHandler(usersController.getCurrentUser)
);

router.post(
    `/updateCurrentUser`,
    isAuthenticated,
    asyncHandler(usersController.updateCurrentUser)
);

router.post(
    `/updatePassword`,
    isAuthenticated,
    asyncHandler(usersController.updatePassword)
);

router.post(
    `/inviteTeamMember`,
    isAuthenticated,
    asyncHandler(usersController.inviteTeamMember)
);

router.post(
    `/removeTeamMember`,
    isAuthenticated,
    asyncHandler(usersController.removeTeamMember)
);

router.get(
    `/getTeamMembers`,
    isAuthenticated,
    asyncHandler(usersController.getTeamMembers)
);

router.get(
    `/assemblyToken`,
    isAuthenticated,
    asyncHandler(usersController.getAssemblyToken)
);

export default router;
