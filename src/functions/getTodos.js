const { app } = require('@azure/functions');
const sql = require('mssql');

const connectionString = process.env.DB_CONNECTION_STRING;

let poolPromise;

const getPool = async () => {
    if (!poolPromise) {
        if (!connectionString) {
            throw new Error('Missing DB_CONNECTION_STRING setting');
        }
        poolPromise = sql.connect(connectionString);
    }
    return poolPromise;
};

app.http('getTodos', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Fetching todos for url "${request.url}"`);
        try {
            const pool = await getPool();
            const result = await pool.request().query('SELECT * FROM todos');

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
                jsonBody: result.recordset,
            };
        } catch (error) {
            context.error('Failed to fetch todos', error);
            return {
                status: 500,
                jsonBody: {
                    error: 'Failed to fetch todos',
                    details: error.message,
                },
            };
        }
    }
});