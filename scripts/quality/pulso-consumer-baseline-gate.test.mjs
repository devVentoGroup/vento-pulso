import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CANONICAL_PACKAGES,
  CONSUMER_REPOSITORY,
  CONTRACTUAL_TEST_COUNT,
  EXPECTED_PAGE_FILES,
  EXPECTED_ROUTE_HANDLERS,
  PULSO_RELATIONS,
  REQUIRED_EVIDENCE_FIELDS,
  SURFACES,
  containsSensitiveData,
  evaluateProfile,
  evaluateSurface,
  evidenceIsStale,
  resolveTargetPackages,
  sha256Identity,
  validateEvidence,
  validateRouteInventoryEntries,
} from './pulso-consumer-baseline-gate.mjs';

const positiveSurfaceScenarios = Object.freeze({
  'PULSO-SURFACE-001': {
    session: true,
    app_access: true,
    permission: true,
    safe_return: true,
    auth_error: false,
    expired: false,
  },
  'PULSO-SURFACE-002': {
    site_id: 'SITE-001',
    actor_effective: 'EMP-001',
    territory_valid: true,
    manipulated: false,
    override_authorized: true,
    shared_device: true,
    actor_signed: true,
    app_allowed: true,
  },
  'PULSO-SURFACE-003': {
    page_count: 6,
    unique_page_count: 6,
    dynamic_page_count: 0,
    handler_count: 0,
    business_route_count: 5,
    deny_route_count: 1,
    root_scanner_distinct: true,
    local_login_absent: true,
    query_params_are_not_routes: true,
    protected_direct_access: true,
  },
  'PULSO-SURFACE-004': {
    code_valid: true,
    session: true,
    permission: true,
    site_valid: true,
    client_found: true,
    server_query_only: true,
    service_role_client_exposed: false,
  },
  'PULSO-SURFACE-005': {
    redemption_id: 'RED-001',
    redemption_pending: true,
    actor_authorized: true,
    pass_owner_preserved: true,
    award_attributable: true,
    duplicate_effect: false,
    shared_device: true,
    actor_signed: true,
  },
  'PULSO-SURFACE-006': {
    order_id: 'ORDER-001',
    site_valid: true,
    lines_valid: true,
    payment_rule_valid: true,
    fulfillment_valid: true,
    transition_supported: true,
    resource_scope_valid: true,
    duplicate_effect: false,
  },
  'PULSO-SURFACE-007': {
    order_id: 'ORDER-001',
    dispatch_scope_valid: true,
    conversation_bound: true,
    message_valid: true,
    events_attributable: true,
    billing_reference_bound: true,
    resource_scope_valid: true,
  },
  'PULSO-SURFACE-008': {
    site_id: 'SITE-001',
    zones_scoped: true,
    tables_scoped: true,
    sessions_scoped: true,
    calls_scoped: true,
    realtime_scoped: true,
    cleanup_registered: true,
    transition_valid: true,
  },
  'PULSO-SURFACE-009': {
    site_id: 'SITE-001',
    file_valid: true,
    hash_recorded: true,
    mapping_scoped: true,
    batch_attributable: true,
    rows_attributable: true,
    warnings_reconciled: true,
    publish_separate: true,
    duplicate_effect: false,
  },
  'PULSO-SURFACE-010': {
    operation_id: 'OP-001',
    idempotency_key: 'IDEMP-001',
    atomic_or_reconciliable: true,
    duplicate_effect: false,
    retry_safe: true,
    timeout_not_assumed_failed: true,
    recovery_auditable: true,
  },
  'PULSO-SURFACE-011': {
    contract_consumed: true,
    claimed_owner: 'pos_salon',
  },
  'PULSO-SURFACE-012': {
    server_render: true,
    client_render: true,
    hydration_mismatch: false,
    interaction_ok: true,
    forms_ok: true,
    accessibility_ok: true,
    realtime_feedback_ok: true,
    loading_error_feedback_ok: true,
    deny_state_safe: true,
  },
});

