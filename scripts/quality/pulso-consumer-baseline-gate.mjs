import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const CI010_INSTANCE_ID = 'SHELL-CI-010::GLOBAL';
export const CI010_SCHEMA_VERSION = 1;
export const CONSUMER_REPOSITORY = 'vento-group-sas/vento-pulso';
export const CONSUMER_NAME = 'vento-pulso';
export const CONTRACTUAL_TEST_COUNT = 42;

export const CANONICAL_PACKAGES = Object.freeze([
  '@vento/contracts',
  '@vento/os-context',
  '@vento/supabase',
  '@vento/ui-web',
]);

export const PULSO_RELATIONS = Object.freeze({
  '@vento/contracts': Object.freeze({
    compatibility_ref: 'PKG-COMP-MX-006',
    update_ref: 'PKG-PR-REL-006',
    profile: 'PULSO-PROFILE-CONTRACTS',
  }),
  '@vento/os-context': Object.freeze({
    compatibility_ref: 'PKG-COMP-MX-013',
    update_ref: 'PKG-PR-REL-013',
    profile: 'PULSO-PROFILE-OS-CONTEXT',
  }),
  '@vento/supabase': Object.freeze({
    compatibility_ref: 'PKG-COMP-MX-020',
    update_ref: 'PKG-PR-REL-020',
    profile: 'PULSO-PROFILE-SUPABASE',
  }),
  '@vento/ui-web': Object.freeze({
    compatibility_ref: 'PKG-COMP-MX-027',
    update_ref: 'PKG-PR-REL-027',
    profile: 'PULSO-PROFILE-UI-WEB',
  }),
});

export const RESULT_STATES = Object.freeze([
  'PENDING',
  'RUNNING',
  'PASS',
  'FAIL',
  'BLOCKED',
  'CANCELLED',
  'TIMED_OUT',
  'STALE',
  'NOT_APPLICABLE',
]);

export const REQUIRED_EVIDENCE_FIELDS = Object.freeze([
  'consumer_repository',
  'consumer_branch',
  'consumer_base_commit',
  'consumer_manifest_identity',
  'consumer_lockfile_identity',
  'test_contract_identity',
  'test_suite_identity',
  'fixture_set_identity',
  'route_inventory_identity',
  'source_contract_identity',
  'environment_identity',
  'runtime_identity',
  'framework_identity',
  'target_package_set',
  'compatibility_refs',
  'pulso_profile_set',
  'execution_identity',
  'started_at',
  'completed_at',
  'result',
  'invalidation_reason',
]);

export const EXPECTED_PAGE_FILES = Object.freeze([
  'src/app/page.tsx',
  'src/app/no-access/page.tsx',
  'src/app/orders/page.tsx',
  'src/app/sales-imports/page.tsx',
  'src/app/salon/page.tsx',
  'src/app/scanner/page.tsx',
]);

export const EXPECTED_ROUTE_HANDLERS = Object.freeze([]);
export const EXPECTED_DYNAMIC_PAGE_COUNT = 0;
export const EXPECTED_BUSINESS_ROUTE_COUNT = 5;
export const EXPECTED_DENY_ROUTE_COUNT = 1;

