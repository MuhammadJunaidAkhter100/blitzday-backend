import jwt from 'jsonwebtoken';

const isAuthenticated = (req, res, next) => {
    const authToken = req.headers.authorization;

    if (!authToken) {
        throw new Error('Not authenticated.');
    }

    let decodedToken;
    try {
        decodedToken = jwt.verify(authToken, process.env.JWT_SECRET);
    } catch (err) {
        throw new Error('Not authenticated.');
    }
    req.email = decodedToken.email;
    next();
};

export default isAuthenticated;