const negativeSurfaceScenarios = Object.freeze({
  'PULSO-SURFACE-001': {
    session: false,
    app_access: true,
    permission: true,
    safe_return: false,
    auth_error: true,
    expired: true,
  },
  'PULSO-SURFACE-002': {
    site_id: 'SITE-OTHER',
    actor_effective: 'EMP-001',
    territory_valid: false,
    manipulated: true,
    override_authorized: false,
    shared_device: true,
    actor_signed: false,
    app_allowed: false,
  },
  'PULSO-SURFACE-003': {
    page_count: 5,
    unique_page_count: 5,
    dynamic_page_count: 1,
    handler_count: 1,
    business_route_count: 4,
    deny_route_count: 1,
    root_scanner_distinct: false,
    local_login_absent: false,
    query_params_are_not_routes: false,
    protected_direct_access: false,
  },
  'PULSO-SURFACE-004': {
    code_valid: false,
    session: true,
    permission: false,
    site_valid: false,
    client_found: false,
    server_query_only: false,
    service_role_client_exposed: true,
  },
  'PULSO-SURFACE-005': {
    redemption_id: 'RED-001',
    redemption_pending: false,
    actor_authorized: false,
    pass_owner_preserved: false,
    award_attributable: false,
    duplicate_effect: true,
    shared_device: true,
    actor_signed: false,
  },
  'PULSO-SURFACE-006': {
    order_id: 'ORDER-001',
    site_valid: false,
    lines_valid: false,
    payment_rule_valid: false,
    fulfillment_valid: false,
    transition_supported: false,
    resource_scope_valid: false,
    duplicate_effect: true,
  },
  'PULSO-SURFACE-007': {
    order_id: 'ORDER-001',
    dispatch_scope_valid: false,
    conversation_bound: false,
    message_valid: false,
    events_attributable: false,
    billing_reference_bound: false,
    resource_scope_valid: false,
  },
  'PULSO-SURFACE-008': {
    site_id: 'SITE-OTHER',
    zones_scoped: false,
    tables_scoped: false,
    sessions_scoped: false,
    calls_scoped: false,
    realtime_scoped: false,
    cleanup_registered: false,
    transition_valid: false,
  },
  'PULSO-SURFACE-009': {
    site_id: 'SITE-OTHER',
    file_valid: false,
    hash_recorded: false,
    mapping_scoped: false,
    batch_attributable: false,
    rows_attributable: false,
    warnings_reconciled: false,
    publish_separate: false,
    duplicate_effect: true,
  },
  'PULSO-SURFACE-010': {
    operation_id: 'OP-001',
    idempotency_key: '',
    atomic_or_reconciliable: false,
    duplicate_effect: true,
    retry_safe: false,
    timeout_not_assumed_failed: false,
    recovery_auditable: false,
  },
  'PULSO-SURFACE-011': {
    contract_consumed: true,
    claimed_owner: 'inventory',
  },
  'PULSO-SURFACE-012': {
    server_render: true,
    client_render: true,
    hydration_mismatch: true,
    interaction_ok: false,
    forms_ok: false,
    accessibility_ok: false,
    realtime_feedback_ok: false,
    loading_error_feedback_ok: false,
    deny_state_safe: false,
  },
});

const positiveProfiles = Object.freeze({
  '@vento/contracts': {
    types_compile: true,
    payload_shapes_checked: true,
    serialization_checked: true,
    identifier_semantics_preserved: true,
    no_global_cast_bypass: true,
  },
  '@vento/os-context': {
    session_checked: true,
    site_context_checked: true,
    actor_context_checked: true,
    permission_allow_checked: true,
    permission_deny_checked: true,
    shared_device_signature_checked: true,
    client_cannot_elevate_authority: true,
  },
  '@vento/supabase': {
    browser_client_checked: true,
    server_client_checked: true,
    permission_rpc_checked: true,
    deny_path_checked: true,
    isolated_schema_source: true,
    no_service_role_fixture: true,
    no_service_role_client_exposure: true,
    realtime_cleanup_checked: true,
    build_is_non_mutating: true,
  },
  '@vento/ui-web': {
    server_render_checked: true,
    client_render_checked: true,
    hydration_checked: true,
    forms_checked: true,
    accessibility_checked: true,
    realtime_ui_checked: true,
    deny_state_checked: true,
  },
});

for (const surface of SURFACES) {
  test(`POS ${surface.id} ${surface.name}`, () => {
    assert.equal(evaluateSurface(surface.id, positiveSurfaceScenarios[surface.id]), true);
  });
}

for (const surface of SURFACES) {
  test(`NEG ${surface.id} ${surface.name} falla cerrado`, () => {
    assert.equal(evaluateSurface(surface.id, negativeSurfaceScenarios[surface.id]), false);
  });
}

for (const packageName of CANONICAL_PACKAGES) {
  test(`PROFILE POS ${packageName}`, () => {
    assert.equal(evaluateProfile(packageName, positiveProfiles[packageName]), true);
  });
}

for (const packageName of CANONICAL_PACKAGES) {
  test(`PROFILE NEG ${packageName} no acepta cobertura incompleta`, () => {
    const incomplete = { ...positiveProfiles[packageName] };
    const firstKey = Object.keys(incomplete)[0];
    incomplete[firstKey] = false;
    assert.equal(evaluateProfile(packageName, incomplete), false);
  });
}

