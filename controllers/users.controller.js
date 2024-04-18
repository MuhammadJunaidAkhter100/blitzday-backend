import httpStatusCodes from "http-status-codes";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import axios from 'axios';

import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { userModel } from "../models/user.model.js";
import { generateRandomToken, generateStrongPassword } from "../utils/methods.js";
import { meetingsModel } from "../models/meetings.model.js";

const signUp = async (req, res) => {
    const { name, email, password , companyName } = req.body;

    if (!email || !password) {
        throw new ApiError(
            httpStatusCodes.UNPROCESSABLE_ENTITY,
            "Email or Password is required",
            httpStatusCodes.UNPROCESSABLE_ENTITY
        );
    }

    const user = await userModel.findOne({ email: email });

    if (user) {
        throw new ApiError(
            httpStatusCodes.CONFLICT,
            "Email already exists",
            httpStatusCodes.CONFLICT
        );
    }

    bcrypt.hash(password, 10, async (_, hash) => {
        if (hash) {
            await userModel.create({
                name: name,
                email: email,
                role: 'admin',
                password: hash,
                companyName
            });

            const token = jwt.sign({ email }, process.env.JWT_SECRET);

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.SIGNUP_EMAIL,
                    pass: process.env.SIGNUP_EMAIL_PASS,
                },
            });

            const mailOptions = {
                from: process.env.SIGNUP_EMAIL,
                to: email,
                subject: 'Blitzday Account Created',
                text: `A blitzday account has been created using your email.
                If you suspect someone created this account without your authorization contact us via support@blitzday.com.`
            };

            transporter.sendMail(mailOptions);
            ApiResponse.result(res, { token, name, role: 'admin' }, httpStatusCodes.OK);
        }
    })
};

const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(
            httpStatusCodes.UNPROCESSABLE_ENTITY,
            "Email or Password is required",
            httpStatusCodes.UNPROCESSABLE_ENTITY
        );
    }

    const user = await userModel.findOne({ email: email });

    if (!user) {
        throw new ApiError(
            httpStatusCodes.NOT_FOUND,
            "No user exists with this email",
            httpStatusCodes.NOT_FOUND
        );
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
        const token = jwt.sign({ email }, process.env.JWT_SECRET);
        ApiResponse.result(res, { token, name: user.name, role: user.role }, httpStatusCodes.OK);
    } else {
        throw new ApiError(
            httpStatusCodes.UNAUTHORIZED,
            "Password is incorrect",
            httpStatusCodes.UNAUTHORIZED
        );
    }
};

const getCurrentUser = async (req, res) => {
    const user = await userModel.findOne({ email: req.email });

    ApiResponse.result(res, { user }, httpStatusCodes.OK);
}

const updateCurrentUser = async (req, res) => {
    const { name, email, companyName } = req.body;

    if (!name || !email) {
        throw new ApiError(
            httpStatusCodes.UNPROCESSABLE_ENTITY,
            "Name or Email is required",
            httpStatusCodes.UNPROCESSABLE_ENTITY
        );
    }

    if (email !== req.email) {
        const user = await userModel.findOne({ email: email });

        if (user) {
            throw new ApiError(
                httpStatusCodes.NOT_FOUND,
                "User already exists with this email",
                httpStatusCodes.NOT_FOUND
            );
        }
    }

    await userModel.updateOne({ email: req.email }, { $set: { email: email, name: name , companyName: companyName } });
    const token = jwt.sign({ email }, process.env.JWT_SECRET);

    ApiResponse.result(res, { token, name }, httpStatusCodes.OK);
}

const updatePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw new ApiError(
            httpStatusCodes.UNPROCESSABLE_ENTITY,
            "Current Password or New Password is required",
            httpStatusCodes.UNPROCESSABLE_ENTITY
        );
    }

    const user = await userModel.findOne({ email: req.email });
    const isMatch = await bcrypt.compare(currentPassword, user?.password || '');

    if (!isMatch) {
        throw new ApiError(
            httpStatusCodes.NOT_FOUND,
            "Current password is incorrect",
            httpStatusCodes.NOT_FOUND
        );
    }

    bcrypt.hash(newPassword, 10, async (_, hash) => {
        if (hash) {
            await userModel.updateOne({ email: req.email }, { $set: { password: hash } });
            ApiResponse.result(res, { isUpdated: true }, httpStatusCodes.OK);
        }
    })
}

