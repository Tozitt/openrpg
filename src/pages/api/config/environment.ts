import { NextApiRequest } from 'next';
import { Environment } from '../../../utils/config';
import prisma from '../../../utils/database';
import { NextApiResponseServerIO } from '../../../utils/socket';

export default async function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
    const value: Environment = req.body.value;

    if (value === undefined) {
        res.status(400).end();
        return;
    }

    await prisma.config.update({
        where: { name: 'environment' },
        data: { value }
    });

    res.end();

    res.socket.server.io?.emit('environmentChange', value);
}