function validEvidence() {
  const targetPackageSet = [...CANONICAL_PACKAGES];
  const identity = sha256Identity('fixture');
  return {
    consumer_repository: CONSUMER_REPOSITORY,
    consumer_branch: 'main',
    consumer_base_commit: '1'.repeat(40),
    consumer_manifest_identity: identity,
    consumer_lockfile_identity: identity,
    test_contract_identity: identity,
    test_suite_identity: identity,
    fixture_set_identity: identity,
    route_inventory_identity: identity,
    source_contract_identity: identity,
    environment_identity: 'isolated:win32:x64:node:v24.19.0',
    runtime_identity: 'v24.19.0',
    framework_identity: 'node:test+ci010-policy-engine-v1',
    target_package_set: targetPackageSet,
    compatibility_refs: targetPackageSet.map(
      (packageName) => PULSO_RELATIONS[packageName].compatibility_ref,
    ),
    pulso_profile_set: targetPackageSet.map(
      (packageName) => PULSO_RELATIONS[packageName].profile,
    ),
    execution_identity: identity,
    started_at: '2026-08-18T00:10:00-05:00',
    completed_at: '2026-08-18T00:11:00-05:00',
    result: 'PASS',
    invalidation_reason: null,
    certification_scope: 'HARNESS_SELF_CERTIFICATION',
    consumer_conformance_claimed: false,
    safe_build_entrypoint: 'npm run build:ci010',
    implementation_boundaries: {
      package_versions_changed: false,
      supabase_mutation_performed: false,
      production_data_used: false,
      consumer_functional_debt_corrected: false,
    },
    test_summary: {
      executed: CONTRACTUAL_TEST_COUNT,
      passed: CONTRACTUAL_TEST_COUNT,
      failed: 0,
      skipped: 0,
      denied_paths: 16,
    },
  };
}

test('REG-01 evidencia válida tiene todos los campos contractuales', () => {
  const evidence = validEvidence();
  for (const field of REQUIRED_EVIDENCE_FIELDS) assert.ok(field in evidence);
  assert.deepEqual(validateEvidence(evidence), []);
});

test('REG-02 cero tests jamás se normaliza a PASS', () => {
  const evidence = validEvidence();
  evidence.test_summary.executed = 0;
  assert.ok(validateEvidence(evidence).includes('ZERO_REQUIRED_TESTS'));
});

test('REG-03 evidencia de otro consumidor jamás satisface PULSO', () => {
  const evidence = validEvidence();
  evidence.consumer_repository = 'devVentoGroup/vento-origo';
  assert.ok(validateEvidence(evidence).includes('WRONG_CONSUMER_REPOSITORY'));
});

test('REG-04 cambiar commit vuelve STALE la evidencia', () => {
  const previous = validEvidence();
  const current = { ...previous, consumer_base_commit: '2'.repeat(40) };
  assert.equal(evidenceIsStale(previous, current), true);
});

test('REG-05 cambiar target package set vuelve STALE la evidencia', () => {
  const previous = validEvidence();
  const current = {
    ...previous,
    target_package_set: ['@vento/contracts'],
    compatibility_refs: ['PKG-COMP-MX-006'],
    pulso_profile_set: ['PULSO-PROFILE-CONTRACTS'],
  };
  assert.equal(evidenceIsStale(previous, current), true);
});

test('REG-06 entorno productivo queda bloqueado', () => {
  const evidence = validEvidence();
  evidence.environment_identity = 'production:remote';
  assert.ok(validateEvidence(evidence).includes('PRODUCTION_ENVIRONMENT_FORBIDDEN'));
});

test('REG-07 secretos reales o con forma de secreto quedan bloqueados', () => {
  assert.equal(containsSensitiveData({ password: 'synthetic-fixture-password-12345678' }), true);
});

test('REG-08 conjunto multi-package conserva orden canónico y perfiles exactos', () => {
  assert.deepEqual(
    resolveTargetPackages('@vento/ui-web,@vento/contracts,@vento/supabase'),
    ['@vento/contracts', '@vento/supabase', '@vento/ui-web'],
  );
});

test('REG-09 inventario exacto acepta 6 páginas, 0 dinámicas, 0 handlers, 5 rutas de negocio y 1 deny', () => {
  const result = validateRouteInventoryEntries(EXPECTED_PAGE_FILES, EXPECTED_ROUTE_HANDLERS);
  assert.equal(result.result, 'PASS');
  assert.equal(result.actual_page_count, 6);
  assert.equal(result.unique_page_count, 6);
  assert.equal(result.actual_dynamic_page_count, 0);
  assert.equal(result.actual_handler_count, 0);
  assert.equal(result.actual_business_route_count, 5);
  assert.equal(result.actual_deny_route_count, 1);
  assert.equal(result.root_scanner_distinct, true);
  assert.equal(result.local_login_absent, true);
});

test('REG-10 inventario con drift de páginas o handlers queda bloqueado', () => {
  const pages = EXPECTED_PAGE_FILES.filter((entry) => entry !== 'src/app/page.tsx');
  pages.push('src/app/extra/page.tsx');
  const handlers = ['src/app/api/extra/route.ts'];
  const result = validateRouteInventoryEntries(pages, handlers);
  assert.equal(result.result, 'BLOCKED');
  assert.ok(result.missing_pages.includes('src/app/page.tsx'));
  assert.ok(result.unexpected_pages.includes('src/app/extra/page.tsx'));
  assert.ok(result.unexpected_handlers.includes('src/app/api/extra/route.ts'));
});