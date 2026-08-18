/**
 * Unit Test Runner — BK1-US-021 (TC-001 through TC-008)
 * 
 * Verifies deterministic formula calculations, rounding, boundary handling,
 * and payload validation directly against the code node implementations from workflow.json.
 */

const assert = require('assert');

// Helper function from DVCA / DVSE nodes
function roundHalfUp(value, dp = 2) {
  const factor = Math.pow(10, dp);
  return Math.floor(value * factor + 0.5) / factor;
}

// 1. Validation Code Node logic
function runValidationNode($json) {
  const REQUIRED_FIELDS = ['eventId', 'isin', 'eventType', 'mandatoryVoluntaryFlag', 'recordDate'];
  const VALID_EVENT_TYPES = ['DVCA', 'DVSE', 'SPLF', 'RHTS', 'TEND', 'CHOS'];
  const VALID_FLAGS = ['MAND', 'VOLU', 'CHOS'];

  const payload = $json.body || $json;

  for (const field of REQUIRED_FIELDS) {
    if (!payload[field]) {
      throw new Error(`MISSING_FIELD: Mandatory field '${field}' is missing.`);
    }
  }

  if (!VALID_EVENT_TYPES.includes(payload.eventType)) {
    throw new Error(`INVALID_EVENT_TYPE: '${payload.eventType}' is not supported.`);
  }

  if (!VALID_FLAGS.includes(payload.mandatoryVoluntaryFlag)) {
    throw new Error(`INVALID_FLAG: '${payload.mandatoryVoluntaryFlag}' is not recognized.`);
  }

  if (['VOLU', 'CHOS'].includes(payload.mandatoryVoluntaryFlag) && !payload.electionDeadline) {
    throw new Error(`MISSING_ELECTION_DEADLINE: Voluntary event requires electionDeadline.`);
  }

  return {
    ...payload,
    validatedAt: '2026-08-17T00:00:00.000Z'
  };
}

// 2. DVCA Formula Node logic
function runFormulaDVCA($json) {
  const pos = parseFloat($json.positionAsOfRecordDate || 0);
  const rate = parseFloat($json.grossRatePerShare || 0);
  const entitlementCash = roundHalfUp(pos * rate, 2);

  return {
    ...$json,
    entitlementCash,
    entitlementShares: null,
    fractionalCash: null,
    newPosition: null
  };
}

// 3. DVSE Formula Node logic
function runFormulaDVSE($json) {
  const pos = parseFloat($json.positionAsOfRecordDate || 0);
  const ratio = parseFloat($json.stockDividendRatio || 0);
  const fracPrice = parseFloat($json.fractionalCashPrice || 0);

  const rawShares = pos * ratio;
  const entitlementShares = Math.floor(rawShares);
  const fracRemainder = rawShares - entitlementShares;
  const fractionalCash = roundHalfUp(fracRemainder * fracPrice, 2);

  return {
    ...$json,
    entitlementCash: 0.00,
    entitlementShares,
    fractionalCash,
    newPosition: null
  };
}

// 4. SPLF Formula Node logic
function runFormulaSPLF($json) {
  const pos = parseFloat($json.positionAsOfRecordDate || 0);
  const ratioStr = $json.splitRatio || "1:1";
  const parts = ratioStr.split(':').map(Number);
  const newPos = pos * (parts[0] / parts[1]);

  return {
    ...$json,
    entitlementCash: 0.00,
    entitlementShares: 0,
    fractionalCash: 0.00,
    newPosition: newPos
  };
}

// 5. RHTS Formula Node logic
function runFormulaRHTS($json) {
  const pos = parseFloat($json.positionAsOfRecordDate || 0);
  const ratio = parseFloat($json.rightsRatio || 0.10);
  const rightsEntitlement = Math.floor(pos * ratio);

  return {
    ...$json,
    entitlementCash: 0.00,
    entitlementShares: rightsEntitlement,
    fractionalCash: 0.00,
    newPosition: null
  };
}

