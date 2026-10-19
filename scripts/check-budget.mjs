import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const VERIFY_LIMIT = 'One wrapped pnpm run verify already ran. Repeat it only after that verify fails, and only once.';
const ACCEPTANCE_LIMIT = 'Acceptance runs inside the one wrapped pnpm run verify. Run acceptance by itself only after that verify fails.';
const INSTALL_LIMIT = 'Dependencies are prepared before the scored run. Do not run pnpm install during implementation or validation.';

export function commandText(command, args = []) {
	return [command, ...args].join(' ');
}

export function isWrapped(text) {
	return text.includes('scripts/agent-check.mjs');
}

export function isVerify(text) {
	return /(?:^|\s)pnpm(?:\s+run)?\s+verify(?:\s|$)/.test(text);
}

export function isAcceptance(text) {
	return /\btest:acceptance\b/.test(text) && !isVerify(text);
}

export function isInstall(text) {
	return /\bpnpm\b[^\n;&|]*\sinstall\b/.test(text);
}

export function readBudget(cwd = process.cwd()) {
	try {
		const budget = JSON.parse(readFileSync(budgetPath(cwd), 'utf8'));
		return {
			verifies: Number(budget.verifies) || 0,
			lastVerifyStatus: budget.lastVerifyStatus ?? null,
		};
	} catch {
		return { verifies: 0, lastVerifyStatus: null };
	}
}

export function recordVerify(status, cwd = process.cwd()) {
	const budget = readBudget(cwd);
	budget.verifies += 1;
	budget.lastVerifyStatus = status ?? 1;
	writeFileSync(budgetPath(cwd), `${JSON.stringify(budget)}\n`);
}

export function rejectionReason(text, budget = readBudget()) {
	if (isInstall(text)) {
		return INSTALL_LIMIT;
	}
	if (isAcceptance(text)) {
		return budget.verifies > 0 && budget.lastVerifyStatus !== 0 ? undefined : ACCEPTANCE_LIMIT;
	}
	if (!isVerify(text)) {
		return undefined;
	}
	if (budget.verifies >= 2 || budget.lastVerifyStatus === 0) {
		return VERIFY_LIMIT;
	}
	return undefined;
}

export function rawBroadCommandReason(text) {
	if (isInstall(text)) {
		return INSTALL_LIMIT;
	}
	if (isWrapped(text) || (!isVerify(text) && !isAcceptance(text))) {
		return undefined;
	}
	return 'Run pnpm run verify through node scripts/agent-check.mjs. Acceptance runs inside that one verify.';
}

function budgetPath(cwd) {
	return resolve(cwd, process.env.AXC_CHECK_BUDGET ?? '.axc-check-budget.json');
}
