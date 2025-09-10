import jwt from 'jsonwebtoken';

const JWT_EXPIRATION = '1h';

function generateToken(user) {
	return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

function verifyToken(token) {
	return jwt.verify(token, process.env.JWT_SECRET);
}

export { generateToken, verifyToken };