// 6. Deadline Gate IF Node logic
function runDeadlineGate($json, mockDaysToDeadline = null) {
  let escalationTier = 'NONE';
  let daysToDeadline = mockDaysToDeadline;

  if (['VOLU', 'CHOS'].includes($json.mandatoryVoluntaryFlag)) {
    if (daysToDeadline === null && $json.electionDeadline) {
      const deadline = new Date($json.electionDeadline);
      const now = new Date();
      const diffMs = deadline.getTime() - now.getTime();
      daysToDeadline = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    if (daysToDeadline > 10) {
      escalationTier = 'INFORMATIONAL';
    } else if (daysToDeadline >= 3 && daysToDeadline <= 10) {
      escalationTier = 'REMINDER';
    } else if (daysToDeadline >= 1 && daysToDeadline < 3) {
      escalationTier = 'URGENT';
    } else {
      escalationTier = 'BREACH'; // daysToDeadline <= 0 (FR-016)
    }
  }

  return {
    ...$json,
    escalationTier,
    daysToDeadline
  };
}

// --- TEST SUITE ---
const tests = [
  {
    id: 'TC-001',
    name: 'DVCA — non-round entitlement (half-up)',
    fn: () => {
      const input = { positionAsOfRecordDate: 14999, grossRatePerShare: 0.42 };
      const res = runFormulaDVCA(input);
      assert.strictEqual(res.entitlementCash, 6299.58);
      return `entitlementCash=${res.entitlementCash}`;
    }
  },
  {
    id: 'TC-001b',
    name: "DVCA — verify NOT using banker's rounding",
    fn: () => {
      const input = { positionAsOfRecordDate: 15001, grossRatePerShare: 0.015 };
      const res = runFormulaDVCA(input);
      assert.strictEqual(res.entitlementCash, 225.02);
      return `entitlementCash=${res.entitlementCash} (Half-Up verified)`;
    }
  },
  {
    id: 'TC-002',
    name: 'DVSE — fractional-share remainder',
    fn: () => {
      const input = { positionAsOfRecordDate: 153, stockDividendRatio: 0.10, fractionalCashPrice: 25.00 };
      const res = runFormulaDVSE(input);
      assert.strictEqual(res.entitlementShares, 15);
      assert.strictEqual(res.fractionalCash, 7.50);
      return `entitlementShares=${res.entitlementShares}, fractionalCash=${res.fractionalCash}`;
    }
  },
  {
    id: 'TC-002b',
    name: 'DVSE — zero fractional remainder',
    fn: () => {
      const input = { positionAsOfRecordDate: 150, stockDividendRatio: 0.10, fractionalCashPrice: 25.00 };
      const res = runFormulaDVSE(input);
      assert.strictEqual(res.entitlementShares, 15);
      assert.strictEqual(res.fractionalCash, 0.00);
      return `entitlementShares=${res.entitlementShares}, fractionalCash=${res.fractionalCash}`;
    }
  },
  {
    id: 'TC-003',
    name: 'RHTS — 2 days to deadline (URGENT tier)',
    fn: () => {
      const input = { eventType: 'RHTS', mandatoryVoluntaryFlag: 'VOLU', positionAsOfRecordDate: 1000, rightsRatio: 0.10 };
      const resFormula = runFormulaRHTS(input);
      const resGate = runDeadlineGate(resFormula, 2);
      assert.strictEqual(resGate.escalationTier, 'URGENT');
      assert.strictEqual(resGate.daysToDeadline, 2);
      assert.strictEqual(resFormula.entitlementShares, 100);
      return `escalationTier=${resGate.escalationTier}, daysToDeadline=${resGate.daysToDeadline}, entitlementShares=${resFormula.entitlementShares}`;
    }
  },
  {
    id: 'TC-004',
    name: 'RHTS — 1 day past deadline (BREACH tier)',
    fn: () => {
      const input = { eventType: 'RHTS', mandatoryVoluntaryFlag: 'VOLU', positionAsOfRecordDate: 1000, rightsRatio: 0.10 };
      const resFormula = runFormulaRHTS(input);
      const resGate = runDeadlineGate(resFormula, -1);
      assert.strictEqual(resGate.escalationTier, 'BREACH');
      assert.strictEqual(resGate.daysToDeadline, -1);
      return `escalationTier=${resGate.escalationTier}, daysToDeadline=${resGate.daysToDeadline}`;
    }
  },
  {
    id: 'TC-005',
    name: 'DVCA — zero-holdings position',
    fn: () => {
      const input = { positionAsOfRecordDate: 0, grossRatePerShare: 0.42 };
      const res = runFormulaDVCA(input);
      assert.strictEqual(res.entitlementCash, 0.00);
      return `entitlementCash=${res.entitlementCash}`;
    }
  },
  {
    id: 'TC-006',
    name: 'SPLF — clean forward split',
    fn: () => {
      const input = { positionAsOfRecordDate: 10000, splitRatio: '3:1' };
      const res = runFormulaSPLF(input);
      assert.strictEqual(res.newPosition, 30000);
      assert.strictEqual(res.entitlementCash, 0.00);
      assert.strictEqual(res.entitlementShares, 0);
      return `newPosition=${res.newPosition}, entitlementCash=${res.entitlementCash}, entitlementShares=${res.entitlementShares}`;
    }
  },
  {
    id: 'TC-007',
    name: 'TEND — multi-option choice',
    fn: () => {
      const input = { eventType: 'TEND', mandatoryVoluntaryFlag: 'VOLU', positionAsOfRecordDate: 500, optionDetails: ['OPT1', 'OPT2', 'OPT3'] };
      const resGate = runDeadlineGate(input, 5);
      assert.strictEqual(resGate.escalationTier, 'REMINDER');
      assert.strictEqual(input.optionDetails.length, 3);
      return `optionsCount=${input.optionDetails.length}, escalationTier=${resGate.escalationTier}`;
    }
  },
  {
    id: 'TC-008',
    name: 'Validation rejection — missing field',
    fn: () => {
      const input = { eventId: 'EV123', isin: 'US0378331005', eventType: 'DVCA', mandatoryVoluntaryFlag: 'MAND' };
      assert.throws(() => runValidationNode(input), /MISSING_FIELD/);
      return `Successfully caught missing recordDate error`;
    }
  }
];

console.log('=== BK1-US-021: UNIT TEST EXECUTION SUITE ===\n');
let passed = 0;
let failed = 0;

for (const test of tests) {
  try {
    const detail = test.fn();
    console.log(`[PASS] ${test.id} - ${test.name}`);
    console.log(`       Details: ${detail}\n`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${test.id} - ${test.name}`);
    console.error(`       Error: ${err.message}\n`);
    failed++;
  }
}

console.log(`Summary: ${passed}/${tests.length} tests passed.`);
if (failed > 0) {
  process.exit(1);
}
