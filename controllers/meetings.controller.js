import httpStatusCodes from "http-status-codes";
import { Types } from "mongoose";

import { meetingsModel } from "../models/meetings.model.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { ChatOpenAI } from "@langchain/openai";
import nodemailer from 'nodemailer';
import axios from "axios";

const getAllMeetings = async (req, res) => {
    const meetings = await meetingsModel.find({ userEmail: req.email });

    ApiResponse.result(res, { meetings }, httpStatusCodes.OK);
}

const saveMeeting = async (req, res) => {
    const { name, time } = req.body;

    const meeting = await meetingsModel.create({
        name: name,
        time: time,
        userEmail: req.email
    });

    ApiResponse.result(res, { meeting }, httpStatusCodes.OK);
};

const getSingleMeeting = async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(
            httpStatusCodes.UNPROCESSABLE_ENTITY,
            "Meeting Id is required",
            httpStatusCodes.UNPROCESSABLE_ENTITY
        );
    }

    const meeting = await meetingsModel.findOne({ _id: id, userEmail: req.email });

    if (!meeting?.meetingId) {
        const date1 = new Date(meeting?.time);
        const date2 = new Date();

        const differenceMs = date2.getTime() - date1.getTime();
        const differenceHours = differenceMs / (1000 * 60 * 60);

        if (differenceHours > 2) {
            throw new ApiError(
                httpStatusCodes.UNPROCESSABLE_ENTITY,
                "Meeting is expired, because the upload fails",
                httpStatusCodes.UNPROCESSABLE_ENTITY
            );
        }

        throw new ApiError(
            httpStatusCodes.UNPROCESSABLE_ENTITY,
            "Meeting is compiling",
            httpStatusCodes.UNPROCESSABLE_ENTITY
        );
    }

    let meetingSummary = '-';
    let meetingNextSteps = '-';
    let meetingTranscriptionDetails = {}

    if (meeting?.details) {
        const details = JSON.parse(meeting?.details || '');
        meetingTranscriptionDetails = {
            details: details?.details,
            summary: details?.summary,
            nextSteps: details?.nextSteps
        }
    } else {
        const { data } = await axios.get(`https://api.assemblyai.com/v2/transcript/${meeting?.meetingId}`, {
            headers: {
                Authorization: process.env.ASSEMBLY_AI_KEY
            }
        })

        if(data?.status === 'processing') {
            throw new ApiError(
                httpStatusCodes.UNPROCESSABLE_ENTITY,
                "Meeting is processing",
                httpStatusCodes.UNPROCESSABLE_ENTITY
            );
        }

        if (!data) {
            throw new ApiError(
                httpStatusCodes.UNPROCESSABLE_ENTITY,
                "No meeting detail is available",
                httpStatusCodes.UNPROCESSABLE_ENTITY
            );
        }

        const model = new ChatOpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY,
        });

        const transcription = data?.utterances?.map((transcript) => {
            return {
                [`Speaker ${transcript.speaker}`]: transcript?.text
            }
        })

        if (transcription && transcription?.length > 0) {
            const summaryPropmt = `As an AI assistant you provide summary based on the given meeting json. 

            You always follow these guidelines:
  
            -Answer should be in html markup without links and css
            -Summary should be according to the json provided
            -Don't add anything from your knowledge
            -Make a heading only if it contains text and always complete your sentence
            ------------
            Meeting JSON is following: ${JSON.stringify(transcription)}
            
        `

        const nextStepsPropmt = `As an AI assistant you provide decision and follow up based on the given meeting json. 

            You always follow these guidelines:
  
            -Answer should be in html markup without links and css
            -Meeting decisions and follow ups should be according to the json provided
            -Don't explain the meeting again just explain if anything required
            -Only describe what should be done after meeting
            -Don't add anything from your knowledge
            -Make a heading only if it contains text and always complete your sentence
            ------------
            Meeting JSON is following: ${JSON.stringify(transcription)}
        `

            const summary = await model.invoke(summaryPropmt);
            const steps = await model.invoke(nextStepsPropmt);  

            meetingSummary = summary?.content;
            meetingNextSteps = steps?.content;
        }

        meetingTranscriptionDetails = {
            details: transcription,
            summary: meetingSummary,
            nextSteps: meetingNextSteps
        }

        await meetingsModel.updateOne(
            {
                _id: new Types.ObjectId(id),
                userEmail: meeting.userEmail
            },
            {
                $set: { details: JSON.stringify(meetingTranscriptionDetails) }
            });
    }

    ApiResponse.result(res, { meetingTranscriptionDetails }, httpStatusCodes.OK);
}

const updateMeeting = async (req, res) => {
    const { id, meetingId } = req.body;

    if (!id || !meetingId) {
        throw new ApiError(
            httpStatusCodes.UNPROCESSABLE_ENTITY,
            "Meeting Id is required",
            httpStatusCodes.UNPROCESSABLE_ENTITY
        );
    }

    const meeting = await meetingsModel.updateOne({ _id: new Types.ObjectId(id), userEmail: req.email }, { $set: { meetingId } });
    ApiResponse.result(res, { meeting }, httpStatusCodes.OK);
}

const scheduleDemo = async (req, res) => {
    const { email, name, companyName } = req.body;

    if (!email || !name || !companyName) {
        throw new ApiError(
            httpStatusCodes.UNPROCESSABLE_ENTITY,
            "Email, Name or Company name is required",
            httpStatusCodes.UNPROCESSABLE_ENTITY
        );
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SIGNUP_EMAIL,
            pass: process.env.SIGNUP_EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.SIGNUP_EMAIL,
        to: process.env.DEMO_EMAIL_RECIEVER,
        subject: 'Demo Schedule Request',
        text: `Hi,
                
                You have received a demo request from ${companyName}, Please see the details below.:

                Name: ${name}
                Email: ${email}
                Company: ${companyName}

                Thanks
                `
    };

    const mailOptionsClient = {
        from: process.env.SIGNUP_EMAIL,
        to: email,
        subject: 'Demo Schedule',
        text: `Hi,
                
            Thank you for requesting a demo of Blitzday.ai , We're excited to show you how our solution can help you to achieve your business goals.
            
            We will get in touch with you shortly.

            Regards
            Team Blitzday.ai
            `
    };

    await transporter.sendMail(mailOptions);
    await transporter.sendMail(mailOptionsClient);

    ApiResponse.result(res, { isScheduled: true }, httpStatusCodes.OK);
}



export default {
    saveMeeting,
    getAllMeetings,
    getSingleMeeting,
    updateMeeting,
    scheduleDemo
};
