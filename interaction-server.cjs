try { require('dotenv').config(); } catch(e) {}

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.VITE_MODEL || 'gemini-2.5-flash';

const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const KB_FILE = path.join(__dirname, 'src/data/knowledgeBase.md');
const SIGNAL_FILE = path.join(__dirname, 'interaction-signals.json');
const FEEDBACK_QUEUE_PATH = path.join(DATA_DIR, 'feedbackQueue.json');
const KB_VERSIONS_PATH = path.join(DATA_DIR, 'kbVersions.json');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

let state = { sent: false, confirmed: false, signals: {} };
let runningProcesses = new Map();

// Initialize files on startup
if (!fs.existsSync(SIGNAL_FILE)) fs.writeFileSync(SIGNAL_FILE, JSON.stringify({ APPROVE_ANOMALY_REVIEW: false }, null, 4));
if (!fs.existsSync(FEEDBACK_QUEUE_PATH)) fs.writeFileSync(FEEDBACK_QUEUE_PATH, '[]');
if (!fs.existsSync(KB_VERSIONS_PATH)) fs.writeFileSync(KB_VERSIONS_PATH, '[]');
if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

const BASE_PROCESSES_FILE = path.join(DATA_DIR, 'base_processes.json');
const PROCESSES_FILE = path.join(DATA_DIR, 'processes.json');
if (!fs.existsSync(PROCESSES_FILE) && fs.existsSync(BASE_PROCESSES_FILE)) {
    fs.copyFileSync(BASE_PROCESSES_FILE, PROCESSES_FILE);
}

const getMimeType = (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimes = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.pdf': 'application/pdf', '.webm': 'video/webm', '.mp4': 'video/mp4', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.jsx': 'application/javascript', '.md': 'text/markdown' };
    return mimes[ext] || 'application/octet-stream';
};

const callGemini = async (messages, systemPrompt) => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction: systemPrompt });
    const history = messages.slice(0, -1).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const lastMessage = messages[messages.length - 1];
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text();
};

