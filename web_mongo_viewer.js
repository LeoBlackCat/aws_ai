const express = require('express');
const dbConnection = require('./db/connection');
const { Definition, ExtractionSession } = require('./db/models');

const app = express();
app.use(express.static('public'));
app.use(express.json());

// Serve definitions data
app.get('/api/definitions', async (req, res) => {
  try {
    await dbConnection.connect();
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const section = req.query.section || '';
    
    let query = {};
    
    if (search) {
      query.$or = [
        { concept: { $regex: search, $options: 'i' } },
        { definition: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (section) {
      query['source.section'] = section;
    }
    
    const definitions = await Definition.find(query)
      .sort({ 'source.section': 1, concept: 1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();
    
    const total = await Definition.countDocuments(query);
    const sections = await Definition.distinct('source.section');
    
    res.json({
      definitions,
      total,
      page,
      pages: Math.ceil(total / limit),
      sections
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve stats
app.get('/api/stats', async (req, res) => {
  try {
    await dbConnection.connect();
    
    const totalDefinitions = await Definition.countDocuments();
    const totalSections = (await Definition.distinct('source.section')).length;
    
    const sectionStats = await Definition.aggregate([
      {
        $group: {
          _id: '$source.section',
          count: { $sum: 1 },
          avgLength: { $avg: { $strLenCP: '$definition' } }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    const sessions = await ExtractionSession.find()
      .sort({ started_at: -1 })
      .limit(5)
      .lean();
    
    res.json({
      totalDefinitions,
      totalSections,
      sectionStats,
      sessions
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve HTML page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>AWS AI Definitions Database</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #4CAF50; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
        .stat-number { font-size: 24px; font-weight: bold; color: #4CAF50; }
        .search-bar { margin: 20px 0; display: flex; gap: 10px; flex-wrap: wrap; }
        .search-bar input, .search-bar select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; }
        .search-bar button { padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .definition-card { border: 1px solid #e0e0e0; border-radius: 5px; margin: 10px 0; padding: 15px; background: white; }
        .concept { font-weight: bold; color: #2196F3; font-size: 16px; }
        .section { color: #666; font-size: 12px; margin-bottom: 8px; }
        .definition { margin: 10px 0; line-height: 1.4; }
        .timestamp { color: #999; font-size: 12px; }
        .pagination { margin: 20px 0; text-align: center; }
        .pagination button { margin: 0 5px; padding: 8px 12px; border: 1px solid #ddd; background: white; cursor: pointer; }
        .pagination button.active { background: #4CAF50; color: white; border-color: #4CAF50; }
        .loading { text-align: center; padding: 20px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🗄️ AWS AI Definitions Database</h1>
            <p>Browse and search your extracted definitions</p>
        </div>
        
        <div class="content">
            <div id="stats" class="stats">
                <div class="stat-card">
                    <div class="stat-number" id="totalDefs">-</div>
                    <div>Total Definitions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="totalSections">-</div>
                    <div>Sections</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="avgLength">-</div>
                    <div>Avg Length</div>
                </div>
            </div>
            
            <div class="search-bar">
                <input type="text" id="searchInput" placeholder="Search concepts or definitions...">
                <select id="sectionSelect">
                    <option value="">All Sections</option>
                </select>
                <button onclick="loadDefinitions()">Search</button>
                <button onclick="clearSearch()">Clear</button>
            </div>
            
            <div id="definitions"></div>
            <div id="pagination" class="pagination"></div>
        </div>
    </div>

    <script>
        let currentPage = 1;
        let totalPages = 1;
        
        async function loadStats() {
            try {
                const response = await fetch('/api/stats');
                const data = await response.json();
                
                document.getElementById('totalDefs').textContent = data.totalDefinitions;
                document.getElementById('totalSections').textContent = data.totalSections;
                
                const avgLength = Math.round(data.sectionStats.reduce((sum, s) => sum + s.avgLength, 0) / data.sectionStats.length);
                document.getElementById('avgLength').textContent = avgLength + ' chars';
                
                // Populate sections dropdown
                const select = document.getElementById('sectionSelect');
                data.sectionStats.forEach(section => {
                    const option = document.createElement('option');
                    option.value = section._id;
                    option.textContent = section._id + ' (' + section.count + ')';
                    select.appendChild(option);
                });
                
            } catch (error) {
                console.error('Error loading stats:', error);
            }
        }
        
        async function loadDefinitions(page = 1) {
            currentPage = page;
            const search = document.getElementById('searchInput').value;
            const section = document.getElementById('sectionSelect').value;
            
            document.getElementById('definitions').innerHTML = '<div class="loading">Loading...</div>';
            
            try {
                const params = new URLSearchParams({
                    page,
                    search,
                    section,
                    limit: 10
                });
                
                const response = await fetch('/api/definitions?' + params);
                const data = await response.json();
                
                totalPages = data.pages;
                
                let html = '';
                data.definitions.forEach(def => {
                    html += \`
                        <div class="definition-card">
                            <div class="section">\${def.source.section} • \${def.source.file}</div>
                            <div class="concept">\${def.concept}</div>
                            <div class="definition">"\${def.definition}"</div>
                            <div class="timestamp">Extracted: \${new Date(def.extracted_at).toLocaleString()}</div>
                        </div>
                    \`;
                });
                
                document.getElementById('definitions').innerHTML = html || '<p>No definitions found.</p>';
                
                // Update pagination
                let paginationHtml = '';
                if (totalPages > 1) {
                    for (let i = 1; i <= totalPages; i++) {
                        paginationHtml += \`<button class="\${i === currentPage ? 'active' : ''}" onclick="loadDefinitions(\${i})">\${i}</button>\`;
                    }
                }
                document.getElementById('pagination').innerHTML = paginationHtml;
                
            } catch (error) {
                document.getElementById('definitions').innerHTML = '<p>Error loading definitions: ' + error.message + '</p>';
            }
        }
        
        function clearSearch() {
            document.getElementById('searchInput').value = '';
            document.getElementById('sectionSelect').value = '';
            loadDefinitions(1);
        }
        
        // Enter key search
        document.getElementById('searchInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loadDefinitions(1);
            }
        });
        
        // Load initial data
        loadStats();
        loadDefinitions();
    </script>
</body>
</html>
  `);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(\`🌐 MongoDB Web Viewer running at http://localhost:\${PORT}\`);
  console.log(\`📊 View your definitions database in your browser!\`);
});