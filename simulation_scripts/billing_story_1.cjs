const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "BILL_001";
const CASE_NAME = "Mercedes Benz Monthly Billing Cycle (March 2025)";

const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []);
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 4));
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const updateProcessLog = (processId, logEntry, keyDetailsUpdate = {}) => {
    const processFile = path.join(PUBLIC_DATA_DIR, `process_${processId}.json`);
    let data = { logs: [], keyDetails: {}, sidebarArtifacts: [] };
    if (fs.existsSync(processFile)) data = readJson(processFile);
    if (logEntry) {
        const existingIdx = logEntry.id ? data.logs.findIndex(l => l.id === logEntry.id) : -1;
        if (existingIdx !== -1) {
            data.logs[existingIdx] = { ...data.logs[existingIdx], ...logEntry };
        } else {
            data.logs.push(logEntry);
        }
    }
    if (keyDetailsUpdate && Object.keys(keyDetailsUpdate).length > 0) {
        data.keyDetails = { ...data.keyDetails, ...keyDetailsUpdate };
    }
    writeJson(processFile, data);
};

const updateProcessListStatus = async (processId, status, currentStatus) => {
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:3001';
    try {
        const response = await fetch(`${apiUrl}/api/update-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: processId, status, currentStatus })
        });
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
    } catch (e) {
        try {
            const processes = JSON.parse(fs.readFileSync(PROCESSES_FILE, 'utf8'));
            const idx = processes.findIndex(p => p.id === String(processId));
            if (idx !== -1) {
                processes[idx].status = status;
                processes[idx].currentStatus = currentStatus;
                fs.writeFileSync(PROCESSES_FILE, JSON.stringify(processes, null, 4));
            }
        } catch (err) { }
    }
};

const waitForSignal = async (signalId) => {
    console.log(`Waiting for human signal: ${signalId}...`);
    const signalFile = path.join(__dirname, '../interaction-signals.json');
    for (let i = 0; i < 15; i++) {
        try {
            if (fs.existsSync(signalFile)) {
                const content = fs.readFileSync(signalFile, 'utf8');
                if (!content) continue;
                const signals = JSON.parse(content);
                if (signals[signalId]) {
                    delete signals[signalId];
                    const tempSignal = signalFile + '.' + Math.random().toString(36).substring(7) + '.tmp';
                    fs.writeFileSync(tempSignal, JSON.stringify(signals, null, 4));
                    fs.renameSync(tempSignal, signalFile);
                }
                break;
            }
        } catch (e) { await delay(Math.floor(Math.random() * 200) + 100); }
    }
    while (true) {
        try {
            if (fs.existsSync(signalFile)) {
                const content = fs.readFileSync(signalFile, 'utf8');
                if (content) {
                    const signals = JSON.parse(content);
                    if (signals[signalId]) {
                        console.log(`Signal ${signalId} received!`);
                        delete signals[signalId];
                        const tempSignal = signalFile + '.' + Math.random().toString(36).substring(7) + '.tmp';
                        fs.writeFileSync(tempSignal, JSON.stringify(signals, null, 4));
                        fs.renameSync(tempSignal, signalFile);
                        return true;
                    }
                }
            }
        } catch (e) { }
        await delay(1000);
    }
};

const waitForEmail = async () => {
    console.log("Waiting for user to send email...");
    const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';
    try {
        await fetch(`${API_URL}/email-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sent: false })
        });
    } catch (e) { console.error("Failed to reset email status", e); }
    while (true) {
        try {
            const response = await fetch(`${API_URL}/email-status`);
            if (response.ok) {
                const { sent } = await response.json();
                if (sent) { console.log("Email Sent!"); return true; }
            }
        } catch (e) { }
        await delay(2000);
    }
};