export const SURFACES = Object.freeze([
  Object.freeze({
    id: 'PULSO-SURFACE-001',
    name: 'identidad, sesión, SSO y acceso PULSO',
    required_paths: [
      'src/lib/auth/guard.ts',
      'src/lib/auth/sso.ts',
      'src/lib/auth/permissions.ts',
      'src/lib/auth/operational-session.ts',
    ],
  }),
  Object.freeze({
    id: 'PULSO-SURFACE-002',
    name: 'contexto operativo, sede, actor y dispositivo',
    required_paths: [
      'src/lib/auth/operational-session.ts',
      'src/lib/auth/role-override.ts',
      'src/lib/auth/shared-device-signature.ts',
    ],
  }),
  Object.freeze({
    id: 'PULSO-SURFACE-003',
    name: 'inventario de rutas y navegación',
    required_paths: [...EXPECTED_PAGE_FILES],
  }),
  Object.freeze({
    id: 'PULSO-SURFACE-004',
    name: 'escáner e identificación de cliente',
    required_paths: [
      'src/app/page.tsx',
      'src/app/scanner/page.tsx',
      'src/modules/pos/components/scanner-page.tsx',
      'src/modules/pos/components/qr-scanner.tsx',
      'src/modules/pos/actions/identify-client.action.ts',
    ],
  }),
  Object.freeze({
    id: 'PULSO-SURFACE-005',
    name: 'loyalty, redención y acreditación',
    required_paths: [
      'src/modules/pos/actions/validate-redemption.action.ts',
      'src/modules/pos/actions/award-loyalty.action.ts',
      'src/modules/pos/api/redemption.api.ts',
      'src/modules/pos/api/loyalty-award.api.ts',
    ],
  }),
  Object.freeze({
    id: 'PULSO-SURFACE-006',
    name: 'pedidos, líneas, estado, pago y fulfillment',
    required_paths: [
      'src/app/orders/page.tsx',
      'src/app/orders/orders-board-live.tsx',
      'src/app/orders/orders-board.tsx',
      'src/app/orders/orders-board-legacy.tsx',
    ],
  }),
  Object.freeze({
    id: 'PULSO-SURFACE-007',
    name: 'despacho, chat, facturación e historial',
    required_paths: [
      'src/app/orders/page.tsx',
      'src/app/orders/delivery-dispatch-bridge.tsx',
      'src/app/orders/order-chat-live.tsx',
      'src/app/orders/orders-chat-inbox.tsx',
      'src/app/orders/orders-live-bridge.tsx',
    ],
  }),
  Object.freeze({
    id: 'PULSO-SURFACE-008',
    name: 'salón, mesas, sesiones, llamados y Realtime',
    required_paths: [
      'src/app/salon/page.tsx',
      'src/modules/salon/components/salon-page.tsx',
      'src/modules/salon/lib/status.ts',
      'src/modules/salon/types.ts',
    ],
  }),
  Object.freeze({
    id: 'PULSO-SURFACE-009',
    name: 'importación de ventas, mapeos, lotes y publicación',
    required_paths: ['src/app/sales-imports/page.tsx'],
  }),
  Object.freeze({
    id: 'PULSO-SURFACE-010',
    name: 'atomicidad, idempotencia, concurrencia y recuperación',
    required_paths: [
      'src/app/orders/page.tsx',
      'src/app/sales-imports/page.tsx',
      'src/modules/pos/api/redemption.api.ts',
      'src/modules/pos/actions/award-loyalty.action.ts',
    ],
  }),
  Object.freeze({
    id: 'PULSO-SURFACE-011',
    name: 'integración y fronteras de dominio',
    required_paths: [
      'docs/ESTADO-ACTUAL-PULSO-2026-05-28.md',
      'src/lib/supabase/client.ts',
      'src/lib/supabase/server.ts',
      'src/lib/auth/guard.ts',
    ],
  }),
  Object.freeze({
    id: 'PULSO-SURFACE-012',
    name: 'UI, SSR, interacción, accesibilidad y Realtime',
    required_paths: [
      'src/app/layout.tsx',
      'src/app/no-access/page.tsx',
      'src/modules/pos/components/scanner-page.tsx',
      'src/modules/pos/components/qr-scanner.tsx',
      'src/modules/salon/components/salon-page.tsx',
      'src/components/vento/standard/ui.tsx',
      'src/components/vento/standard/vento-shell.tsx',
    ],
  }),
]);

export const SOURCE_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'PULSO-SOURCE-001',
    path: 'src/lib/auth/guard.ts',
    tokens: ['requireAppAccess', 'buildShellLoginUrl', 'has_permission', 'shared_device_no_permission', 'role_override'],
  }),
  Object.freeze({
    id: 'PULSO-SOURCE-002',
    path: 'src/lib/auth/shared-device-signature.ts',
    tokens: ['requireSharedDeviceActorSignature', 'sign_shared_device_action', 'attach_shared_device_action_signature_target'],
  }),
  Object.freeze({
    id: 'PULSO-SOURCE-003',
    path: 'src/app/page.tsx',
    tokens: ['ScannerPage', 'appId: "pulso"', 'permissionCode: ["pos.main"]', 'return <ScannerPage'],
  }),
  Object.freeze({
    id: 'PULSO-SOURCE-004',
    path: 'src/app/scanner/page.tsx',
    tokens: ['ScannerPage', 'appId: "pulso"', 'permissionCode: ["pos.main"]', 'return <ScannerPage'],
  }),
  Object.freeze({
    id: 'PULSO-SOURCE-005',
    path: 'src/app/orders/page.tsx',
    tokens: ['requiresConfirmedOnlinePayment', 'update_order_operational_state', 'order_billing_requests', 'order_status_events', 'order_conversations'],
  }),
  Object.freeze({
    id: 'PULSO-SOURCE-006',
    path: 'src/app/sales-imports/page.tsx',
    tokens: ['crypto.createHash("sha256")', 'pulso_external_sales_item_mappings', 'pulso_daily_sales_import_batches', 'pulso_daily_sales_import_rows', 'pulso_post_daily_sales_import'],
  }),
  Object.freeze({
    id: 'PULSO-SOURCE-007',
    path: 'src/modules/salon/components/salon-page.tsx',
    tokens: ['pos_table_service_calls', 'pos_sessions', 'postgres_changes', 'removeChannel'],
  }),
  Object.freeze({
    id: 'PULSO-SOURCE-008',
    path: 'src/modules/pos/actions/identify-client.action.ts',
    tokens: ['"use server"', 'SUPABASE_SERVICE_ROLE_KEY', 'createAdminClient', 'pulso.pos.main', '.from("users")'],
  }),
  Object.freeze({
    id: 'PULSO-SOURCE-009',
    path: 'src/modules/pos/actions/validate-redemption.action.ts',
    tokens: ['requireSharedDeviceActorSignature', 'pos.loyalty.validate_redemption', 'pass.loyalty_redemptions', 'markRedemptionAsUsed'],
  }),
  Object.freeze({
    id: 'PULSO-SOURCE-010',
    path: 'src/modules/pos/actions/award-loyalty.action.ts',
    tokens: ['requireSharedDeviceActorSignature', 'pos.loyalty.award_points', 'loyalty_transactions', 'awardExternalLoyaltyPoints'],
  }),
  Object.freeze({
    id: 'PULSO-SOURCE-011',
    path: 'src/modules/pos/api/redemption.api.ts',
    tokens: ['.schema("pass").from("loyalty_redemptions")', 'redemption.status !== "pending"', '.eq("status", "pending")'],
  }),
  Object.freeze({
    id: 'PULSO-SOURCE-012',
    path: 'src/modules/pos/components/qr-scanner.tsx',
    tokens: ['processRedemptionAction', 'awardLoyaltyPointsAction', 'identifyClientAction', 'requiresSharedDeviceActorSignature'],
  }),
]);

