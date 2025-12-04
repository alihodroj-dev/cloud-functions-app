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

app.http('GetIssueSummary', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);
        
        try {
            const pool = await getPool();
            
            // Get total issues count
            const totalResult = await pool.request().query('SELECT COUNT(*) as total FROM issues');
            const totalIssues = totalResult.recordset[0].total;
            
            // Get open issues count
            const openResult = await pool.request().query(
                "SELECT COUNT(*) as open FROM issues WHERE status = 'open'"
            );
            const openIssues = openResult.recordset[0].open;
            
            // Get resolved issues count
            const resolvedResult = await pool.request().query(
                "SELECT COUNT(*) as resolved FROM issues WHERE status = 'resolved'"
            );
            const resolvedIssues = resolvedResult.recordset[0].resolved;
            
            // Get high severity open issues count
            const highSeverityResult = await pool.request().query(
                "SELECT COUNT(*) as highSeverity FROM issues WHERE status = 'open' AND severity = 'high'"
            );
            const highSeverityOpen = highSeverityResult.recordset[0].highSeverity;
            
            const summary = {
                totalIssues,
                openIssues,
                resolvedIssues,
                highSeverityOpen
            };
            
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
                jsonBody: summary,
            };
        } catch (error) {
            context.error('Failed to fetch issue summary', error);
            return {
                status: 500,
                jsonBody: {
                    error: 'Failed to fetch issue summary',
                    details: error.message,
                },
            };
        }
    }
});
