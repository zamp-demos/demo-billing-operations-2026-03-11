# DXC Billing Operations — Knowledge Base

## Overview

DXC Technology's Billing Operations process manages end-to-end invoice generation and delivery for enterprise clients. This knowledge base covers the complete billing cycle for managed services contracts, including data collection, validation, FX rate management, and invoice delivery.

## Client: Mercedes Benz

- **Client Code**: AE123456
- **Contract Date**: 07/21/2021
- **Contract Term**: 5 Years
- **Total Contract Amount**: $1,000,000
- **PO Reference**: 473283819398374
- **Project Manager**: John Smith
- **Client POC**: Adam Taylor
- **Billing Email**: billing@mercedes.com

## Billing Cycle Timeline

The monthly billing cycle runs from the 1st to the 20th of each month following the billing period. For March 2025 billing, the cycle runs April 1–20, 2025.

| Phase | Timeline | Activity |
|-------|----------|----------|
| Data Collection | Days 1–6 | Email SPOCs for volumetric and T&M data |
| Consolidation | Days 6–8 | Merge all team inputs, validate anomalies |
| FX & PO Validation | Days 7–8 | Update FX rates, confirm PO validity |
| Reconciliation | Days 8–10 | Server count, storage, one-time charges |
| Draft Invoice | Days 10–11 | Generate draft, internal approvals |
| EPIC Processing | Days 13–14 | Upload feeder, push to COMPASS |
| Final Approvals | Days 14–16 | SOX maker-checker, customer approval |
| Invoice Delivery | Days 19–20 | Respool, PDF generation, email delivery |

## Data Sources

### Infrastructure Team
Provides server count and storage volume data monthly. Data includes:
- Active server count
- New server additions/removals
- Storage volume (TB)
- Back-billing requirements for new servers

### Application Team
Provides application-layer resource usage data including:
- Application server counts
- Licensing consumption
- Performance metrics

### Database Team
Provides database infrastructure usage:
- Database server instances
- Storage allocations
- Licensing metrics

### Data Center Facilities Team
Provides physical data center metrics:
- Power usage (PUE)
- Rack space consumption
- Cooling metrics

### Project Team (T&M)
Provides time-and-materials billing:
- Project completion notices
- Hours billed per project
- One-time project charges

## Key Systems

### COMPASS
- **URL**: www.compass.com / www.compass.coupa.com
- **Purpose**: DXC's internal billing and FX rate management system
- **Usage**: FX rate updates, PO validation, invoice generation, EPIC-to-COMPASS data push
- **Invoice Format**: /INV-{year}-{seq} (e.g., INV-1234-056)

### EPIC
- **URL**: www.epic.com
- **Purpose**: DXC's enterprise invoice platform
- **Usage**: Billing feeder upload, sales order creation, invoice respool
- **Feeder Format**: Consolidated_Final_Invoice.xlsx

### Wall Street Journal
- **URL**: www.wsj.com
- **Purpose**: External FX rate source (spot rates)
- **Usage**: Collect month-end spot rates (March 31, 2025) for all billing currencies

## FX Rate Process

1. Navigate to Wall Street Journal FX rate table
2. Extract spot rates as of March 31, 2025
3. Update rates in COMPASS for all active Resource Units
4. Rates apply to all non-USD billing line items

## Anomaly Handling

When data discrepancies are detected during consolidation:

| Anomaly Type | Threshold | Action |
|---|---|---|
| Storage variance | >5% from expected | Email infrastructure team for confirmation |
| Server count mismatch | Any new servers | Check back-billing requirement |
| PO balance shortfall | <10% remaining | Escalate to client POC |

**March 2025 Anomaly**:
- Storage reported: 850 TB vs expected 800 TB (+6.25%)
- 25 new servers identified; 15 require back billing at $1,030 each
- Infrastructure team confirmed data was correct — proceed with extracted values

## Back Billing

When new servers are identified mid-cycle:
- Calculate pro-rated charges from server activation date
- Apply standard rate: $1,030 per server for back-billing period
- Document in Server Count Reconciliation file
- Flag in Master Billing Feeder

## One-Time Charges

One-time charges are flagged to prevent duplicate billing:
- Each charge is tagged with billing cycle month
- Alert created in COMPASS to prevent re-billing in subsequent cycles
- Documented in One-Time Charges register

## Invoice Approval Chain

### Internal Approvals (Step 21)
All department SPOCs must approve the draft invoice:
1. Infrastructure Team SPOC
2. Application Team SPOC
3. Database Team SPOC
4. Data Center Facilities SPOC
5. Project Team Lead
6. Finance Controller

### SOX Maker-Checker (Step 24)
Separate reviewer validates invoice against:
- PO balance and validity
- Contract pricing terms
- Discount calculations
- Tax codes

### Customer Approval (Step 25)
Client POC (Adam Taylor) reviews draft invoice before final submission.

## Tax Codes

Tax codes are validated per DXC's tax matrix:
- US-based services: applicable state/federal codes
- Cross-border services: treaty considerations
- Contract-specific exemptions per SOW terms

## Contract Discounts

Discounts are calculated per contract terms:
- Volume-based discount tiers
- Annual commitment discounts
- Applied at invoice line-item level before tax calculation

## SLA Reminders

Automated reminders are sent when SPOC data is not received within 3 business days:
- Day 3: First reminder email
- Day 4: Escalation to SPOC manager
- Data must be received by Day 6 or estimate is used with reconciliation in next cycle

## Invoice Delivery

Final invoice is delivered via email to: **billing@mercedes.com**
- Subject: `DXC March'2025 Invoice`
- Attachment: INV-1234-056.pdf
- CC: Project Manager (John Smith), Finance Controller
- Invoice number format: INV-YYYY-NNN-SSS

## Frequently Asked Questions

**Q: What happens if a SPOC doesn't respond by the deadline?**
A: An automated escalation reminder is sent. If no response by Day 4, the previous month's data is used as an estimate and reconciled in the next billing cycle.

**Q: How are FX rates determined?**
A: DXC uses Wall Street Journal spot rates as of the last business day of the billing month (March 31, 2025 for March billing). These are manually entered into COMPASS.

**Q: What is the back-billing rate for new servers?**
A: $1,030 per server, prorated from the server activation date within the billing month.

**Q: How long is the full billing cycle?**
A: The standard cycle is 20 calendar days (April 1–20 for March billing).

**Q: What is COMPASS?**
A: COMPASS is DXC's internal billing management system used for FX rate management, PO validation, and invoice generation. Access via www.compass.com or www.compass.coupa.com.