(async () => {
    console.log(`Starting ${PROCESS_ID}: ${CASE_NAME}...`);

    writeJson(path.join(PUBLIC_DATA_DIR, `process_${PROCESS_ID}.json`), {
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
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Retrieving invoicing input data per scheduler...",
            title_s: "Retrieved invoicing input data; email sent to delivery team for CCN confirmation",
            reasoning: [
                "Scheduler triggered billing cycle for March 2025 at 06:36 PM on April 1",
                "Retrieved DXC_MercedesBenzGroupAG 07.21.2021 contract from document repository",
                "Retrieved Statement of Work (SOW) linked to Contract AE123456",
                "Retrieved DXC_SPOC_LIST.xlsx identifying all team delivery contacts",
                "Sent contract and SOW to Delivery Team SPOC for CCN (Contract Change Notice) confirmation",
                "Subject: 'Request for Review — March 2025 Billing Cycle'"
            ],
            artifacts: [
                { id: "a1-contract", type: "file", label: "DXC_MercedesBenzGroupAG Contract", pdfPath: "/data/DXC_MercedesBenzGroupAG_Contract.pdf" },
                { id: "a1-sow", type: "file", label: "Statement of Work (SOW)", pdfPath: "/data/SOW.pdf" },
                { id: "a1-spoc", type: "file", label: "DXC SPOC List", pdfPath: "/data/DXC_SPOC_LIST.pdf" },
                { id: "a1-email", type: "email_draft", label: "Email: Request for Review", data: { isIncoming: false, to: "delivery.team@dxc.com", subject: "Request for Review — March 2025 Billing Cycle", body: "Please review the attached contract (AE123456) and SOW for Mercedes Benz and confirm any Contract Change Notices (CCN) applicable to the March 2025 billing cycle.\n\nAttachments: DXC_MercedesBenzGroupAG Contract, SOW.pdf\n\nRequired by: April 3, 2025\n\nRegards,\nDXC Billing Operations" } }
            ]
        },
        {
            id: "step-2",
            title_p: "Sending volumetric and T&M data collection emails to SPOCs...",
            title_s: "Emails sent to all SPOCs for invoicing volumetric and T&M data collection",
            reasoning: [
                "Identified 4 delivery teams requiring data submission: Infrastructure, Application, Data Center & Database",
                "Sent individual email to each team SPOC with data template and billing period details",
                "Data expected from all 4 teams by April 6, 2025 per billing cycle SLA",
                "Automated reminders configured for April 4 if responses not received",
                "Subject lines: 'March 2025 Billing — [Team Name] Data Submission Required'"
            ],
            artifacts: [
                { id: "a2-email1", type: "email_draft", label: "Email: Infrastructure Team", data: { isIncoming: false, to: "infra.spoc@dxc.com", subject: "March 2025 Billing — Infrastructure Volumetric Data Submission", body: "Please provide server count and storage volume data for March 2025.\n\nRequired fields: Active server count, new servers added, storage volume (TB), back-billing items.\n\nDeadline: April 6, 2025\n\nTemplate attached." } },
                { id: "a2-email2", type: "email_draft", label: "Email: Application Team", data: { isIncoming: false, to: "app.spoc@dxc.com", subject: "March 2025 Billing — Application Data Submission", body: "Please provide application resource usage data for March 2025 billing.\n\nDeadline: April 6, 2025." } },
                { id: "a2-email3", type: "email_draft", label: "Email: Data Center Team", data: { isIncoming: false, to: "dc.spoc@dxc.com", subject: "March 2025 Billing — Data Center Facilities Data Submission", body: "Please provide data center metrics for March 2025 billing.\n\nDeadline: April 6, 2025." } },
                { id: "a2-email4", type: "email_draft", label: "Email: Database Team", data: { isIncoming: false, to: "db.spoc@dxc.com", subject: "March 2025 Billing — Database Infrastructure Data Submission", body: "Please provide database infrastructure usage data for March 2025 billing.\n\nDeadline: April 6, 2025." } }
            ]
        },
        {
            id: "step-3",
            title_p: "Awaiting CCN confirmation from Delivery Team...",
            title_s: "Email confirmation received from Delivery Team — No change suggested",
            reasoning: [
                "Delivery Team SPOC replied on April 2 at 04:38 PM",
                "Confirmed: No Contract Change Notices (CCN) applicable for March 2025 billing period",
                "Contract terms remain as per AE123456 original agreement dated 07/21/2021",
                "Billing can proceed with existing contract rates and terms",
                "CCN check cleared — no pricing amendments or scope changes to apply"
            ],
            artifacts: [
                { id: "a3-reply", type: "email_draft", label: "Reply: CCN Confirmation", data: { isIncoming: true, from: "delivery.team@dxc.com", to: "billing.ops@dxc.com", subject: "Re: Request for Review — March 2025 Billing Cycle", body: "Hi Team,\n\nWe have reviewed the contract (AE123456) and SOW for Mercedes Benz.\n\nConfirmed: No Contract Change Notices (CCN) are applicable for the March 2025 billing cycle. All terms and pricing remain unchanged.\n\nPlease proceed with billing.\n\nRegards,\nDelivery Team SPOC" } }
            ]
        },
        {
            id: "step-4",
            title_p: "Extracting volumetric data from Infrastructure team response...",
            title_s: "Volumetric data received from Infrastructure team — server and storage data extracted",
            reasoning: [
                "Infrastructure team responded on April 3 at 05:36 PM — on-time delivery",
                "Extracted server inventory: 1,230 active servers as of March 31, 2025",
                "Identified 25 new servers added during March; 15 require back billing at $1,030 each",
                "Storage volume reported: 850 TB (up from expected 800 TB baseline)",
                "Data formatted and staged for consolidation with other team inputs",
                "Infrastructure Data file saved to billing workspace"
            ],
            artifacts: [
                { id: "a4-email", type: "email_draft", label: "Reply: Infrastructure Data", data: { isIncoming: true, from: "infra.spoc@dxc.com", to: "billing.ops@dxc.com", subject: "Re: March 2025 Billing — Infrastructure Volumetric Data Submission", body: "Please find attached the Infrastructure volumetric data for March 2025.\n\nHighlights:\n- Active Servers: 1,230 (25 new additions in March)\n- Storage Volume: 850 TB\n- Back-billing: 15 servers require back-billing ($1,030 each)\n\nPlease confirm receipt." } },
                { id: "a4-data", type: "file", label: "Infrastructure Volumetric Data", pdfPath: "/data/Infrastructure_Data.pdf" }
            ]
        },
        {
            id: "step-5",
            title_p: "Extracting volumetric data from Application team response...",
            title_s: "Volumetric data received from Application team — application usage data extracted",
            reasoning: [
                "Application team responded on April 3 at 06:36 PM — on-time delivery",
                "Extracted application server count: 340 instances for March 2025",
                "Licensing consumption within contract limits — no overages detected",
                "Application performance metrics within SLA thresholds",
                "Data staged for master billing feeder consolidation"
            ],
            artifacts: [
                { id: "a5-email", type: "email_draft", label: "Reply: Application Data", data: { isIncoming: true, from: "app.spoc@dxc.com", to: "billing.ops@dxc.com", subject: "Re: March 2025 Billing — Application Data Submission", body: "Attached is the March 2025 application usage data.\n\nApplication servers: 340 instances\nLicensing: within contracted limits\nNo overages to report.\n\nRegards,\nApplication Team" } },
                { id: "a5-data", type: "file", label: "Application Volumetric Data", pdfPath: "/data/Application_Data.pdf" }
            ]
        },
        {
            id: "step-6",
            title_p: "Checking data submission status across all teams...",
            title_s: "Missing billing data detected from 2 teams — automated reminders sent",
            reasoning: [
                "April 4, 08:36 PM: SLA deadline monitoring triggered",
                "Database Team has not responded — 3 days elapsed since initial request",
                "Data Center Facilities Team has not responded — 3 days elapsed since initial request",
                "Per billing SLA, automated reminders dispatched to both non-responding SPOCs",
                "Escalation window: 24 hours before estimate-based billing is triggered",
                "Reminder emails include original data template and updated deadline"
            ],
            artifacts: [
                { id: "a6-reminder1", type: "email_draft", label: "Reminder: Database Team", data: { isIncoming: false, to: "db.spoc@dxc.com", subject: "REMINDER: March 2025 Billing — Database Data Overdue", body: "This is an automated reminder. Your March 2025 billing data submission is now overdue.\n\nOriginal deadline: April 6, 2025\nUpdated deadline: April 5, 2025 (EOD)\n\nPlease submit immediately to avoid estimate-based billing.\n\nDXC Billing Operations" } },
                { id: "a6-reminder2", type: "email_draft", label: "Reminder: Data Center Team", data: { isIncoming: false, to: "dc.spoc@dxc.com", subject: "REMINDER: March 2025 Billing — Data Center Data Overdue", body: "This is an automated reminder. Your March 2025 billing data submission is now overdue.\n\nOriginal deadline: April 6, 2025\nUpdated deadline: April 5, 2025 (EOD)\n\nPlease submit immediately to avoid estimate-based billing.\n\nDXC Billing Operations" } }
            ]
        },
        {
            id: "step-7",
            title_p: "Requesting T&M project billing data from Project team...",
            title_s: "T&M project billing data received and extracted from Project team",
            reasoning: [
                "Sent request email to Project team for April 4 at 09:36 PM",
                "Project team responded with completed project charges and completion notices",
                "Extracted 3 T&M projects billed in March 2025",
                "Total project charges: $42,500 for March billing period",
                "Project completion notices verified against SOW milestones",
                "T&M data staged for master billing feeder"
            ],
            artifacts: [
                { id: "a7-email", type: "email_draft", label: "Email: T&M Data Request", data: { isIncoming: false, to: "project.team@dxc.com", subject: "March 2025 Billing — T&M Project Billing Data Required", body: "Please provide T&M project billing data for March 2025 including:\n- Project IDs and completion status\n- Hours billed per project\n- Project charges per completion notice\n\nDeadline: April 5, 2025 EOD" } },
                { id: "a7-reply", type: "email_draft", label: "Reply: T&M Project Data", data: { isIncoming: true, from: "project.team@dxc.com", to: "billing.ops@dxc.com", subject: "Re: March 2025 Billing — T&M Project Billing Data Required", body: "Attached is T&M billing data for March 2025.\n\nProject PMO-2025-001: $18,500 (completed)\nProject PMO-2025-003: $14,200 (completed)\nProject PMO-2025-007: $9,800 (milestone)\nTotal: $42,500\n\nCompletion notices attached." } },
                { id: "a7-data", type: "file", label: "T&M Project Billing Data", pdfPath: "/data/TM_Project_Billing_Data.pdf" }
            ]
        },
        {
            id: "step-8",
            title_p: "Awaiting Database team data submission...",
            title_s: "Volumetric data received from Database team following reminder",
            reasoning: [
                "Database team responded on April 5 at 01:20 PM — after automated reminder",
                "Extracted database server count: 180 instances for March 2025",
                "Storage allocation: 120 TB dedicated database storage",
                "No new database instances added in March — stable month-over-month",
                "Data incorporated into consolidated billing dataset"
            ],
            artifacts: [
                { id: "a8-email", type: "email_draft", label: "Reply: Database Data", data: { isIncoming: true, from: "db.spoc@dxc.com", to: "billing.ops@dxc.com", subject: "Re: March 2025 Billing — Database Data Submission", body: "Apologies for the delay. Please find March 2025 database data attached.\n\nDatabase servers: 180 instances\nStorage: 120 TB\nNew instances: None\n\nRegards,\nDatabase Team SPOC" } },
                { id: "a8-data", type: "file", label: "Database Volumetric Data", pdfPath: "/data/Database_Data.pdf" }
            ]
        },
        {
            id: "step-9",
            title_p: "Awaiting Data Center Facilities team data submission...",
            title_s: "Volumetric data received from Data Center team — all team data now collected",
            reasoning: [
                "Data Center Facilities team responded on April 5 at 06:36 PM — after automated reminder",
                "Extracted PUE (Power Usage Effectiveness): 1.42 for March 2025",
                "Rack space: 85 racks occupied out of 100 allocated",
                "Cooling and power metrics within contracted thresholds",
                "All 4 team data submissions now complete — ready for consolidation",
                "T&M project data also confirmed complete from Project team"
            ],
            artifacts: [
                { id: "a9-email", type: "email_draft", label: "Reply: Data Center Data", data: { isIncoming: true, from: "dc.spoc@dxc.com", to: "billing.ops@dxc.com", subject: "Re: March 2025 Billing — Data Center Data Submission", body: "Apologies for the delay. Data Center metrics for March 2025 attached.\n\nPUE: 1.42\nRack occupancy: 85/100\nPower and cooling: within contracted limits\n\nRegards,\nData Center Facilities SPOC" } },
                { id: "a9-data", type: "file", label: "Data Center Volumetric Data", pdfPath: "/data/DataCenter_Data.pdf" }
            ]
        }
    ];

    const steps2 = [
        {
            id: "step-10",
            title_p: "Consolidating all team data and running anomaly detection...",
            title_s: "Data consolidation completed — anomalies detected; email sent to Infrastructure team for review",
            isHITL1: true,
            reasoning: [
                "All 5 team datasets loaded: Infrastructure, Application, Database, Data Center, T&M Projects",
                "ANOMALY 1: Storage volume reported as 850 TB vs baseline of 800 TB — variance of +50 TB (+6.25%)",
                "ANOMALY 2: 25 new servers identified; 15 require back billing at $1,030 each = $15,450 total",
                "Both anomalies flagged for Infrastructure team review before proceeding",
                "Email dispatched to Infrastructure SPOC: 'Request to Recheck March 2025 Server and Storage Data'",
                "Human review required — please confirm or correct the extracted values below"
            ],
            artifacts: [
                { id: "a10-email", type: "email_draft", label: "Email: Anomaly Review Request", data: { isIncoming: false, to: "infra.spoc@dxc.com", subject: "Request to Recheck March 2025 Server and Storage Data", body: "During data consolidation for March 2025 billing, two anomalies were detected in your submission:\n\n1. Storage Volume: 850 TB reported vs 800 TB baseline (+6.25% variance)\n2. New Servers: 25 added in March; 15 flagged for back billing at $1,030 each\n\nPlease confirm these values are correct or provide corrections by April 6 EOD.\n\nDXC Billing Operations" } }
            ],
            hitlOptions: ["Change extracted storage data to 800 TB", "Change extracted server data to 1245", "No change suggested"]
        },
        {
            id: "step-11",
            title_p: "Processing Infrastructure team anomaly response...",
            title_s: "Anomaly confirmation received — Infrastructure team confirmed data values are correct",
            reasoning: [
                "Infrastructure SPOC replied on April 6 at 09:22 PM",
                "Confirmed: Storage increase to 850 TB is accurate — new storage array deployed March 15",
                "Confirmed: 25 new servers added in March are correct; 15 require back billing",
                "Back billing applies from server activation dates ranging March 8–22, 2025",
                "Proceeding with extracted data values: 850 TB storage, 1,245 total servers (including 15 back-bill servers)",
                "Anomaly resolution documented for audit trail"
            ],
            artifacts: [
                { id: "a11-reply", type: "email_draft", label: "Reply: Anomaly Confirmation", data: { isIncoming: true, from: "infra.spoc@dxc.com", to: "billing.ops@dxc.com", subject: "Re: Request to Recheck March 2025 Server and Storage Data", body: "Hi Team,\n\nWe have reviewed the flagged anomalies and can confirm:\n\n1. Storage: 850 TB is correct. A new storage array was deployed on March 15, 2025 per project PMO-2025-INF-003.\n2. Servers: 25 new servers added in March is correct. 15 of these were activated mid-month and require back billing.\n\nPlease proceed with the submitted data values.\n\nRegards,\nInfrastructure SPOC" } }
            ]
        },
        {
            id: "step-12",
            title_p: "Collecting FX rates from Wall Street Journal for March 31, 2025...",
            title_s: "FX rates collected from Wall Street Journal — updated in COMPASS for all Resource Units",
            reasoning: [
                "Navigated to Wall Street Journal FX rate table for March 31, 2025 spot rates",
                "Extracted relevant currency pairs: EUR/USD, GBP/USD, INR/USD, AUD/USD, CAD/USD",
                "EUR/USD: 1.0842 | GBP/USD: 1.2634 | INR/USD: 0.01197 | AUD/USD: 0.6523 | CAD/USD: 0.7401",
                "All FX rates updated in COMPASS for active Resource Units in Mercedes Benz account",
                "Rate application date set to March 31, 2025 for all non-USD billing line items",
                "Browser session recorded for audit compliance"
            ],
            artifacts: [
                { id: "a12-video", type: "video", label: "WSJ FX Rate Extraction — Browser Recording", videoPath: "/data/wsj_fx_rate.webm" },
                { id: "a12-rates", type: "json", label: "Extracted FX Rates (March 31, 2025)", data: { "rate_date": "March 31, 2025", "source": "Wall Street Journal", "EUR_USD": "1.0842", "GBP_USD": "1.2634", "INR_USD": "0.01197", "AUD_USD": "0.6523", "CAD_USD": "0.7401", "compass_updated": "Yes", "resource_units_updated": 12 } }
            ]
        },
        {
            id: "step-13",
            title_p: "Initiating PO validation in COMPASS...",
            title_s: "PO validation completed — PO 473283819398374 is valid with sufficient balance",
            reasoning: [
                "PO validation initiated April 7 at 10:10 PM via COMPASS (www.compass.com)",
                "PO Reference: 473283819398374 — linked to Contract AE123456",
                "Validated PO validity: Active, not expired",
                "PO balance check: $285,000 remaining against $1,000,000 total — sufficient for March billing",
                "PO expiry date: July 21, 2026 — within contract term",
                "No issues identified — PO approved for billing against this cycle"
            ],
            artifacts: [
                { id: "a13-compass", type: "json", label: "COMPASS PO Validation — www.compass.com", data: { "system": "COMPASS", "url": "www.compass.com", "po_reference": "473283819398374", "client": "Mercedes Benz", "status": "VALID", "po_balance": "$285,000", "expiry_date": "07/21/2026", "validation_result": "APPROVED" } },
                { id: "a13-po", type: "file", label: "Mercedes PO Document", pdfPath: "/data/Mercedes_PO.pdf" }
            ]
        },
        {
            id: "step-14",
            title_p: "Running server count reconciliation and back billing calculation...",
            title_s: "Server count reconciliation completed — back billing of $15,450 calculated for 15 servers",
            reasoning: [
                "Total server count reconciled: 1,230 active + 15 back-billing = 1,245 billable servers",
                "Back-billing calculation: 15 servers × $1,030 = $15,450",
                "Pro-ration applied based on activation dates ranging March 8–22, 2025",
                "Server inventory cross-referenced against COMPASS asset register",
                "Discrepancy of 10 servers in decommissioning queue — excluded from billing per contract terms",
                "Reconciliation file updated with final billable server count and charges"
            ],
            artifacts: [
                { id: "a14-recon", type: "file", label: "Server Count Reconciliation", pdfPath: "/data/Server_Count_Reconciliation.pdf" }
            ]
        },
        {
            id: "step-15",
            title_p: "Running storage volume reconciliation and validation...",
            title_s: "Storage volume reconciliation completed — 850 TB confirmed as billable volume",
            reasoning: [
                "Storage volume reconciled: 850 TB across all storage tiers",
                "Tier 1 (SSD/NVMe): 120 TB | Tier 2 (SAS): 480 TB | Tier 3 (SATA/Archive): 250 TB",
                "New storage array (50 TB increment) validated against infrastructure deployment record",
                "Contract storage pricing tiers applied: Tier 1 at premium rate, Tier 2/3 at standard rates",
                "Month-over-month comparison: +50 TB increase from 800 TB baseline — documented",
                "Reconciliation file updated with final storage breakdown and pricing"
            ],
            artifacts: [
                { id: "a15-recon", type: "file", label: "Storage Volume Reconciliation", pdfPath: "/data/Storage_Volume_Reconciliation.pdf" }
            ]
        },
        {
            id: "step-16",
            title_p: "Identifying and flagging one-time charges...",
            title_s: "One-time charges identified and flagged — alert created to prevent re-billing",
            reasoning: [
                "Scanned billing dataset for non-recurring charges eligible for one-time billing",
                "Identified 2 one-time charges: Software license migration ($8,200) + Emergency support call ($1,850)",
                "Both charges verified against project records and approved by Project team",
                "One-time charge flags added in COMPASS to prevent duplication in April billing cycle",
                "Alert tag: 'BILLED-2025-03 — DO NOT RE-BILL' applied to both line items",
                "One-time charges register updated for audit trail"
            ],
            artifacts: [
                { id: "a16-charges", type: "file", label: "One-Time Charges Register", pdfPath: "/data/One_Time_Charges.pdf" }
            ]
        },
        {
            id: "step-17",
            title_p: "Finalizing master billing feeder with all validated data...",
            title_s: "Master billing feeder complete — all validations, back billing, and one-time flags incorporated",
            reasoning: [
                "Consolidated all team data into master billing feeder for single invoice",
                "Line items: Infrastructure (servers + storage), Application, Database, Data Center, T&M Projects, Back Billing, One-Time Charges",
                "Subtotal before discounts: $312,840",
                "Back billing included: $15,450 (15 servers)",
                "One-time charges included: $10,050",
                "All validations complete — feeder ready for discount and tax calculation"
            ],
            artifacts: [
                { id: "a17-feeder", type: "file", label: "Consolidated Final Invoice Feeder", pdfPath: "/data/Consolidated_Final_Invoice.pdf" }
            ]
        },
        {
            id: "step-18",
            title_p: "Calculating contract discount per agreement terms...",
            title_s: "Contract discount calculated and applied to billing feeder",
            reasoning: [
                "Contract AE123456 specifies volume-based discount of 8% on managed services",
                "Discount basis: managed services subtotal of $270,540 (excludes T&M and one-time charges)",
                "Discount amount: $21,643.20",
                "Annual commitment discount (3%): $8,116.20 applied on top of volume discount",
                "Total discount: $29,759.40",
                "Discount calculation verified against contract pricing schedule"
            ],
            artifacts: [
                { id: "a18-discount", type: "file", label: "Contract Discount Calculation", pdfPath: "/data/Contract_Discount.pdf" }
            ]
        },
        {
            id: "step-19",
            title_p: "Validating tax codes for all billing line items...",
            title_s: "Tax code validation completed — all line items correctly coded",
            reasoning: [
                "Tax code validation run against DXC tax matrix for all 14 billing line items",
                "US-based managed services: Applied federal + applicable state codes",
                "Cross-border T&M services: Tax treaty exemptions applied per contract",
                "One-time charges: Coded as professional services (0% tax per contract clause 8.3)",
                "All 14 line items validated — no tax code errors detected",
                "Tax validation report generated for SOX compliance"
            ],
            artifacts: [
                { id: "a19-tax", type: "file", label: "Tax Code Validation Report", pdfPath: "/data/Tax_Code_Validation.pdf" }
            ]
        },
        {
            id: "step-20",
            title_p: "Generating draft invoice DRAFT-2025-03-001...",
            title_s: "Draft invoice generated — all pricing, discounts, and tax codes validated",
            reasoning: [
                "Draft invoice DRAFT-2025-03-001 generated on April 11 at 11:36 AM",
                "Invoice covers Mercedes Benz managed services for March 2025",
                "Gross billing: $312,840 | Total discounts: $29,759.40 | Net billing: $283,080.60",
                "PO Reference 473283819398374 applied — verified against available PO balance",
                "Invoice formatted per DXC standard template and client contractual requirements",
                "Draft ready for internal stakeholder review and approval"
            ],
            artifacts: [
                { id: "a20-draft", type: "file", label: "Draft Invoice DRAFT-2025-03-001", pdfPath: "/data/DRAFT_2025_03_001.pdf" },
                { id: "a20-po", type: "file", label: "Mercedes PO (Reference)", pdfPath: "/data/Mercedes_PO.pdf" }
            ]
        }
    ];

    const steps3 = [
        {
            id: "step-21",
            title_p: "Distributing draft invoice for internal stakeholder approvals...",
            title_s: "Internal stakeholder approvals received — all teams have reviewed and approved the draft invoice",
            isHITL2: true,
            reasoning: [
                "Draft invoice DRAFT-2025-03-001 distributed to all 6 internal stakeholders on April 11",
                "Teams notified: Infrastructure, Application, Database, Data Center, Project, Finance",
                "Approval SLA: 48 hours (by April 13, 2025)",
                "All 6 teams confirmed approval — no objections or revisions requested",
                "Approval chain complete — invoice cleared for EPIC feeder upload"
            ],
            artifacts: [
                { id: "a21-req", type: "email_draft", label: "Email: Internal Approval Request", data: { isIncoming: false, to: "all.spocs@dxc.com", subject: "Request to Check and Confirm March 2025 Draft Invoice — AE123456", body: "Please review the attached draft invoice DRAFT-2025-03-001 for Mercedes Benz (March 2025).\n\nNet billing amount: $283,080.60\nPO Reference: 473283819398374\n\nPlease confirm your approval by April 13, 2025.\n\nDXC Billing Operations" } },
                { id: "a21-approval", type: "email_draft", label: "Reply: All Teams Approved", data: { isIncoming: true, from: "all.spocs@dxc.com", to: "billing.ops@dxc.com", subject: "Re: Request to Check and Confirm March 2025 Draft Invoice — AE123456", body: "All teams have reviewed DRAFT-2025-03-001 and confirm approval:\n\n✓ Infrastructure SPOC — Approved\n✓ Application SPOC — Approved\n✓ Database SPOC — Approved\n✓ Data Center SPOC — Approved\n✓ Project Team Lead — Approved\n✓ Finance Controller — Approved\n\nInvoice cleared for processing." } }
            ]
        },
        {
            id: "step-22",
            title_p: "Uploading billing feeder to EPIC system...",
            title_s: "EPIC feeder upload completed — sales order created in EPIC",
            reasoning: [
                "All required internal approvals received — cleared to upload to EPIC",
                "Uploaded Consolidated_Final_Invoice feeder to EPIC system (www.epic.com) on April 13",
                "Sales order SO-2025-03-AE123456 created in EPIC",
                "Feeder validation: 14 line items accepted, 0 rejected",
                "EPIC processing time: approximately 8 minutes for full ingestion",
                "Browser session recorded for audit compliance"
            ],
            artifacts: [
                { id: "a22-video", type: "video", label: "EPIC Invoice Upload — Browser Recording", videoPath: "/data/epic_invoice_upload.webm" },
                { id: "a22-so", type: "file", label: "EPIC Sales Order Confirmation", pdfPath: "/data/Sales_Order_EPIC.pdf" }
            ]
        },
        {
            id: "step-23",
            title_p: "Pushing data from EPIC to COMPASS and validating invoice...",
            title_s: "EPIC to COMPASS data push completed — invoice INV-1234-056 generated and validated",
            reasoning: [
                "Sales order SO-2025-03-AE123456 pushed from EPIC to COMPASS on April 13 at 06:36 PM",
                "COMPASS generated invoice INV-1234-056 from the EPIC sales order data",
                "Invoice accessible at: www.compass.coupa.com/INV-1234-056",
                "Validated COMPASS invoice against original EPIC sales order — all 14 line items match",
                "Invoice total: $283,080.60 — matches draft DRAFT-2025-03-001",
                "COMPASS invoice ready for SOX maker-checker review"
            ],
            artifacts: [
                { id: "a23-compass", type: "json", label: "COMPASS Invoice — www.compass.coupa.com/INV-1234-056", data: { "system": "COMPASS", "url": "www.compass.coupa.com/INV-1234-056", "invoice_number": "INV-1234-056", "client": "Mercedes Benz", "billing_period": "March 2025", "line_items": 14, "gross_amount": "$312,840.00", "discounts": "$29,759.40", "net_amount": "$283,080.60", "status": "READY FOR APPROVAL" } }
            ]
        },
        {
            id: "step-24",
            title_p: "Initiating SOX maker-checker approval process...",
            title_s: "SOX maker-checker approval received — Delivery Team approval confirmed",
            reasoning: [
                "SOX compliance requires independent maker-checker review of all invoices above $50,000",
                "Maker-checker reviewer (Finance Controller) validated invoice INV-1234-056 on April 14",
                "Checks performed: PO balance adequacy, contract pricing adherence, discount calculation accuracy, tax code correctness",
                "All checks passed — no exceptions noted",
                "Delivery Team concurrent approval confirmed on April 14 at 06:36 PM",
                "Invoice cleared for customer draft approval stage"
            ],
            artifacts: [
                { id: "a24-sox", type: "email_draft", label: "Email: SOX Maker-Checker Approval", data: { isIncoming: true, from: "finance.controller@dxc.com", to: "billing.ops@dxc.com", subject: "Re: Request to Check INV-1234-056 — SOX Maker-Checker Review", body: "SOX Maker-Checker Review Complete for INV-1234-056:\n\n✓ PO balance: Sufficient ($285,000 available)\n✓ Contract pricing: Correct per AE123456 schedule\n✓ Discounts: Correctly calculated (8% volume + 3% commitment)\n✓ Tax codes: All 14 line items correctly coded\n\nINVOICE APPROVED for customer submission.\n\nFinance Controller" } }
            ]
        },
        {
            id: "step-25",
            title_p: "Sending draft invoice to Mercedes Benz for customer approval...",
            title_s: "Customer draft approval received — Mercedes Benz has confirmed the invoice",
            reasoning: [
                "Draft invoice INV-1234-056 sent to Mercedes Benz client POC (Adam Taylor) on April 16",
                "Customer review window: 3 business days",
                "Adam Taylor (Client POC) confirmed approval on April 16 at 06:36 PM — same-day turnaround",
                "No revisions or disputes raised by customer",
                "Customer approval documented and stored for audit trail",
                "Invoice cleared for final respool and PDF generation"
            ],
            artifacts: [
                { id: "a25-approval", type: "email_draft", label: "Customer Approval: Mercedes Benz", data: { isIncoming: true, from: "adam.taylor@mercedes.com", to: "billing.ops@dxc.com", subject: "Re: Request to Check March 2025 Draft Invoice — DXC", body: "Hi DXC Billing Team,\n\nI have reviewed invoice INV-1234-056 for March 2025 managed services.\n\nInvoice details look correct. I confirm approval to proceed.\n\nAmount: $283,080.60\nPO Reference: 473283819398374\n\nPlease send the final invoice to billing@mercedes.com.\n\nRegards,\nAdam Taylor\nClient POC — Mercedes Benz" } }
            ]
        },
        {
            id: "step-26",
            title_p: "Respooling invoice data back to EPIC for final processing...",
            title_s: "Invoice data respool to EPIC completed — INV-1234-056 ready for PDF generation",
            reasoning: [
                "Final customer-approved invoice data respooled to EPIC on April 19 at 10:36 PM",
                "EPIC updated with final invoice status: APPROVED — ready for PDF generation",
                "Invoice accessible in EPIC at: www.epic.com/INV-1234-056",
                "Respool confirms all approvals are logged in EPIC audit trail",
                "EPIC status updated to 'Customer Approved — Final' for INV-1234-056",
                "System ready for final PDF generation and email delivery"
            ],
            artifacts: [
                { id: "a26-epic", type: "json", label: "EPIC Respool Confirmation — www.epic.com/INV-1234-056", data: { "system": "EPIC", "url": "www.epic.com/INV-1234-056", "invoice_number": "INV-1234-056", "respool_status": "COMPLETE", "approval_chain": "All approvals logged", "final_status": "Customer Approved — Final", "ready_for_delivery": true } }
            ]
        },
        {
            id: "step-27",
            title_p: "Generating final PDF invoice and running quality checklist...",
            title_s: "Final PDF invoice generated — quality checklist passed",
            reasoning: [
                "PDF invoice INV-1234-056.pdf generated on April 20 at 06:15 PM",
                "Quality checklist executed: 12-point validation covering formatting, figures, legal clauses",
                "Check 1: Invoice number and date — ✓",
                "Check 2: Client details and address — ✓",
                "Check 3: PO reference and billing period — ✓",
                "Check 4: All 14 line items present — ✓",
                "Check 5: Discounts and net amount — ✓",
                "Check 6: DXC banking details and payment terms — ✓",
                "PDF formatted per customer delivery requirements — ready for email dispatch"
            ],
            artifacts: [
                { id: "a27-pdf", type: "file", label: "Final Invoice INV-1234-056.pdf", pdfPath: "/data/INV_1234_056.pdf" }
            ]
        },
        {
            id: "step-28",
            title_p: "Delivering final invoice to Mercedes Benz billing team...",
            title_s: "Invoice delivered to Mercedes Benz (billing@mercedes.com) — billing cycle complete",
            isFinal: true,
            reasoning: [
                "Final invoice INV-1234-056.pdf emailed to billing@mercedes.com on April 20 at 09:36 PM",
                "Subject: 'DXC March'2025 Invoice'",
                "CC: John Smith (Project Manager), Finance Controller",
                "Payment terms: Net 30 days from invoice date (due May 20, 2025)",
                "Invoice amount: $283,080.60 against PO 473283819398374",
                "Billing cycle for March 2025 successfully completed in 20 days"
            ],
            artifacts: [
                { id: "a28-delivery", type: "email_draft", label: "Invoice Delivery Email", data: { isIncoming: false, to: "billing@mercedes.com", cc: "johnsmith@dxc.com; finance.controller@dxc.com", subject: "DXC March'2025 Invoice", body: "Dear Mercedes Benz Billing Team,\n\nPlease find attached your DXC invoice for managed services provided in March 2025.\n\nInvoice Number: INV-1234-056\nBilling Period: March 2025\nNet Amount: $283,080.60\nPO Reference: 473283819398374\nPayment Due: May 20, 2025 (Net 30)\n\nPlease don't hesitate to contact us with any queries.\n\nKind regards,\nDXC Billing Operations\nbilling.ops@dxc.com" } }
            ]
        }
    ];

    const allSteps = [...steps, ...steps2, ...steps3];

    for (let i = 0; i < allSteps.length; i++) {
        const step = allSteps[i];
        const isFinal = step.isFinal || false;

        updateProcessLog(PROCESS_ID, {
            id: step.id,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            title: step.title_p,
            status: "processing"
        });
        await updateProcessListStatus(PROCESS_ID, "In Progress", step.title_p);
        await delay(2200);

        if (step.isHITL1) {
            updateProcessLog(PROCESS_ID, {
                id: step.id,
                title: step.title_s,
                status: "warning",
                reasoning: step.reasoning || [],
                artifacts: step.artifacts || [],
                hitlOptions: step.hitlOptions || []
            });
            await updateProcessListStatus(PROCESS_ID, "Needs Attention", step.title_s);
            await waitForSignal("APPROVE_ANOMALY_REVIEW");
            await updateProcessListStatus(PROCESS_ID, "In Progress", "Anomaly confirmed — proceeding with extracted values");
            await delay(1500);
        } else if (step.isHITL2) {
            updateProcessLog(PROCESS_ID, {
                id: step.id,
                title: step.title_p,
                status: "warning",
                reasoning: step.reasoning || [],
                artifacts: step.artifacts || []
            });
            await updateProcessListStatus(PROCESS_ID, "Needs Attention", "Draft Review: Internal Approval Emails Pending");
            await waitForEmail();
            updateProcessLog(PROCESS_ID, {
                id: step.id,
                title: step.title_s,
                status: "success",
                reasoning: step.reasoning || [],
                artifacts: step.artifacts || []
            });
            await updateProcessListStatus(PROCESS_ID, "In Progress", "All stakeholder approvals received");
            await delay(1500);
        } else {
            updateProcessLog(PROCESS_ID, {
                id: step.id,
                title: step.title_s,
                status: isFinal ? "completed" : "success",
                reasoning: step.reasoning || [],
                artifacts: step.artifacts || []
            });
            await updateProcessListStatus(PROCESS_ID, isFinal ? "Done" : "In Progress", step.title_s);
            await delay(1500);
        }
    }

    console.log(`${PROCESS_ID} Complete: ${CASE_NAME}`);
})();
