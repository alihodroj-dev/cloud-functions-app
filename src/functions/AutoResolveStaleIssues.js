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

app.timer('AutoResolveStaleIssues', {
    schedule: '0 */5 * * * *', // Every 5 minutes
    handler: async (_myTimer, context) => {
        context.log('AutoResolveStaleIssues triggered.');
        try {
            const pool = await getPool();
            
            // Update low-severity issues older than 5 minutes to resolved
            const updateQuery = `
                UPDATE issues
                SET isResolved = 1
                WHERE isResolved = 0
                  AND severity = 'low'
                  AND createdAt <= DATEADD(minute, -5, SYSUTCDATETIME())
            `;
            
            const result = await pool.request().query(updateQuery);
            const updatedCount = Array.isArray(result.rowsAffected) ? result.rowsAffected[0] : 0;
            
            context.log(`Auto-resolved ${updatedCount} stale low-severity issues older than 5 minutes.`);
        } catch (error) {
            context.error('Failed to auto-resolve stale issues', error);
        }
    }
});