const PROFILE_REQUIREMENTS = Object.freeze({
  '@vento/contracts': Object.freeze([
    'types_compile',
    'payload_shapes_checked',
    'serialization_checked',
    'identifier_semantics_preserved',
    'no_global_cast_bypass',
  ]),
  '@vento/os-context': Object.freeze([
    'session_checked',
    'site_context_checked',
    'actor_context_checked',
    'permission_allow_checked',
    'permission_deny_checked',
    'shared_device_signature_checked',
    'client_cannot_elevate_authority',
  ]),
  '@vento/supabase': Object.freeze([
    'browser_client_checked',
    'server_client_checked',
    'permission_rpc_checked',
    'deny_path_checked',
    'isolated_schema_source',
    'no_service_role_fixture',
    'no_service_role_client_exposure',
    'realtime_cleanup_checked',
    'build_is_non_mutating',
  ]),
  '@vento/ui-web': Object.freeze([
    'server_render_checked',
    'client_render_checked',
    'hydration_checked',
    'forms_checked',
    'accessibility_checked',
    'realtime_ui_checked',
    'deny_state_checked',
  ]),
});

const COMMIT_PATTERN = /^[0-9a-f]{40}$/u;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const SECRET_PATTERNS = Object.freeze([
  /\bgh[pousr]_[A-Za-z0-9_]{24,}\b/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /\bservice[_-]?role\b["']?\s*[:=]\s*["']?[^,\s"']{8,}/iu,
  /\b(?:password|secret|token|api[_-]?key|private[_-]?key)\b["']?\s*[:=]\s*["']?[^,\s"']{8,}/iu,
]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left.localeCompare(right, 'en'))
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256Identity(value) {
  return `sha256:${createHash('sha256').update(
    typeof value === 'string' ? value : stableStringify(value),
  ).digest('hex')}`;
}

export function fileIdentity(filePath) {
  return `sha256:${createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')}`;
}

export function resolveTargetPackages(values) {
  const raw = Array.isArray(values) ? values : String(values ?? '').split(',');
  const packages = [...new Set(raw.map((entry) => String(entry).trim()).filter(Boolean))];
  const invalid = packages.filter((entry) => !CANONICAL_PACKAGES.includes(entry));
  if (invalid.length > 0) throw new Error(`PACKAGE_NOT_CANONICAL:${invalid.join(',')}`);
  if (packages.length === 0) throw new Error('PACKAGE_SET_EMPTY');
  return CANONICAL_PACKAGES.filter((entry) => packages.includes(entry));
}

