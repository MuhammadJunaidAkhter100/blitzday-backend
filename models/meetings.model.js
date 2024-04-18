import * as mongoose from 'mongoose';

const meetingsSchema = new mongoose.Schema(
    {
        userEmail: {
            // user email
            type: String,
            required: true,
        },
        meetingId: {
            // recorded meeting id
            type: String,
        },
        name: {
            // meeting name
            type: String,
            required: true,
        },
        time: {
            // meeting time
            type: String,
            required: true,
        },
        details: {
            type: String,
        }
    },
    { timestamps: true },
);

const meetingsModel = mongoose.model('Meetings', meetingsSchema, 'meetings');

export { meetingsModel };
