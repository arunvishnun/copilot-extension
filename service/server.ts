import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { config } from 'dotenv';
import { getFrameworkSnippets } from './src/analyzeFramework';

config(); // Load environment variables from .env file

const fastify = Fastify({ logger: true });

interface SnippetsQuery {
    owner: string;
    repo: string;
    ref: string;
}

fastify.get('/snippets', async (request: FastifyRequest<{ Querystring: SnippetsQuery }>, reply: FastifyReply) => {
    const { owner, repo, ref } = request.query;

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders();

    try {
        const snippets = await getFrameworkSnippets(owner, repo, ref);
        snippets.forEach(snippet => {
            reply.raw.write(`data: ${JSON.stringify(snippet)}\n\n`);
        });
        reply.raw.end();
    } catch (error) {
        reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
        reply.raw.end();
    }
});

const start = async () => {
    try {
        const port = process.env.PORT || 3000;
        await fastify.listen({ port: Number(port) });
        fastify.log.info(`Server is running on port ${port}`);
    } catch (err: any) {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${err.port} is already in use. Trying another port...`);
            const newPort = Number(err.port) + 1;
            await fastify.listen({ port: newPort });
            fastify.log.info(`Server is running on port ${newPort}`);
        } else {
            fastify.log.error(err);
            process.exit(1);
        }
    }
};

start();