const server = http.createServer(async (req, res) => {
    const cleanPath = req.url.split('?')[0];
    const query = req.url.includes('?') ? req.url.split('?')[1] : '';

    if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders);
        res.end();
        return;
    }

    if (cleanPath === '/reset') {
        state = { sent: false, confirmed: false, signals: {} };
        console.log('Demo Reset Triggered');

        fs.writeFileSync(SIGNAL_FILE, JSON.stringify({ APPROVE_ANOMALY_REVIEW: false }, null, 4));

        runningProcesses.forEach((proc) => { try { process.kill(-proc.pid, 'SIGKILL'); } catch (e) { } });
        runningProcesses.clear();

        exec('pkill -9 -f "node(.*)simulation_scripts" || true', (err) => {
            setTimeout(() => {
                const cases = [
                    {
                        id: "BILL_001",
                        name: "Mercedes Benz Monthly Billing Cycle (March 2025)",
                        category: "Billing Operations",
                        stockId: "INV-2025-03-001",
                        year: new Date().toISOString().split('T')[0],
                        status: "In Progress",
                        currentStatus: "Initializing billing cycle...",
                        clientName: "Mercedes Benz",
                        clientCode: "AE123456",
                        contractTotal: "$1,000,000",
                        projectManager: "John Smith"
                    }
                ];
                fs.writeFileSync(PROCESSES_FILE, JSON.stringify(cases, null, 4));
                fs.writeFileSync(path.join(DATA_DIR, 'process_BILL_001.json'), JSON.stringify({
                    logs: [],
                    keyDetails: {
                        "Client": "Mercedes Benz",
                        "Client Code": "AE123456",
                        "Contract Date": "07/21/2021",
                        "Term": "5 Years",
                        "Total Amount": "$1,000,000",
                        "PO Reference": "473283819398374",
                        "Project Name": "Billing Operations",
                        "Project Manager": "John Smith",
                        "Client POC": "Adam Taylor",
                        "Billing Period": "March 2025"
                    }
                }, null, 4));
                fs.writeFileSync(FEEDBACK_QUEUE_PATH, '[]');
                fs.writeFileSync(KB_VERSIONS_PATH, '[]');

                const scripts = [
                    { file: 'billing_story_1.cjs', id: 'BILL_001' }
                ];
                let totalDelay = 0;
                scripts.forEach((script) => {
                    setTimeout(() => {
                        const scriptPath = path.join(__dirname, 'simulation_scripts', script.file);
                        const child = exec(`node "${scriptPath}" > "${scriptPath}.log" 2>&1`, (error) => {
                            if (error && error.code !== 0) console.error(`${script.file} error:`, error.message);
                            runningProcesses.delete(script.id);
                        });
                        if (child.pid) child.unref();
                        runningProcesses.set(script.id, child);
                    }, totalDelay * 1000);
                    totalDelay += 2;
                });
            }, 1000);
        });

        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    if (cleanPath === '/email-status' && req.method === 'GET') {
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sent: state.sent }));
        return;
    }

    if (cleanPath === '/email-status' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { const parsed = JSON.parse(body); state.sent = parsed.sent; } catch (e) { }
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        });
        return;
    }

    if (cleanPath === '/signal' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const parsed = JSON.parse(body);
                let signals = {};
                if (fs.existsSync(SIGNAL_FILE)) { try { signals = JSON.parse(fs.readFileSync(SIGNAL_FILE, 'utf8')); } catch(e) {} }
                signals[parsed.signal] = true;
                fs.writeFileSync(SIGNAL_FILE, JSON.stringify(signals, null, 4));
            } catch (e) { }
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        });
        return;
    }

    if (cleanPath === '/signal-status' && req.method === 'GET') {
        let signals = {};
        if (fs.existsSync(SIGNAL_FILE)) { try { signals = JSON.parse(fs.readFileSync(SIGNAL_FILE, 'utf8')); } catch(e) {} }
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(signals));
        return;
    }

    if (cleanPath === '/api/update-status' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { id, status, currentStatus } = JSON.parse(body);
                if (fs.existsSync(PROCESSES_FILE)) {
                    const processes = JSON.parse(fs.readFileSync(PROCESSES_FILE, 'utf8'));
                    const idx = processes.findIndex(p => p.id === String(id));
                    if (idx !== -1) { processes[idx].status = status; processes[idx].currentStatus = currentStatus; fs.writeFileSync(PROCESSES_FILE, JSON.stringify(processes, null, 4)); }
                }
            } catch (e) { }
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        });
        return;
    }

    if (cleanPath === '/api/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const parsed = JSON.parse(body);
                let response;
                if (parsed.messages && parsed.systemPrompt) {
                    response = await callGemini(parsed.messages, parsed.systemPrompt);
                } else {
                    const kbContent = parsed.knowledgeBase || '';
                    const systemPrompt = `You are a helpful AI assistant for DXC's Billing Operations team. Use the following knowledge base to answer questions:\n\n${kbContent}`;
                    const history = (parsed.history || []).map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content }));
                    const messages = [...history, { role: 'user', content: parsed.message }];
                    response = await callGemini(messages, systemPrompt);
                }
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ response }));
            } catch (e) {
                res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    if (cleanPath === '/api/feedback/questions' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { feedback, knowledgeBase } = JSON.parse(body);
                const prompt = `Based on this feedback about the billing operations knowledge base, generate 3 clarifying questions to better understand the needed change:\n\nFeedback: ${feedback}\n\nKnowledge Base excerpt: ${(knowledgeBase || '').substring(0, 2000)}\n\nReturn ONLY a JSON array of 3 question strings, no other text.`;
                const response = await callGemini([{ role: 'user', content: prompt }], 'You are a helpful assistant that generates clarifying questions for knowledge base feedback.');
                let questions;
                try { questions = JSON.parse(response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()); } catch(e) { questions = ["What specific section needs updating?", "What is the correct information?", "Is this a factual correction or process change?"]; }
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ questions }));
            } catch (e) {
                res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    if (cleanPath === '/api/feedback/summarize' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { feedback, questions, answers, knowledgeBase } = JSON.parse(body);
                const qaText = questions.map((q, i) => `Q: ${q}\nA: ${answers[i] || 'N/A'}`).join('\n\n');
                const prompt = `Summarize this knowledge base feedback into a clear, actionable proposal:\n\nOriginal feedback: ${feedback}\n\nClarifications:\n${qaText}\n\nProvide a 2-3 sentence summary of what change should be made to the knowledge base.`;
                const summary = await callGemini([{ role: 'user', content: prompt }], 'You are a helpful assistant that summarizes feedback into actionable proposals.');
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ summary }));
            } catch (e) {
                res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    if (cleanPath === '/api/feedback/queue' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const item = JSON.parse(body);
                let queue = [];
                if (fs.existsSync(FEEDBACK_QUEUE_PATH)) { try { queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8')); } catch(e) {} }
                queue.push({ ...item, status: 'pending', timestamp: new Date().toISOString() });
                fs.writeFileSync(FEEDBACK_QUEUE_PATH, JSON.stringify(queue, null, 4));
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            } catch (e) {
                res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    if (cleanPath === '/api/feedback/queue' && req.method === 'GET') {
        let queue = [];
        if (fs.existsSync(FEEDBACK_QUEUE_PATH)) { try { queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8')); } catch(e) {} }
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ queue }));
        return;
    }

    const deleteMatch = cleanPath.match(/^\/api\/feedback\/queue\/(.+)$/);
    if (deleteMatch && req.method === 'DELETE') {
        const feedbackId = deleteMatch[1];
        let queue = [];
        if (fs.existsSync(FEEDBACK_QUEUE_PATH)) { try { queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8')); } catch(e) {} }
        queue = queue.filter(item => item.id !== feedbackId);
        fs.writeFileSync(FEEDBACK_QUEUE_PATH, JSON.stringify(queue, null, 4));
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    if (cleanPath === '/api/feedback/apply' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { feedbackId } = JSON.parse(body);
                let queue = [];
                if (fs.existsSync(FEEDBACK_QUEUE_PATH)) { try { queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8')); } catch(e) {} }
                const item = queue.find(q => q.id === feedbackId);
                if (!item) { res.writeHead(404, corsHeaders); res.end(JSON.stringify({ error: 'Not found' })); return; }
                const currentKB = fs.existsSync(KB_FILE) ? fs.readFileSync(KB_FILE, 'utf8') : '';
                const prompt = `Update this knowledge base based on the following approved feedback. Return ONLY the updated knowledge base content, no commentary:\n\nCurrent KB:\n${currentKB}\n\nApproved change: ${item.summary}`;
                const updatedKB = await callGemini([{ role: 'user', content: prompt }], 'You are a knowledge base editor. Apply the requested change precisely.');
                const ts = Date.now();
                const prevFile = `kb_v${ts}_prev.md`;
                const snapFile = `kb_v${ts}_snap.md`;
                fs.writeFileSync(path.join(SNAPSHOTS_DIR, prevFile), currentKB);
                fs.writeFileSync(KB_FILE, updatedKB);
                fs.writeFileSync(path.join(SNAPSHOTS_DIR, snapFile), updatedKB);
                let versions = [];
                if (fs.existsSync(KB_VERSIONS_PATH)) { try { versions = JSON.parse(fs.readFileSync(KB_VERSIONS_PATH, 'utf8')); } catch(e) {} }
                versions.unshift({ id: String(ts), timestamp: new Date().toISOString(), snapshotFile: snapFile, previousFile: prevFile, changes: [item.summary] });
                fs.writeFileSync(KB_VERSIONS_PATH, JSON.stringify(versions, null, 4));
                queue = queue.filter(q => q.id !== feedbackId);
                fs.writeFileSync(FEEDBACK_QUEUE_PATH, JSON.stringify(queue, null, 4));
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, content: updatedKB }));
            } catch (e) {
                res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    if (cleanPath === '/api/kb/content' && req.method === 'GET') {
        try {
            const versionId = query.includes('versionId=') ? query.split('versionId=')[1] : null;
            if (versionId) {
                let versions = [];
                if (fs.existsSync(KB_VERSIONS_PATH)) { try { versions = JSON.parse(fs.readFileSync(KB_VERSIONS_PATH, 'utf8')); } catch(e) {} }
                const version = versions.find(v => v.id === versionId);
                if (version) {
                    const snapPath = path.join(SNAPSHOTS_DIR, version.snapshotFile);
                    const content = fs.existsSync(snapPath) ? fs.readFileSync(snapPath, 'utf8') : '';
                    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ content }));
                    return;
                }
            }
            const content = fs.existsSync(KB_FILE) ? fs.readFileSync(KB_FILE, 'utf8') : '';
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ content }));
        } catch (e) {
            res.writeHead(500, corsHeaders);
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    if (cleanPath === '/api/kb/versions' && req.method === 'GET') {
        let versions = [];
        if (fs.existsSync(KB_VERSIONS_PATH)) { try { versions = JSON.parse(fs.readFileSync(KB_VERSIONS_PATH, 'utf8')); } catch(e) {} }
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ versions }));
        return;
    }

    const snapMatch = cleanPath.match(/^\/api\/kb\/snapshot\/(.+)$/);
    if (snapMatch && req.method === 'GET') {
        const filename = snapMatch[1];
        const snapPath = path.join(SNAPSHOTS_DIR, filename);
        if (fs.existsSync(snapPath)) {
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'text/markdown' });
            res.end(fs.readFileSync(snapPath, 'utf8'));
        } else {
            res.writeHead(404, corsHeaders);
            res.end('Not found');
        }
        return;
    }

    if (cleanPath === '/api/kb/update' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { content } = JSON.parse(body);
                fs.writeFileSync(KB_FILE, content);
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            } catch (e) {
                res.writeHead(500, corsHeaders);
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    if (cleanPath === '/debug-paths') {
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ dataDir: DATA_DIR, exists: fs.existsSync(DATA_DIR), files: fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR) : [] }));
        return;
    }

    // Static file serving
    let filePath = path.join(PUBLIC_DIR, cleanPath === '/' ? 'index.html' : cleanPath);
    if (!fs.existsSync(filePath)) filePath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.writeHead(200, { ...corsHeaders, 'Content-Type': getMimeType(filePath) });
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.writeHead(404, corsHeaders);
        res.end('Not found');
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`DXC Billing Operations server running on port ${PORT}`);
});
