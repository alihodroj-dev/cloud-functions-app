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
            
            // Get open issues count (isResolved = 0 or false)
            const openResult = await pool.request().query(
                "SELECT COUNT(*) as [open] FROM issues WHERE isResolved = 0"
            );
            const openIssues = openResult.recordset[0].open;
            
            // Get resolved issues count (isResolved = 1 or true)
            const resolvedResult = await pool.request().query(
                "SELECT COUNT(*) as resolved FROM issues WHERE isResolved = 1"
            );
            const resolvedIssues = resolvedResult.recordset[0].resolved;
            
            // Get high severity open issues count
            const highSeverityResult = await pool.request().query(
                "SELECT COUNT(*) as highSeverity FROM issues WHERE isResolved = 0 AND severity = 'high'"
            );
            const highSeverityOpen = highSeverityResult.recordset[0].highSeverity;
            
            // Generate HTML page
            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Issue Tracker Summary</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px;
            max-width: 600px;
            width: 100%;
        }
        h1 {
            color: #333;
            margin-bottom: 30px;
            text-align: center;
            font-size: 28px;
            font-weight: 600;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .stat-value {
            font-size: 36px;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 8px;
        }
        .stat-label {
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .stat-card.high-severity {
            background: #fff5f5;
        }
        .stat-card.high-severity .stat-value {
            color: #e53e3e;
        }
        .stat-card.resolved {
            background: #f0fff4;
        }
        .stat-card.resolved .stat-value {
            color: #38a169;
        }
        .stat-card.open {
            background: #ebf8ff;
        }
        .stat-card.open .stat-value {
            color: #3182ce;
        }
        .footer {
            text-align: center;
            color: #999;
            font-size: 12px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        @media (max-width: 480px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
            .container {
                padding: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Issue Tracker Dashboard</h1>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${totalIssues}</div>
                <div class="stat-label">Total Issues</div>
            </div>
            <div class="stat-card open">
                <div class="stat-value">${openIssues}</div>
                <div class="stat-label">Open Issues</div>
            </div>
            <div class="stat-card resolved">
                <div class="stat-value">${resolvedIssues}</div>
                <div class="stat-label">Resolved Issues</div>
            </div>
            <div class="stat-card high-severity">
                <div class="stat-value">${highSeverityOpen}</div>
                <div class="stat-label">High Severity Open</div>
            </div>
        </div>
        <div class="footer">
            Last updated: ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>
            `;
            
            return {
                status: 200,
                headers: {
                    'Content-Type': 'text/html',
                },
                body: html,
            };
        } catch (error) {
            context.error('Failed to fetch issue summary', error);
            const errorHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - Issue Tracker Summary</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px;
            max-width: 500px;
            text-align: center;
        }
        h1 {
            color: #e53e3e;
            margin-bottom: 20px;
        }
        p {
            color: #666;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Error</h1>
        <p>Failed to fetch issue summary</p>
        <p style="margin-top: 10px; font-size: 14px; color: #999;">${error.message}</p>
    </div>
</body>
</html>
            `;
            return {
                status: 500,
                headers: {
                    'Content-Type': 'text/html',
                },
                body: errorHtml,
            };
        }
    }
});