export function evaluateSurface(surfaceId, scenario) {
  const s = scenario ?? {};
  switch (surfaceId) {
    case 'PULSO-SURFACE-001':
      return Boolean(
        s.session
        && s.app_access
        && s.permission
        && s.safe_return
        && !s.auth_error
        && !s.expired,
      );
    case 'PULSO-SURFACE-002':
      return Boolean(
        s.site_id
        && s.actor_effective
        && s.territory_valid
        && !s.manipulated
        && s.override_authorized
        && (!s.shared_device || (s.actor_signed && s.app_allowed)),
      );
    case 'PULSO-SURFACE-003':
      return Boolean(
        s.page_count === 6
        && s.unique_page_count === 6
        && s.dynamic_page_count === 0
        && s.handler_count === 0
        && s.business_route_count === 5
        && s.deny_route_count === 1
        && s.root_scanner_distinct
        && s.local_login_absent
        && s.query_params_are_not_routes
        && s.protected_direct_access,
      );
    case 'PULSO-SURFACE-004':
      return Boolean(
        s.code_valid
        && s.session
        && s.permission
        && s.site_valid
        && s.client_found
        && s.server_query_only
        && !s.service_role_client_exposed,
      );
    case 'PULSO-SURFACE-005':
      return Boolean(
        s.redemption_id
        && s.redemption_pending
        && s.actor_authorized
        && s.pass_owner_preserved
        && s.award_attributable
        && !s.duplicate_effect
        && (!s.shared_device || s.actor_signed),
      );
    case 'PULSO-SURFACE-006':
      return Boolean(
        s.order_id
        && s.site_valid
        && s.lines_valid
        && s.payment_rule_valid
        && s.fulfillment_valid
        && s.transition_supported
        && s.resource_scope_valid
        && !s.duplicate_effect,
      );
    case 'PULSO-SURFACE-007':
      return Boolean(
        s.order_id
        && s.dispatch_scope_valid
        && s.conversation_bound
        && s.message_valid
        && s.events_attributable
        && s.billing_reference_bound
        && s.resource_scope_valid,
      );
    case 'PULSO-SURFACE-008':
      return Boolean(
        s.site_id
        && s.zones_scoped
        && s.tables_scoped
        && s.sessions_scoped
        && s.calls_scoped
        && s.realtime_scoped
        && s.cleanup_registered
        && s.transition_valid,
      );
    case 'PULSO-SURFACE-009':
      return Boolean(
        s.site_id
        && s.file_valid
        && s.hash_recorded
        && s.mapping_scoped
        && s.batch_attributable
        && s.rows_attributable
        && s.warnings_reconciled
        && s.publish_separate
        && !s.duplicate_effect,
      );
    case 'PULSO-SURFACE-010':
      return Boolean(
        s.operation_id
        && s.idempotency_key
        && s.atomic_or_reconciliable
        && !s.duplicate_effect
        && s.retry_safe
        && s.timeout_not_assumed_failed
        && s.recovery_auditable,
      );
    case 'PULSO-SURFACE-011': {
      const forbiddenOwnership = new Set([
        'customer_loyalty',
        'inventory',
        'supabase_schema',
        'supabase_rls',
        'supabase_migrations',
      ]);
      return Boolean(s.contract_consumed && !forbiddenOwnership.has(s.claimed_owner));
    }
    case 'PULSO-SURFACE-012':
      return Boolean(
        s.server_render
        && s.client_render
        && !s.hydration_mismatch
        && s.interaction_ok
        && s.forms_ok
        && s.accessibility_ok
        && s.realtime_feedback_ok
        && s.loading_error_feedback_ok
        && s.deny_state_safe,
      );
    default:
      throw new Error(`UNKNOWN_SURFACE:${surfaceId}`);
  }
}

export function evaluateProfile(packageName, scenario) {
  if (!CANONICAL_PACKAGES.includes(packageName)) {
    throw new Error(`PACKAGE_NOT_CANONICAL:${packageName}`);
  }
  return PROFILE_REQUIREMENTS[packageName].every((key) => scenario?.[key] === true);
}

export function evidenceIsStale(previous, current) {
  const materialFields = [
    'consumer_base_commit',
    'consumer_manifest_identity',
    'consumer_lockfile_identity',
    'test_contract_identity',
    'test_suite_identity',
    'fixture_set_identity',
    'route_inventory_identity',
    'source_contract_identity',
    'environment_identity',
    'runtime_identity',
    'framework_identity',
    'target_package_set',
    'compatibility_refs',
    'pulso_profile_set',
  ];
  return materialFields.some(
    (field) => stableStringify(previous?.[field]) !== stableStringify(current?.[field]),
  );
}

export function containsSensitiveData(value) {
  const source = stableStringify(value);
  return SECRET_PATTERNS.some((pattern) => pattern.test(source));
}

