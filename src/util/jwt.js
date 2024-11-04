import 'dotenv/config';
import jwt from "jsonwebtoken";

function sign(data) {
    const token = jwt.sign(data, '~e.3x2<o2i#y_e~08z?d*!w~(g:qrl1e,w;{,e<hphhl,1e!@v(1].*d>l`kfpj', { expiresIn: '10d' })
    return token;
}

function verify(token) {

    return jwt.verify(token, '~e.3x2<o2i#y_e~08z?d*!w~(g:qrl1e,w;{,e<hphhl,1e!@v(1].*d>l`kfpj', function (err, decoded) {
        if (err) return null;

        return decoded;
    });
}

export { sign, verify };