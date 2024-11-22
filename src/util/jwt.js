import 'dotenv/config';
import jwt from 'jsonwebtoken';

// Utilize a variável de ambiente AUTH_SECRET
const authSecret = "~e.3x2<o2i#y_e~08z?d*!w~(g:qrl1e,w;{,e<hphhl,1e!@v(1].*d>l`kfpj";

function sign(data) {
    // Use a chave secreta do .env para criar o token
    const token = jwt.sign(data, authSecret, { expiresIn: '10d' });
    return token;
}

function verify(token) {
    // Use a chave secreta do .env para verificar o token
    return jwt.verify(token, authSecret, function (err, decoded) {
        if (err) return null;

        return decoded;
    });
}

export { sign, verify };