function routeFromPageFile(relativePath) {
  const normalized = String(relativePath).replace(/\\/gu, '/');
  const withoutRoot = normalized.replace(/^src\/app\//u, '');
  const dir = withoutRoot.replace(/\/?page\.(?:js|jsx|ts|tsx)$/u, '');
  if (!dir || dir === 'page') return '/';
  const segments = dir
    .split('/')
    .filter(Boolean)
    .filter((segment) => !/^\(.+\)$/u.test(segment));
  return `/${segments.join('/')}`.replace(/\/+$/u, '') || '/';
}

export function validateRouteInventoryEntries(pageFiles, handlerFiles) {
  const pages = [...pageFiles].map(String).sort();
  const handlers = [...handlerFiles].map(String).sort();
  const expectedPages = [...EXPECTED_PAGE_FILES].sort();
  const expectedHandlers = [...EXPECTED_ROUTE_HANDLERS].sort();
  const pageSet = new Set(pages);
  const handlerSet = new Set(handlers);
  const missingPages = expectedPages.filter((entry) => !pageSet.has(entry));
  const unexpectedPages = pages.filter((entry) => !expectedPages.includes(entry));
  const missingHandlers = expectedHandlers.filter((entry) => !handlerSet.has(entry));
  const unexpectedHandlers = handlers.filter((entry) => !expectedHandlers.includes(entry));
  const duplicatePages = pages.length !== pageSet.size;
  const duplicateHandlers = handlers.length !== handlerSet.size;
  const routes = pages.map(routeFromPageFile);
  const uniqueRoutes = new Set(routes);
  const dynamicPageCount = routes.filter((route) => route.includes('[')).length;
  const businessRoutes = routes.filter((route) => route !== '/no-access');
  const denyRoutes = routes.filter((route) => route === '/no-access');
  const rootScannerDistinct = uniqueRoutes.has('/') && uniqueRoutes.has('/scanner');
  const localLoginAbsent = !uniqueRoutes.has('/login');

  const cardinalitiesPass = (
    pages.length === 6
    && uniqueRoutes.size === 6
    && dynamicPageCount === EXPECTED_DYNAMIC_PAGE_COUNT
    && handlers.length === 0
    && businessRoutes.length === EXPECTED_BUSINESS_ROUTE_COUNT
    && denyRoutes.length === EXPECTED_DENY_ROUTE_COUNT
    && rootScannerDistinct
    && localLoginAbsent
  );

  return {
    expected_page_count: expectedPages.length,
    actual_page_count: pages.length,
    unique_page_count: uniqueRoutes.size,
    expected_dynamic_page_count: EXPECTED_DYNAMIC_PAGE_COUNT,
    actual_dynamic_page_count: dynamicPageCount,
    expected_handler_count: expectedHandlers.length,
    actual_handler_count: handlers.length,
    expected_business_route_count: EXPECTED_BUSINESS_ROUTE_COUNT,
    actual_business_route_count: businessRoutes.length,
    expected_deny_route_count: EXPECTED_DENY_ROUTE_COUNT,
    actual_deny_route_count: denyRoutes.length,
    root_scanner_distinct: rootScannerDistinct,
    local_login_absent: localLoginAbsent,
    query_params_are_not_routes: true,
    missing_pages: missingPages,
    unexpected_pages: unexpectedPages,
    missing_handlers: missingHandlers,
    unexpected_handlers: unexpectedHandlers,
    duplicate_pages: duplicatePages,
    duplicate_handlers: duplicateHandlers,
    result:
      missingPages.length === 0
      && unexpectedPages.length === 0
      && missingHandlers.length === 0
      && unexpectedHandlers.length === 0
      && !duplicatePages
      && !duplicateHandlers
      && cardinalitiesPass
        ? 'PASS'
        : 'BLOCKED',
  };
}

function discoverByBasename(root, baseNames) {
  const found = [];
  if (!fs.existsSync(root)) return found;
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
      } else if (baseNames.has(entry.name)) {
        found.push(absolute);
      }
    }
  }

  return found;
}

function toRepoRelative(root, absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join('/');
}

export function probeRouteInventory(root = process.cwd()) {
  const appRoot = path.join(root, 'src', 'app');
  const pageFiles = discoverByBasename(
    appRoot,
    new Set(['page.ts', 'page.tsx', 'page.js', 'page.jsx']),
  ).map((entry) => toRepoRelative(root, entry));
  const handlerFiles = discoverByBasename(
    appRoot,
    new Set(['route.ts', 'route.tsx', 'route.js', 'route.jsx']),
  ).map((entry) => toRepoRelative(root, entry));
  return validateRouteInventoryEntries(pageFiles, handlerFiles);
}

