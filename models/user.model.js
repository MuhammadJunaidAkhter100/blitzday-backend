import * as mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        name: {
            // user name
            type: String,
            required: true,
        },
        email: {
            // user email
            type: String,
            required: true,
        },
        companyName: {
            type: String,
        },
        ownerCompanyEmail: {
            // owner company email
            type: String,
            required: false, 
        },
        password: {
            // user password
            type: String,
            required: true,
        },
        role: {
           // user password
           type: String,
           required: true, 
        },
        resetToken: {
            // user password
            type: String,
            required: false, 
         },
    },
    { timestamps: true },
);

const userModel = mongoose.model('User', userSchema, 'user');

export { userModel };