const inviteTeamMember = async (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        throw new ApiError(
            httpStatusCodes.UNPROCESSABLE_ENTITY,
            "Name or Email is required",
            httpStatusCodes.UNPROCESSABLE_ENTITY
        );
    }

    const user = await userModel.findOne({ email: email });

    if (user) {
        throw new ApiError(
            httpStatusCodes.CONFLICT,
            "Email already exists",
            httpStatusCodes.CONFLICT
        );
    }

    const password = generateStrongPassword();
    bcrypt.hash(password, 10, async (_, hash) => {
        if (hash) {
            await userModel.create({
                name: name,
                email: email,
                role: 'teamMember',
                ownerCompanyEmail: req.email,
                password: hash
            });

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.SIGNUP_EMAIL,
                    pass: process.env.SIGNUP_EMAIL_PASS,
                },
            });

            const mailOptions = {
                from: process.env.SIGNUP_EMAIL,
                to: email,
                subject: 'Blitzday Invite',
                text: `Hi ${name},
                
                ${req.email} has invited you to join team. Please use following credentials to login:

                Email: ${email}
                Password: ${password}

                Thanks
                `
            };

            transporter.sendMail(mailOptions);
            ApiResponse.result(res, { isInvited: true }, httpStatusCodes.OK);
        }
    })

}

const getTeamMembers = async (req, res) => {
    const teamMembers = await userModel.find({ ownerCompanyEmail: req.email })?.select('-password');;

    ApiResponse.result(res, { teamMembers }, httpStatusCodes.OK);
}

const removeTeamMember = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(
            httpStatusCodes.UNPROCESSABLE_ENTITY,
            "Team member email is required",
            httpStatusCodes.UNPROCESSABLE_ENTITY
        );
    }

    await meetingsModel.deleteMany({ userEmail: email });
    await userModel.deleteOne({ email });

    ApiResponse.result(res, { isDeleted: true }, httpStatusCodes.OK);
}


const getAssemblyToken = async (req, res) => {
    const response = await axios.post('https://api.assemblyai.com/v2/realtime/token',
        { expires_in: 36000 },
        { headers: { authorization: `140480051468488c9c73c35568b8df26` } });

    const { data } = response;

    ApiResponse.result(res, { token: data.token }, httpStatusCodes.OK);
}

const generatePasswordResetToken = async (req, res) => {
    const { email } = req.body;


    const user = await userModel.findOne({ email });

    if (!user) {
        throw new ApiError(
            httpStatusCodes.UNPROCESSABLE_ENTITY,
            "No users exists with this email",
            httpStatusCodes.UNPROCESSABLE_ENTITY
        );
    }

    const randomToken = generateRandomToken(24);
    await userModel.updateOne({ email }, { $set: { resetToken: randomToken } });


    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SIGNUP_EMAIL,
            pass: process.env.SIGNUP_EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.SIGNUP_EMAIL,
        to: email,
        subject: 'Forgot Password',
        text: `Hi ${user.name},
                
                Please use following token to resume password reset flow:

                Token: ${randomToken}

                Thanks
                `
    };

    transporter.sendMail(mailOptions);
    ApiResponse.result(res, { isTokenGenerated: true }, httpStatusCodes.OK);
}


const verifyPasswordResetToken = async (req, res) => {
    const { email, token } = req.body;

    if (!token) {
        throw new ApiError(
            httpStatusCodes.UNPROCESSABLE_ENTITY,
            "Token is required",
            httpStatusCodes.UNPROCESSABLE_ENTITY
        );
    }

    const user = await userModel.findOne({ email, resetToken: token });

    if (!user) {
        throw new ApiError(
            httpStatusCodes.UNPROCESSABLE_ENTITY,
            "Token is invalid",
            httpStatusCodes.UNPROCESSABLE_ENTITY
        );
    }

    await userModel.updateOne({ email }, { $set: { resetToken: null } });
    const jwtToken = jwt.sign({ email }, process.env.JWT_SECRET);

    ApiResponse.result(res, { token: jwtToken }, httpStatusCodes.OK);
}

const updateForgettedPassword = async (req, res) => {
    const { newPassword } = req.body;

    if (!newPassword) {
        throw new ApiError(
            httpStatusCodes.UNPROCESSABLE_ENTITY,
            "New Password is required",
            httpStatusCodes.UNPROCESSABLE_ENTITY
        );
    }

    bcrypt.hash(newPassword, 10, async (_, hash) => {
        if (hash) {
            await userModel.updateOne({ email: req.email }, { $set: { password: hash } });
            ApiResponse.result(res, { isUpdated: true }, httpStatusCodes.OK);
        }
    })
}


export default {
    signUp,
    login,
    getCurrentUser,
    updateCurrentUser,
    updatePassword,
    inviteTeamMember,
    getTeamMembers,
    removeTeamMember,
    getAssemblyToken,
    generatePasswordResetToken,
    verifyPasswordResetToken,
    updateForgettedPassword
};