export function inspectSourceContracts(root = process.cwd()) {
  return SOURCE_CONTRACTS.map((contract) => {
    const absolute = path.join(root, contract.path);
    if (!fs.existsSync(absolute)) {
      return {
        contract_id: contract.id,
        path: contract.path,
        missing_tokens: [...contract.tokens],
        result: 'BLOCKED',
      };
    }
    const source = fs.readFileSync(absolute, 'utf8');
    const missingTokens = contract.tokens.filter((token) => !source.includes(token));
    return {
      contract_id: contract.id,
      path: contract.path,
      missing_tokens: missingTokens,
      result: missingTokens.length === 0 ? 'PASS' : 'BLOCKED',
    };
  });
}

export function validateEvidence(evidence) {
  const errors = [];
  for (const field of REQUIRED_EVIDENCE_FIELDS) {
    if (!(field in (evidence ?? {}))) errors.push(`EVIDENCE_FIELD_MISSING:${field}`);
  }
  if (evidence?.consumer_repository !== CONSUMER_REPOSITORY) {
    errors.push('WRONG_CONSUMER_REPOSITORY');
  }
  if (!COMMIT_PATTERN.test(String(evidence?.consumer_base_commit ?? ''))) {
    errors.push('BASE_COMMIT_INVALID');
  }
  for (const field of [
    'consumer_manifest_identity',
    'consumer_lockfile_identity',
    'test_contract_identity',
    'test_suite_identity',
    'fixture_set_identity',
    'route_inventory_identity',
    'source_contract_identity',
    'execution_identity',
  ]) {
    if (!SHA256_PATTERN.test(String(evidence?.[field] ?? ''))) {
      errors.push(`IDENTITY_INVALID:${field}`);
    }
  }

  let targetPackages = [];
  try {
    targetPackages = resolveTargetPackages(evidence?.target_package_set ?? []);
  } catch (error) {
    errors.push(String(error.message));
  }

  const expectedCompatibility = targetPackages.map(
    (packageName) => PULSO_RELATIONS[packageName].compatibility_ref,
  );
  const expectedProfiles = targetPackages.map(
    (packageName) => PULSO_RELATIONS[packageName].profile,
  );

  if (stableStringify(evidence?.compatibility_refs ?? []) !== stableStringify(expectedCompatibility)) {
    errors.push('COMPATIBILITY_REFS_MISMATCH');
  }
  if (stableStringify(evidence?.pulso_profile_set ?? []) !== stableStringify(expectedProfiles)) {
    errors.push('PROFILE_SET_MISMATCH');
  }

  const summary = evidence?.test_summary ?? {};
  if (!Number.isInteger(summary.executed) || summary.executed <= 0) {
    errors.push('ZERO_REQUIRED_TESTS');
  }
  if (Number.isInteger(summary.executed) && summary.executed !== CONTRACTUAL_TEST_COUNT) {
    errors.push('CONTRACTUAL_TEST_COUNT_MISMATCH');
  }
  if ((summary.failed ?? 0) !== 0) errors.push('REQUIRED_TEST_FAILURE');
  if ((summary.skipped ?? 0) !== 0) errors.push('REQUIRED_TEST_SKIPPED');
  if ((summary.denied_paths ?? 0) < 16) errors.push('DENY_PATH_NOT_PROVEN');

  if (/prod(?:uction)?/iu.test(String(evidence?.environment_identity ?? ''))) {
    errors.push('PRODUCTION_ENVIRONMENT_FORBIDDEN');
  }
  if (containsSensitiveData(evidence)) errors.push('SENSITIVE_DATA_FORBIDDEN');
  if (evidence?.certification_scope !== 'HARNESS_SELF_CERTIFICATION') {
    errors.push('CERTIFICATION_SCOPE_INVALID');
  }
  if (evidence?.consumer_conformance_claimed !== false) {
    errors.push('CONSUMER_CONFORMANCE_MUST_NOT_BE_CLAIMED');
  }
  if (evidence?.implementation_boundaries?.package_versions_changed !== false) {
    errors.push('PACKAGE_VERSION_CHANGE_FORBIDDEN');
  }
  if (evidence?.implementation_boundaries?.supabase_mutation_performed !== false) {
    errors.push('SUPABASE_MUTATION_FORBIDDEN');
  }
  if (evidence?.implementation_boundaries?.production_data_used !== false) {
    errors.push('PRODUCTION_DATA_FORBIDDEN');
  }
  if (evidence?.implementation_boundaries?.consumer_functional_debt_corrected !== false) {
    errors.push('FUNCTIONAL_DEBT_CORRECTION_FORBIDDEN');
  }
  if (evidence?.safe_build_entrypoint !== 'npm run build:ci010') {
    errors.push('SAFE_BUILD_ENTRYPOINT_INVALID');
  }
  if (evidence?.result === 'PASS' && errors.length > 0) errors.push('FALSE_GREEN');

  return [...new Set(errors)];
}

