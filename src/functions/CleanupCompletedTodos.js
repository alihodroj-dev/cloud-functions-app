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

app.timer('CleanupCompletedTodos', {
    schedule: '0 */5 * * * *',
    handler: async (_myTimer, context) => {
        context.log('CleanupCompletedTodos triggered.');
        try {
            const pool = await getPool();
            const deleteQuery = `
                DELETE FROM todos
                WHERE completed = 1
                  AND completed_at <= DATEADD(minute, -5, SYSUTCDATETIME())
            `;
            const result = await pool.request().query(deleteQuery);
            const deletedCount = Array.isArray(result.rowsAffected) ? result.rowsAffected[0] : 0;
            context.log(`Removed ${deletedCount} completed todos older than 5 minutes.`);
        } catch (error) {
            context.log.error('Failed to clean up completed todos', error);
        }
    }
});
