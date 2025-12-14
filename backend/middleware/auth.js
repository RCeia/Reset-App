const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    jwt.verify(token, 'secret_key', (err, decoded) => {
        if (err) return res.status(401).json({ success: false, error: 'Invalid token' });
        req.userId = decoded.id;
        next();
    });
};