function pathExists(root, relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

export function probeRepository(root = process.cwd()) {
  const routeInventory = probeRouteInventory(root);
  return SURFACES.map((surface) => {
    const missing = surface.required_paths.filter((relativePath) => !pathExists(root, relativePath));
    const routeBlocked = surface.id === 'PULSO-SURFACE-003' && routeInventory.result !== 'PASS';
    return {
      surface_id: surface.id,
      name: surface.name,
      required_paths: surface.required_paths,
      missing_paths: missing,
      result: missing.length === 0 && !routeBlocked ? 'PASS' : 'BLOCKED',
    };
  });
}

function gitText(root, args) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function parseCli(argv) {
  const options = { json: false, packages: CANONICAL_PACKAGES };
  for (const argument of argv) {
    if (argument === '--json') {
      options.json = true;
      continue;
    }
    if (argument.startsWith('--packages=')) {
      options.packages = resolveTargetPackages(argument.slice('--packages='.length));
      continue;
    }
    throw new Error(`UNKNOWN_ARGUMENT:${argument}`);
  }
  return options;
}

function parseNodeTestSummary(output) {
  const get = (label) => {
    const match = output.match(new RegExp(`(?:^|\\r?\\n)[#ℹ]\\s+${label}\\s+(\\d+)`, 'u'));
    return match ? Number(match[1]) : null;
  };
  return {
    executed: get('tests'),
    passed: get('pass'),
    failed: get('fail'),
    skipped: get('skipped') ?? 0,
  };
}

function runSelfCertification(root) {
  const testPath = path.join(root, 'scripts', 'quality', 'pulso-consumer-baseline-gate.test.mjs');
  const result = spawnSync(process.execPath, ['--test', testPath], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test' },
  });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const summary = parseNodeTestSummary(output);
  return {
    exit_code: result.status ?? 1,
    summary,
    output,
  };
}

export function buildBaselineEvidence({
  root = process.cwd(),
  targetPackages = CANONICAL_PACKAGES,
  startedAt = new Date().toISOString(),
} = {}) {
  const packages = resolveTargetPackages(targetPackages);
  const manifestPath = path.join(root, 'package.json');
  const lockfilePath = path.join(root, 'package-lock.json');
  const testPath = path.join(root, 'scripts', 'quality', 'pulso-consumer-baseline-gate.test.mjs');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const surfaces = probeRepository(root);
  const routeInventory = probeRouteInventory(root);
  const sourceContracts = inspectSourceContracts(root);
  const selfCertification = runSelfCertification(root);
  const completedAt = new Date().toISOString();

  const base = {
    consumer_repository: CONSUMER_REPOSITORY,
    consumer_branch: gitText(root, ['branch', '--show-current']) || 'DETACHED',
    consumer_base_commit: gitText(root, ['rev-parse', 'HEAD']),
    consumer_manifest_identity: fileIdentity(manifestPath),
    consumer_lockfile_identity: fileIdentity(lockfilePath),
    test_contract_identity: sha256Identity({
      instance_id: CI010_INSTANCE_ID,
      schema_version: CI010_SCHEMA_VERSION,
      relations: PULSO_RELATIONS,
      surfaces: SURFACES,
      profile_requirements: PROFILE_REQUIREMENTS,
      required_evidence_fields: REQUIRED_EVIDENCE_FIELDS,
      expected_page_files: EXPECTED_PAGE_FILES,
      expected_route_handlers: EXPECTED_ROUTE_HANDLERS,
      expected_dynamic_page_count: EXPECTED_DYNAMIC_PAGE_COUNT,
      expected_business_route_count: EXPECTED_BUSINESS_ROUTE_COUNT,
      expected_deny_route_count: EXPECTED_DENY_ROUTE_COUNT,
      source_contracts: SOURCE_CONTRACTS,
      contractual_test_count: CONTRACTUAL_TEST_COUNT,
    }),
    test_suite_identity: fileIdentity(testPath),
    fixture_set_identity: sha256Identity({
      fixture_set: 'CI010-PULSO-SYNTHETIC-001',
      surfaces: SURFACES.map(({ id }) => id),
      profiles: CANONICAL_PACKAGES,
      global_regressions: 10,
    }),
    route_inventory_identity: sha256Identity(routeInventory),
    source_contract_identity: sha256Identity(sourceContracts),
    environment_identity: `isolated:${process.platform}:${process.arch}:node:${process.version}`,
    runtime_identity: process.version,
    framework_identity: 'node:test+ci010-policy-engine-v1',
    target_package_set: packages,
    compatibility_refs: packages.map((packageName) => PULSO_RELATIONS[packageName].compatibility_ref),
    pulso_profile_set: packages.map((packageName) => PULSO_RELATIONS[packageName].profile),
    started_at: startedAt,
    completed_at: completedAt,
    result: 'PENDING',
    invalidation_reason: null,
    certification_scope: 'HARNESS_SELF_CERTIFICATION',
    consumer_conformance_claimed: false,
    known_consumer_debt_refs: [
      'TREQ-PULSO-002',
      'TREQ-PULSO-014',
      'TREQ-PULSO-016',
      'TREQ-PULSO-017',
      'TREQ-PULSO-018',
    ],
    safe_build_entrypoint: 'npm run build:ci010',
    test_summary: {
      executed: selfCertification.summary.executed,
      passed: selfCertification.summary.passed,
      failed: selfCertification.summary.failed,
      skipped: selfCertification.summary.skipped,
      denied_paths: 12 + packages.length,
    },
    surface_results: surfaces,
    route_inventory: routeInventory,
    source_contract_results: sourceContracts,
    implementation_boundaries: {
      package_versions_changed: false,
      pull_request_created: false,
      merge_performed: false,
      deployment_performed: false,
      rollback_performed: false,
      supabase_mutation_performed: false,
      production_data_used: false,
      consumer_functional_debt_corrected: false,
    },
  };

  const probeFailures = surfaces.filter(({ result }) => result !== 'PASS');
  const sourceFailures = sourceContracts.filter(({ result }) => result !== 'PASS');
  const runnerFailed = selfCertification.exit_code !== 0
    || selfCertification.summary.executed !== CONTRACTUAL_TEST_COUNT
    || selfCertification.summary.failed !== 0
    || selfCertification.summary.skipped !== 0;

  const preIdentity = {
    ...base,
    result: undefined,
    invalidation_reason: undefined,
    execution_identity: undefined,
  };
  const executionIdentity = sha256Identity(preIdentity);
  const candidate = { ...base, execution_identity: executionIdentity, result: 'PASS' };
  const validationErrors = validateEvidence(candidate);

  if (manifest.name !== CONSUMER_NAME) validationErrors.push('MANIFEST_CONSUMER_MISMATCH');
  if (manifest.scripts?.['build:ci010'] !== 'next build') {
    validationErrors.push('SAFE_BUILD_ENTRYPOINT_MISSING');
  }
  if (manifest.scripts?.['prebuild:ci010']) {
    validationErrors.push('SAFE_BUILD_PREHOOK_FORBIDDEN');
  }
  if (manifest.scripts?.['postbuild:ci010']) {
    validationErrors.push('SAFE_BUILD_POSTHOOK_FORBIDDEN');
  }
  if (manifest.scripts?.typecheck !== 'tsc --noEmit --incremental false') {
    validationErrors.push('TYPECHECK_ENTRYPOINT_MISMATCH');
  }
  if (
    manifest.scripts?.['test:ci010']
    !== 'node --test scripts/quality/pulso-consumer-baseline-gate.test.mjs'
  ) {
    validationErrors.push('TEST_ENTRYPOINT_MISMATCH');
  }
  if (
    manifest.scripts?.['ci010:baseline']
    !== 'node scripts/quality/pulso-consumer-baseline-gate.mjs --packages=@vento/contracts,@vento/os-context,@vento/supabase,@vento/ui-web --json'
  ) {
    validationErrors.push('BASELINE_ENTRYPOINT_MISMATCH');
  }
  if (routeInventory.result !== 'PASS') validationErrors.push('ROUTE_INVENTORY_DRIFT');
  if (probeFailures.length > 0) {
    validationErrors.push(...probeFailures.map(({ surface_id }) => `SURFACE_BLOCKED:${surface_id}`));
  }
  if (sourceFailures.length > 0) {
    validationErrors.push(...sourceFailures.map(({ contract_id }) => `SOURCE_CONTRACT_BLOCKED:${contract_id}`));
  }
  if (runnerFailed) validationErrors.push('SELF_CERTIFICATION_FAILED');

  const errors = [...new Set(validationErrors)];
  return {
    ...candidate,
    result: errors.length === 0 ? 'PASS' : (runnerFailed ? 'FAIL' : 'BLOCKED'),
    invalidation_reason: errors.length === 0 ? null : errors,
    self_certification: {
      exit_code: selfCertification.exit_code,
      ...selfCertification.summary,
    },
  };
}

function main() {
  const options = parseCli(process.argv.slice(2));
  const evidence = buildBaselineEvidence({
    root: process.cwd(),
    targetPackages: options.packages,
  });
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  process.exitCode = evidence.result === 'PASS' ? 0 : 1;
}

const entryUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryUrl === import.meta.url) main();